const axios = require("axios");
const { getToken, logout } = require("./auth");
require("dotenv").config();
const API_URL = process.env.API_URL;
/**
 * Executa uma requisição com tratamento de erros padronizado
 * Inclui retry automático em caso de 401 (token expirado)
 * @param {Function} fn função async que faz a request
 * @param {string} successMsg mensagem de sucesso
 * @param {string} userEmail email do usuário para retry
 */
async function handleRequest(fn, successMsg, userEmail = null) {
  try {
    const data = await fn();
    console.log(`✅ ${successMsg}`);
    return { success: true, data };
  } catch (err) {
    // Se recebeu 401 e tem email para retry
    if (err.response?.status === 401 && userEmail) {
      console.log(`⚠️ Token expirado para ${userEmail}, tentando renovar...`);
      
      try {
        // Força obtenção de novo token (vai tentar refresh automaticamente)
        await getToken(userEmail);
        
        // Retry da requisição original
        const retryData = await fn();
        console.log(`✅ ${successMsg} (após retry)`);
        return { success: true, data: retryData };
        
      } catch (retryErr) {
        console.error(`❌ Erro após retry para ${userEmail}:`, retryErr.message);
        
        // Se retry falhou, pode ser que refresh token também expirou
        if (retryErr.response?.status === 401) {
          logout(userEmail);
          return { success: false, error: "Sessão expirada. Reautenticação necessária." };
        }
        
        return { success: false, error: retryErr.message };
      }
    }
    
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
    "Registro incluído com sucesso!",
    userEmail
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
      const response = await axios.get(`${API_URL}/api/v1/expenses/period?isPersonal=true`, { headers });
      return response.data;
    },
    "Mensagens pessoais recuperadas com sucesso!",
    userEmail
  );
}
/**
 * Busca a lista de todas as categorias disponíveis na API.
 */
async function listarCategorias(userEmail) {
  return handleRequest(
    async () => {
      // Usamos um email de usuário apenas para obter um token válido.
      const headers = await authHeaders(userEmail);
      const response = await axios.get(`${API_URL}/api/v1/categories`, { headers });
      return response.data;
    },
    "Categorias recuperadas com sucesso!",
    userEmail
  );
}
/**
 * Lista os totais de despesas agrupados por categoria para o mês atual
 * @param {string} userEmail email do usuário
 * @param {string} userName nome do usuário
 */
async function listarTotaisPorCategoria(userEmail, userName) {
  console.log('Buscando totais por categoria para:', userEmail);
  return handleRequest(
    async () => {
      const headers = await authHeaders(userEmail, { username: userName });
      // 👇 URL AJUSTADA CONFORME A SUA API
      const response = await axios.get(`${API_URL}/api/v1/reports?monthsBack=0`, { headers });
      return response.data;
    },
    "Totais por categoria recuperados com sucesso!",
    userEmail
  );
}
/**
 * Busca as últimas N despesas registradas na API
 * @param {string} userEmail email do usuário
 * @param {number} limit quantidade de despesas a buscar
 */
async function listarUltimasDespesas(userEmail, limit = 10) {
  console.log(`[API] Buscando ${limit} últimas despesas para ${userEmail}...`);
  return handleRequest(
    async () => {
      const headers = await authHeaders(userEmail);
      console.log(`[API] Fazendo GET ${API_URL}/api/v1/expenses/${limit}`);
      const response = await axios.get(`${API_URL}/api/v1/expenses/${limit}`, { headers });
      console.log(`[API] Resposta recebida: ${response.data?.length || 0} despesas`);
      return response.data;
    },
    `${limit} últimas despesas recuperadas com sucesso!`,
    userEmail
  );
}
module.exports = { salvarMensagem, listarMensagensPessoais, listarTotaisPorCategoria, listarCategorias, listarUltimasDespesas };