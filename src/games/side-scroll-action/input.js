/** キーや指ごとに押下を追跡し、一方を離してもほかの入力を保ちます。 */
export function createInput(onJump) {
  const pressed = new Map();
  const has = (action) => [...pressed.values()].includes(action);

  return {
    press(id, action) {
      if (pressed.has(id)) return;
      const startsJump = action === "jump" && !has("jump");
      pressed.set(id, action);
      if (startsJump) onJump();
    },
    release(id) {
      pressed.delete(id);
    },
    clear() {
      pressed.clear();
    },
    direction() {
      return Number(has("right")) - Number(has("left"));
    },
  };
}
