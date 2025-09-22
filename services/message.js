const axios = require("axios");
const { getToken } = require("./auth");
require("dotenv").config();

const API_URL = process.env.API_URL;

/**
 * Executa uma requisição com tratamento de erros padronizado
 * @param {Function} fn função async que faz a request
 * @param {string} successMsg mensagem de sucesso
 */
async function handleRequest(fn, successMsg) {
  try {
    const data = await fn();
    console.log(`✅ ${successMsg}`);
    return { success: true, data };
  } catch (err) {
    console.error("❌ Erro na requisição:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cria headers com token JWT
 */
async function authHeaders(userEmail, extraHeaders = {}) {
  const token = await getToken(userEmail);
  return { Authorization: `Bearer ${token}`, ...extraHeaders };
}

/**
 * Salva uma nova despesa
 * @param {string} description descrição da despesa
 * @param {number} amount valor
 * @param {number} categoryId id da categoria
 * @param {string} userEmail email do usuário
 * @param {boolean} [isPersonal=false] se é despesa pessoal
 */
async function salvarMensagem(description, amount, categoryId, userEmail, isPersonal = false) {
  return handleRequest(
    async () => {
      const headers = await authHeaders(userEmail);
      const payload = { description, amount, categoryId, isPersonal };
      await axios.post(`${API_URL}/api/v1/expenses`, payload, { headers });
    },
    "Registro incluído com sucesso!"
  );
}

/**
 * Lista despesas pessoais do mês atual
 * @param {string} userEmail email do usuário
 * @param {string} userName nome do usuário
 */
async function listarMensagensPessoais(userEmail, userName) {
  console.log('param 1: ', userEmail);
  
  return handleRequest(
    async () => {
      const headers = await authHeaders(userEmail, { username: userName });
      const response = await axios.get(`${API_URL}/api/v1/expenses/current-month/personal`, { headers });
      return response.data;
    },
    "Mensagens pessoais recuperadas com sucesso!"
  );
}

module.exports = { salvarMensagem, listarMensagensPessoais };
