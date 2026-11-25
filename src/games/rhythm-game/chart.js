// 120 BPM。各行は1小節で、1文字は八分音符（250ms）、. は休符です。
const bars = [
  "D.F.J.K.", "D.J.F.K.", "F.D.K.J.", "D.F.JK..",
  "K.J.F.D.", "D.F.D.J.", "F.K.J.F.", "D.F.J.KD",
  "JK..FD..", "D.F.J.K.",
];
const laneKeys = "DFJK";

export const chart = [...bars.join("")].flatMap((key, index) =>
  key === "." ? [] : [{ lane: laneKeys.indexOf(key), timeMs: 1000 + index * 250 }],
);
