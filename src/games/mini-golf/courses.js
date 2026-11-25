export const COURSE_WIDTH = 480;
export const COURSE_HEIGHT = 300;

export const courses = [
  {
    name: "まっすぐパット",
    hint: "カップはボールの真右。強さを調整してまっすぐ狙おう。",
    start: { x: 70, y: 150 },
    cup: { x: 235, y: 150 },
    walls: [],
  },
  {
    name: "バンクショット",
    hint: "上の外周の壁に当てて、中央の壁の向こう側へ回り込もう。",
    start: { x: 95, y: 100 },
    cup: { x: 335, y: 110 },
    walls: [{ x: 200, y: 60, width: 30, height: 200 }],
  },
  {
    name: "芝の回り道",
    hint: "障害物の上下に通り道があります。何打かに分けて狙おう。",
    start: { x: 65, y: 150 },
    cup: { x: 413, y: 154 },
    walls: [
      { x: 180, y: 35, width: 48, height: 190 },
      { x: 288, y: 170, width: 48, height: 105 },
    ],
  },
];
