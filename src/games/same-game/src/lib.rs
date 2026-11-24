use wasm_bindgen::prelude::*;

/// 盤面サイズを固定し、ブラウザー表示とRustルールの座標変換を共通化します。
pub const BOARD_WIDTH: usize = 10;
pub const BOARD_HEIGHT: usize = 10;
const BOARD_CELL_COUNT: usize = BOARD_WIDTH * BOARD_HEIGHT;
const TILE_KIND_COUNT: u8 = 5;

/// JavaScriptから盤面・得点・状態を参照できるWebAssemblyゲーム状態です。
#[wasm_bindgen]
pub struct SameGame {
    tiles: Vec<u8>,
    score: u32,
    phase: u8,
}

#[wasm_bindgen]
impl SameGame {
    /// 固定パターンの盤面を作ります。同じ入力でルールを試せるよう乱数は使いません。
    #[wasm_bindgen(constructor)]
    pub fn new() -> SameGame {
        SameGame {
            tiles: initial_tiles(),
            score: 0,
            phase: PHASE_PLAYING,
        }
    }

    /// 盤面は小さい固定長なので、画面描画用にコピーして返します。
    pub fn tiles(&self) -> Vec<u8> {
        self.tiles.clone()
    }

    pub fn score(&self) -> u32 {
        self.score
    }

    /// 0=進行中、1=全消し、2=これ以上消せるグループがない状態です。
    pub fn phase(&self) -> u8 {
        self.phase
    }

    /// 指定マスと上下左右につながる同色タイルの位置を返します。
    pub fn group_at(&self, index: usize) -> Vec<u32> {
        find_group(&self.tiles, index)
            .into_iter()
            .map(|cell_index| cell_index as u32)
            .collect()
    }

    /// 2個以上のグループだけを消し、得点と盤面を更新して消した数を返します。
    pub fn remove_at(&mut self, index: usize) -> u32 {
        if self.phase != PHASE_PLAYING {
            return 0;
        }

        let group = find_group(&self.tiles, index);
        if group.len() < 2 {
            return 0;
        }

        let removed_count = group.len() as u32;
        for cell_index in group {
            self.tiles[cell_index] = 0;
        }

        // グループサイズの二乗を加点し、除去数から画面表示と得点を導けるようにします。
        self.score = self.score.saturating_add(removed_count * removed_count);
        self.tiles = compact_tiles(&self.tiles);
        self.refresh_phase();
        removed_count
    }

    /// 盤面・得点・終了状態を同じ固定初期配置へ戻します。
    pub fn reset(&mut self) {
        self.tiles = initial_tiles();
        self.score = 0;
        self.phase = PHASE_PLAYING;
    }
}

const PHASE_PLAYING: u8 = 0;
const PHASE_CLEARED: u8 = 1;
const PHASE_STUCK: u8 = 2;

impl SameGame {
    /// Rust単体テスト用に、任意の盤面から状態を組み立てます。
    #[cfg(test)]
    fn from_tiles(tiles: Vec<u8>) -> SameGame {
        assert_eq!(tiles.len(), BOARD_CELL_COUNT);
        let mut game = SameGame {
            tiles,
            score: 0,
            phase: PHASE_PLAYING,
        };
        game.refresh_phase();
        game
    }

    /// 消せる組が残っているかを調べ、空盤面・手詰まりを区別します。
    fn refresh_phase(&mut self) {
        if self.tiles.iter().all(|tile| *tile == 0) {
            self.phase = PHASE_CLEARED;
        } else if has_removable_group(&self.tiles) {
            self.phase = PHASE_PLAYING;
        } else {
            self.phase = PHASE_STUCK;
        }
    }
}

/// 2×2の色ブロックを周期的に並べ、初期状態から複数の選択を試せるようにします。
fn initial_tiles() -> Vec<u8> {
    let mut tiles = Vec::with_capacity(BOARD_CELL_COUNT);
    for row in 0..BOARD_HEIGHT {
        for column in 0..BOARD_WIDTH {
            let block_row = row / 2;
            let block_column = column / 2;
            let tile = ((block_row * 2 + block_column) % TILE_KIND_COUNT as usize) as u8 + 1;
            tiles.push(tile);
        }
    }
    tiles
}

/// スタックと訪問済み配列で、斜めを含まない連結成分を列挙します。
fn find_group(tiles: &[u8], start: usize) -> Vec<usize> {
    if start >= tiles.len() || tiles[start] == 0 {
        return Vec::new();
    }

    let tile_kind = tiles[start];
    let mut visited = vec![false; tiles.len()];
    let mut stack = vec![start];
    let mut group = Vec::new();
    visited[start] = true;

    while let Some(index) = stack.pop() {
        group.push(index);
        let row = index / BOARD_WIDTH;
        let column = index % BOARD_WIDTH;

        // 各境界を先に確かめ、右端から次行左端への誤った回り込みを防ぎます。
        let neighbors = [
            (row > 0).then_some(index.wrapping_sub(BOARD_WIDTH)),
            (row + 1 < BOARD_HEIGHT).then_some(index + BOARD_WIDTH),
            (column > 0).then_some(index.wrapping_sub(1)),
            (column + 1 < BOARD_WIDTH).then_some(index + 1),
        ];

        for neighbor in neighbors.into_iter().flatten() {
            if !visited[neighbor] && tiles[neighbor] == tile_kind {
                // 隣を積む時点で訪問済みにし、同じセルを重複して探索しません。
                visited[neighbor] = true;
                stack.push(neighbor);
            }
        }
    }

    group.sort_unstable();
    group
}

/// 列を下へ詰め、残った列を左から順に詰めた盤面を新しく作ります。
fn compact_tiles(tiles: &[u8]) -> Vec<u8> {
    let mut nonempty_columns = Vec::with_capacity(BOARD_WIDTH);

    for column in 0..BOARD_WIDTH {
        let mut compact_column = Vec::with_capacity(BOARD_HEIGHT);
        for row in (0..BOARD_HEIGHT).rev() {
            let tile = tiles[row * BOARD_WIDTH + column];
            if tile != 0 {
                compact_column.push(tile);
            }
        }
        if !compact_column.is_empty() {
            nonempty_columns.push(compact_column);
        }
    }

    let mut compacted = vec![0; BOARD_CELL_COUNT];
    for (column, tiles_bottom_up) in nonempty_columns.iter().enumerate() {
        for (offset, tile) in tiles_bottom_up.iter().enumerate() {
            let row = BOARD_HEIGHT - 1 - offset;
            compacted[row * BOARD_WIDTH + column] = *tile;
        }
    }
    compacted
}

/// 同じタイルが隣接している組がある場合だけ true を返します。
fn has_removable_group(tiles: &[u8]) -> bool {
    let mut checked = vec![false; tiles.len()];
    for index in 0..tiles.len() {
        if tiles[index] == 0 || checked[index] {
            continue;
        }

        let group = find_group(tiles, index);
        for cell_index in &group {
            checked[*cell_index] = true;
        }
        if group.len() >= 2 {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_board() -> Vec<u8> {
        vec![0; BOARD_CELL_COUNT]
    }

    #[test]
    fn initial_board_is_fixed_size_and_uses_five_tile_kinds() {
        let first = initial_tiles();
        assert_eq!(first.len(), BOARD_CELL_COUNT);
        assert_eq!(first, initial_tiles());
        assert!((1..=TILE_KIND_COUNT).all(|kind| first.contains(&kind)));
        assert_eq!(find_group(&first, 0).len(), 4);
    }

    #[test]
    fn groups_follow_only_orthogonal_neighbors() {
        let mut tiles = empty_board();
        tiles[0] = 1;
        tiles[1] = 1;
        tiles[BOARD_WIDTH] = 1;
        tiles[BOARD_WIDTH + 1] = 2;

        assert_eq!(find_group(&tiles, 0), vec![0, 1, BOARD_WIDTH]);
        assert_eq!(find_group(&tiles, BOARD_WIDTH + 1), vec![BOARD_WIDTH + 1]);
    }

    #[test]
    fn diagonal_tiles_are_not_connected_and_rows_do_not_wrap() {
        let mut diagonal = empty_board();
        diagonal[0] = 3;
        diagonal[BOARD_WIDTH + 1] = 3;
        assert_eq!(find_group(&diagonal, 0).len(), 1);

        let mut edge = empty_board();
        edge[BOARD_WIDTH - 1] = 4;
        edge[BOARD_WIDTH] = 4;
        assert_eq!(find_group(&edge, BOARD_WIDTH - 1).len(), 1);
    }

    #[test]
    fn a_single_tile_group_cannot_be_removed() {
        let mut tiles = empty_board();
        tiles[0] = 1;
        tiles[BOARD_WIDTH + 1] = 1;
        let mut game = SameGame::from_tiles(tiles.clone());

        assert_eq!(game.phase(), PHASE_STUCK);
        assert_eq!(game.remove_at(0), 0);
        assert_eq!(game.tiles(), tiles);
        assert_eq!(game.score(), 0);
    }

    #[test]
    fn gravity_and_empty_column_compaction_preserve_tile_order() {
        let mut tiles = empty_board();
        tiles[1] = 1;
        tiles[8 * BOARD_WIDTH + 1] = 2;
        tiles[9 * BOARD_WIDTH + 3] = 3;

        let compacted = compact_tiles(&tiles);
        assert_eq!(compacted[8 * BOARD_WIDTH], 1);
        assert_eq!(compacted[9 * BOARD_WIDTH], 2);
        assert_eq!(compacted[9 * BOARD_WIDTH + 1], 3);
        assert!(compacted[2..9].iter().all(|tile| *tile == 0));
    }

    #[test]
    fn removing_a_group_scores_its_square_and_can_clear_the_board() {
        let mut tiles = empty_board();
        tiles[0] = 5;
        tiles[1] = 5;
        let mut game = SameGame::from_tiles(tiles);

        assert_eq!(game.remove_at(0), 2);
        assert_eq!(game.score(), 4);
        assert_eq!(game.phase(), PHASE_CLEARED);
        assert_eq!(game.tiles(), empty_board());
        assert_eq!(game.remove_at(0), 0);
    }

    #[test]
    fn invalid_indexes_return_no_group_and_reset_restores_the_start() {
        let mut game = SameGame::new();
        let initial = game.tiles();

        assert!(game.group_at(BOARD_CELL_COUNT).is_empty());
        assert_eq!(game.remove_at(BOARD_CELL_COUNT), 0);
        assert_eq!(game.remove_at(0), 4);
        game.reset();

        assert_eq!(game.tiles(), initial);
        assert_eq!(game.score(), 0);
        assert_eq!(game.phase(), PHASE_PLAYING);
    }
}
