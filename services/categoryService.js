const api = require("./apiService");

let cachedCategories = null;

/**
 * Obtém a lista de categorias, buscando da API na primeira vez e usando o cache nas subsequentes.
 * @param {string} userEmail - Necessário para a primeira busca autenticada.
 * @returns {Promise<Array|null>} A lista de categorias ou null em caso de erro.
 */
async function getCategories(userEmail) {
  if (cachedCategories) {
    console.log("[Cache] Retornando categorias do cache.");
    return cachedCategories;
  }

  console.log("[API] Buscando categorias da API...");
  const result = await api.listarCategorias(userEmail);
  if (result.success && result.data) {
    cachedCategories = result.data;
    return cachedCategories;
  }

  return null; // Retorna nulo se a chamada à API falhar
}

module.exports = { getCategories };