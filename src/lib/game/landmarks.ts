import type { PixelSprite } from "@/lib/game/pixel-sprite";

/**
 * Pixel landmark art, one per country tile, on a 12x12 grid. Palette keys are
 * local to each sprite so colours stay true to the real landmark.
 */

const STONE = "#ded7c6";
const STONE_MID = "#a89f8c";
const STONE_DARK = "#6f6857";
const IRON = "#8a8f9e";
const IRON_DARK = "#5a6070";
const GOLD = "#f5c451";
const SAND = "#e0b862";
const SAND_DARK = "#b98d3c";
const RED = "#d9544d";
const GREEN = "#5ddc82";
const BLUE = "#5aa9e6";
const WHITE = "#f2f4fb";
const TEAL = "#3fd6c1";
const BROWN = "#8c6239";
const JADE = "#2f9e79";

export const LANDMARKS: Record<string, PixelSprite> = {
  pyramids: {
    palette: { s: SAND, d: SAND_DARK, k: "#4a3a1f" },
    rows: [
      "............",
      "............",
      ".....ss.....",
      "....ssdd....",
      "...sssddd...",
      "..ssssdddd..",
      ".sssssddddd.",
      "sssssskddddd",
      "....ss..dd..",
      "...ssss.ddd.",
      "..ssssssdddd",
      "kkkkkkkkkkkk",
    ],
  },

  petra: {
    palette: { s: SAND, d: SAND_DARK, k: "#3b2a14" },
    rows: [
      "............",
      "..ssssssss..",
      "..sddddddss.",
      "..ss.ss.sss.",
      "..sssssssss.",
      ".ssssssssss.",
      ".ss.kkkk.ss.",
      ".ss.kkkk.ss.",
      ".ss.kkkk.ss.",
      ".ss.kkkk.ss.",
      ".ssskkkksss.",
      "kkkkkkkkkkkk",
    ],
  },

  "hagia-sophia": {
    palette: { s: STONE, d: STONE_MID, g: GOLD, k: STONE_DARK },
    rows: [
      "............",
      "......g.....",
      "....ssss....",
      "...ssssss...",
      "..dssssssd..",
      "..dddddddd..",
      ".s.dddddd.s.",
      ".s.dddddd.s.",
      ".s.dkkkkd.s.",
      ".s.dkkkkd.s.",
      ".sssdkkkdsss",
      "kkkkkkkkkkkk",
    ],
  },

  parthenon: {
    palette: { s: STONE, d: STONE_MID, k: STONE_DARK },
    rows: [
      "............",
      "............",
      "....ssss....",
      "...ssssss...",
      "..ssssssss..",
      ".dddddddddd.",
      ".s.s.s.s.s..",
      ".s.s.s.s.s..",
      ".s.s.s.s.s..",
      ".s.s.s.s.s..",
      ".dddddddddd.",
      "kkkkkkkkkkkk",
    ],
  },

  colosseum: {
    palette: { s: STONE, d: STONE_MID, k: STONE_DARK },
    rows: [
      "............",
      "...ssssss...",
      "..ssssssss..",
      ".s.d.d.d.ds.",
      ".ssssssssss.",
      ".s.d.d.d.ds.",
      ".ssssssssss.",
      ".s.d.d.d.ds.",
      ".ssssssssss.",
      ".sd.d.d.d.s.",
      ".ssssssssss.",
      "kkkkkkkkkkkk",
    ],
  },

  "eiffel-tower": {
    palette: { i: IRON, d: IRON_DARK, k: "#2e3a5c" },
    rows: [
      ".....ii.....",
      ".....ii.....",
      "....i..i....",
      "....i..i....",
      "...ii..ii...",
      "...i....i...",
      "..iiiiiiii..",
      "..i......i..",
      ".ii......ii.",
      ".i........i.",
      "ii........ii",
      "kkkkkkkkkkkk",
    ],
  },

  "sagrada-familia": {
    palette: { s: STONE, d: STONE_MID, g: GOLD, k: STONE_DARK },
    rows: [
      "..g..g..g...",
      "..s..s..s...",
      "..s.ss.ss...",
      ".ss.ss.ss.g.",
      ".ss.ss.ss.s.",
      ".ssdssdss.s.",
      ".ssdssdssss.",
      ".ssdssdssss.",
      ".ssdssdssss.",
      ".ssdkkdssss.",
      ".ssskkssssss",
      "kkkkkkkkkkkk",
    ],
  },

  windmill: {
    palette: { b: BROWN, w: WHITE, d: "#5a4226", g: GREEN, k: "#3b2a14" },
    rows: [
      ".w........w.",
      "..w......w..",
      "...w....w...",
      "....w..w....",
      ".....ww.....",
      "....bbbb....",
      "...bbddbb...",
      "...bbbbbb...",
      "..bbbbbbbb..",
      "..bbbddbbb..",
      ".bbbbddbbbb.",
      "gggggggggggg",
    ],
  },

  "brandenburg-gate": {
    palette: { s: STONE, d: STONE_MID, g: GOLD, k: STONE_DARK },
    rows: [
      "............",
      "....gg.g....",
      "...ssssss...",
      ".dddddddddd.",
      ".dddddddddd.",
      ".s.s.ss.s.s.",
      ".s.s.ss.s.s.",
      ".s.s.ss.s.s.",
      ".s.s.ss.s.s.",
      ".s.s.ss.s.s.",
      ".dddddddddd.",
      "kkkkkkkkkkkk",
    ],
  },

  "big-ben": {
    palette: { s: STONE, d: STONE_MID, w: WHITE, x: "#3b3527", g: GOLD },
    rows: [
      ".....gg.....",
      "....ssss....",
      "....s..s....",
      "...ssssss...",
      "...swwwws...",
      "...swxxws...",
      "...swwwws...",
      "...ssssss...",
      "....ssss....",
      "....sddss...",
      "...ssddsss..",
      "xxxxxxxxxxxx",
    ],
  },

  "st-basil": {
    palette: { r: RED, b: BLUE, g: GOLD, w: WHITE, k: "#2e3a5c" },
    rows: [
      ".....g......",
      "..g..r..g...",
      "..b.rrr.b...",
      ".ggbbrrrbbg.",
      ".wwbbwwwbbw.",
      ".wwwwwwwwww.",
      ".wrwwrrwwrw.",
      ".wwwwwwwwww.",
      ".wrwwrrwwrw.",
      ".wwwkkkkwww.",
      ".wwwkkkkwww.",
      "kkkkkkkkkkkk",
    ],
  },

  "taj-mahal": {
    palette: { w: WHITE, d: STONE_MID, g: GOLD, k: STONE_DARK },
    rows: [
      "............",
      ".g...g...g..",
      ".w..www..w..",
      ".w.wwwww.w..",
      ".w.wwwww.w..",
      ".w.wwwww.w..",
      ".wwwwwwwww..",
      ".wwdwwwdww..",
      ".wwdwwwdww..",
      ".wwdkkkdww..",
      "wwwwkkkwwww.",
      "kkkkkkkkkkkk",
    ],
  },

  "great-wall": {
    palette: { s: STONE_MID, d: STONE_DARK, g: "#4a6b3a", k: "#2e3a2c" },
    rows: [
      "............",
      "......s.s.s.",
      "...s.sssssss",
      "..sssssddddd",
      ".s.s.sddddd.",
      ".sssssddddd.",
      "ssssddddd...",
      "ssddddd.....",
      "ddddd.......",
      "gggggggggggg",
      "gggggggggggg",
      "kkkkkkkkkkkk",
    ],
  },

  torii: {
    palette: { r: RED, d: "#8c2b26", k: "#2e3a5c", w: WHITE },
    rows: [
      "............",
      ".rrrrrrrrrr.",
      ".dddddddddd.",
      "...r....r...",
      ".rrrrrrrrrr.",
      ".dddddddddd.",
      "...r....r...",
      "...r....r...",
      "...r....r...",
      "...r....r...",
      "..dd....dd..",
      "kkkkkkkkkkkk",
    ],
  },

  borobudur: {
    palette: { s: STONE_MID, d: STONE_DARK, g: GOLD, k: "#3b3527" },
    rows: [
      "............",
      "......g.....",
      ".....sss....",
      "....sdsds...",
      "...ssssssss.",
      "..sd.sd.sd..",
      "..ssssssss..",
      ".sd.sd.sd.s.",
      ".ssssssssss.",
      "sd.sd.sd.sds",
      "ssssssssssss",
      "kkkkkkkkkkkk",
    ],
  },

  merlion: {
    palette: { w: WHITE, d: STONE_MID, b: BLUE, k: "#2e3a5c" },
    rows: [
      "............",
      "...www......",
      "..wwwww.....",
      "..wwdww.....",
      "...wwww.....",
      "....wwww....",
      "....wwwww...",
      "...wwwwwww..",
      "...wwwddww..",
      "..wwwwwwww..",
      ".bbbbbbbbbb.",
      "kkkkkkkkkkkk",
    ],
  },

  "opera-house": {
    palette: { w: WHITE, d: STONE_MID, b: BLUE, k: "#2e3a5c" },
    rows: [
      "............",
      "........w...",
      ".....w..ww..",
      "....ww.www..",
      "...www.wwww.",
      "..wwww.wwww.",
      ".wwwwwwwwww.",
      "wwwwdwwwwddw",
      "dddddddddddd",
      ".bbbbbbbbbb.",
      ".bbbbbbbbbb.",
      "kkkkkkkkkkkk",
    ],
  },

  "christ-redeemer": {
    palette: { s: STONE, d: STONE_MID, g: JADE, k: "#2e3a2c" },
    rows: [
      ".....ss.....",
      ".....ss.....",
      "ssssssssssss",
      ".....ss.....",
      "....ssss....",
      "....ssss....",
      "....ssss....",
      "....dddd....",
      "...dddddd...",
      "..gggggggg..",
      ".gggggggggg.",
      "kkkkkkkkkkkk",
    ],
  },

  moai: {
    palette: { s: STONE_MID, d: STONE_DARK, g: "#4a6b3a", k: "#2e3a2c" },
    rows: [
      "............",
      "...ssssss...",
      "..dssssssd..",
      "..dssssssd..",
      "..dsddddsd..",
      "..dssssssd..",
      "..dsdddssd..",
      "..dssssssd..",
      ".ddssssssdd.",
      ".ddssssssdd.",
      "gggggggggggg",
      "kkkkkkkkkkkk",
    ],
  },

  "chichen-itza": {
    palette: { s: STONE, d: STONE_MID, k: STONE_DARK, g: "#4a6b3a" },
    rows: [
      "............",
      ".....dd.....",
      "....ssss....",
      "....sddk....",
      "...ssssdk...",
      "...sddddk...",
      "..sssssddk..",
      "..sdddddddk.",
      ".ssssssdddd.",
      ".sdddddddddk",
      "ssssssdddddd",
      "gggggggggggg",
    ],
  },

  "cn-tower": {
    palette: { s: STONE_MID, d: IRON_DARK, w: WHITE, r: RED, k: "#2e3a5c" },
    rows: [
      ".....w......",
      ".....s......",
      ".....s......",
      "....sss.....",
      "...wwwww....",
      "...wdddw....",
      "...wwwww....",
      "....sss.....",
      "....s.s.....",
      "....s.s.....",
      "...rrrrr....",
      "kkkkkkkkkkkk",
    ],
  },

  "statue-of-liberty": {
    palette: { g: TEAL, d: JADE, s: STONE_MID, y: GOLD, k: STONE_DARK },
    rows: [
      "......y.....",
      "....g.g.....",
      "....ggg.....",
      "...g.g......",
      "....ggg.....",
      "....dgd.....",
      "...ggggg....",
      "...gdgdg....",
      "..ggggggg...",
      "..sssssss...",
      ".sssssssss..",
      "kkkkkkkkkkkk",
    ],
  },

  venice: {
    palette: { s: STONE, d: STONE_MID, b: BLUE, k: STONE_DARK },
    rows: [
      "............",
      "....ssss....",
      "...s.ss.s...",
      "...ssssss...",
      "...s.kk.s...",
      "...sskkss...",
      "....ssss....",
      "..bbbbbbbb..",
      ".bbbbbbbbbb.",
      "bbbbbbbbbbbb",
      "..b..b..b...",
      "kkkkkkkkkkkk",
    ],
  },

  madrid: {
    palette: { s: STONE, d: STONE_MID, g: GOLD, k: STONE_DARK },
    rows: [
      "............",
      "..g......g..",
      "..ss....ss..",
      ".ssssssssss.",
      ".ss.ssss.ss.",
      ".sssskkssss.",
      ".ss.skks.ss.",
      ".sssskkssss.",
      ".ssssssssss.",
      ".s.s.ss.s.s.",
      ".ssssssssss.",
      "kkkkkkkkkkkk",
    ],
  },

  vienna: {
    palette: { s: STONE, d: STONE_MID, g: GOLD, w: WHITE, k: STONE_DARK },
    rows: [
      ".....gg.....",
      "....ssss....",
      "...sswwss...",
      "...swwwws...",
      "...ssssss...",
      "....ssss....",
      "...ssssss...",
      "..ss.ss.ss..",
      "..ss.ss.ss..",
      "..ssskksss..",
      ".sssskkssss.",
      "kkkkkkkkkkkk",
    ],
  },

  prague: {
    palette: { s: STONE_MID, d: STONE_DARK, r: RED, g: GOLD, k: "#2e3a5c" },
    rows: [
      ".....gg.....",
      "....ssss....",
      "....srrs....",
      "...ssssss...",
      "...s.ss.s...",
      "...ssssss...",
      "....ssss....",
      "...s.ss.s...",
      "...sskkss...",
      "..ssskksss..",
      ".sssskkssss.",
      "kkkkkkkkkkkk",
    ],
  },

  seoul: {
    palette: { r: RED, d: "#8c2b26", g: GOLD, s: STONE, k: "#2e3a5c" },
    rows: [
      "............",
      ".....gg.....",
      "....rrrr....",
      "...rrddrr...",
      "..rrrrrrrr..",
      "...ssssss...",
      "..s.s.s.s.s.",
      "..ssssssss..",
      "...s.kk.s...",
      "...sskkss...",
      "..ssskksss..",
      "kkkkkkkkkkkk",
    ],
  },

  bangkok: {
    palette: { g: GOLD, s: STONE, d: STONE_MID, k: STONE_DARK, r: RED },
    rows: [
      ".....gg.....",
      "....g..g....",
      "....gggg....",
      "...gssssg...",
      "...ssssss...",
      "..ss.rr.ss..",
      "..ssssssss..",
      "...s.kk.s...",
      "...sskkss...",
      "..ssskksss..",
      ".sssskkssss.",
      "kkkkkkkkkkkk",
    ],
  },

  dubai: {
    palette: { s: STONE_MID, d: IRON_DARK, g: GOLD, w: WHITE, k: "#2e3a5c" },
    rows: [
      ".....ww.....",
      ".....ss.....",
      "....ssss....",
      "....sdds....",
      "...ssssss...",
      "...sddddss..",
      "..ssssssss..",
      "..ssddddss..",
      ".ssssssssss.",
      ".ss.gggg.ss.",
      "ssssggggssss",
      "kkkkkkkkkkkk",
    ],
  },

  "cape-town": {
    palette: { s: STONE, d: STONE_MID, g: "#4a6b3a", b: BLUE, k: "#2e3a2c" },
    rows: [
      "............",
      "...sssssss..",
      "..ssddddsss.",
      ".ssssssssss.",
      "..ss.ss.ss..",
      "...ssssss...",
      "....ssss....",
      "gggggggggggg",
      "gggggggggggg",
      ".bbbbbbbbbb.",
      ".bbbbbbbbbb.",
      "kkkkkkkkkkkk",
    ],
  },
};

export type LandmarkKey = keyof typeof LANDMARKS;
