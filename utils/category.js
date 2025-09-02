const fs = require("fs");

// Lê o arquivo categories.json (usado só para as palavras-chave)
const categories = JSON.parse(fs.readFileSync("./categories.json", "utf-8"));

// Mapa fixo de ID → nome da categoria
const categoryNames = {
  "1": "Moradia",
  "2": "Supermercado",
  "3": "Conta Consumo",
  "4": "Transporte",
  "5": "Lazer",
  "6": "Saúde",
  "7": "Bares e Restaurantes",
  "8": "Manutenção Casa",
  "9": "Padaria",
  "10": "Farmácia",
  "11": "Outros",
  "12": "Pets",
  "13": "Manutenção Carro"
};

function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCategoryId(term) {
  const tokens = normalize(term).split(/\s+/);

  let bestCategory = "11"; // default: Outros
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

// Retorna o nome "oficial" da categoria pelo ID
function getCategoryName(categoryId) {
  return categoryNames[categoryId] || "Outros";
}

module.exports = { getCategoryId, getCategoryName };
