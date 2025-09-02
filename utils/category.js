const fs = require("fs");
const categories = JSON.parse(fs.readFileSync("./categories.json", "utf-8"));

function getCategoryId(term) {
  const normalize = (str) =>
    str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const tokens = normalize(term).split(/\s+/);

  let bestCategory = "11";
  let bestScore = 0;

  for (const [id, termos] of Object.entries(categories)) {
    let score = 0;
    for (const t of termos) {
      const normalizedT = normalize(t);
      for (const token of tokens) {
        if (normalizedT.includes(token) || token.includes(normalizedT)) {
          score++;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = id;
    }
  }
  return bestCategory;
}

module.exports = { getCategoryId };
