/**
 * Human-readable landmark names for tooltips and a11y labels.
 */
export const LANDMARK_LABELS: Record<string, string> = {
  pyramids: "Great Pyramids",
  petra: "Petra",
  "hagia-sophia": "Hagia Sophia",
  parthenon: "Parthenon",
  colosseum: "Colosseum",
  "eiffel-tower": "Eiffel Tower",
  "sagrada-familia": "Sagrada Família",
  windmill: "Kinderdijk Windmill",
  "brandenburg-gate": "Brandenburg Gate",
  "big-ben": "Big Ben",
  "st-basil": "St. Basil's Cathedral",
  "taj-mahal": "Taj Mahal",
  "great-wall": "Great Wall",
  torii: "Itsukushima Torii",
  borobudur: "Borobudur",
  merlion: "Merlion",
  "opera-house": "Sydney Opera House",
  "christ-redeemer": "Christ the Redeemer",
  moai: "Easter Island Moai",
  "chichen-itza": "Chichén Itzá",
  "cn-tower": "CN Tower",
  "statue-of-liberty": "Statue of Liberty",
  venice: "Rialto Bridge",
  madrid: "Royal Palace",
  vienna: "St. Stephen's",
  prague: "Old Town Tower",
  seoul: "Gyeongbokgung",
  bangkok: "Wat Arun",
  dubai: "Burj Khalifa",
  "cape-town": "Table Mountain",
};

export function landmarkLabel(key: string | undefined) {
  if (!key) return undefined;
  return LANDMARK_LABELS[key] ?? key;
}
