const axios = require("axios");
const { jwtDecode } = require("jwt-decode");
require("dotenv").config();
const API_URL = process.env.API_URL;
// Mapeamento dos usuários (email -> senha)
const USERS = {
  [process.env.USER_1_EMAIL]: process.env.USER_1_PASS,
  [process.env.USER_2_EMAIL]: process.env.USER_2_PASS,
};
// Cache de access e refresh tokens (por email)
const tokenCache = Object.keys(USERS).reduce((acc, email) => {
  acc[email] = { 
    accessToken: null, 
    refreshToken: null, 
    expiresAt: 0 
  };
  return acc;
}, {});
/**
 * Cria header Authorization Basic <base64(email:pass)>
 */
function buildBasicAuthHeader(email, password) {
  const credentials = `${email}:${password}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
}
/**
 * Realiza o refresh do token usando o refresh token
 */
async function refreshToken(email) {
  const userCache = tokenCache[email];
  
  if (!userCache.refreshToken) {
    throw new Error(`📛 Refresh token não disponível para: ${email}`);
  }
  try {
    console.log(`🔄 Renovando token para: ${email}`);
    
    const response = await axios.post(
      `${API_URL}/auth/refresh`,
      { refreshToken: userCache.refreshToken }
    );
    const authData = response.data;
    if (!authData.accessToken || !authData.refreshToken) {
      throw new Error("❌ Dados de autenticação inválidos no refresh");
    }
    // Decodifica expiração do novo JWT
    const decoded = jwtDecode(authData.accessToken);
    const exp = decoded.exp * 1000;
    // Atualiza cache
    userCache.accessToken = authData.accessToken;
    userCache.refreshToken = authData.refreshToken;
    userCache.expiresAt = exp;
    console.log(`✅ Token renovado para ${email}, expira em: ${new Date(exp).toLocaleString()}`);
    return authData.accessToken;
    
  } catch (err) {
    console.error(`🚨 Erro ao renovar token para ${email}:`, err.message);
    
    // Limpa cache se refresh falhou
    userCache.accessToken = null;
    userCache.refreshToken = null;
    userCache.expiresAt = 0;
    
    throw err;
  }
}
/**
 * Realiza o login completo (Basic Auth)
 */
async function performLogin(email) {
  const password = USERS[email];
  
  try {
    console.log(`🔐 Fazendo login para: ${email}`);
    
    const response = await axios.post(
      `${API_URL}/auth/login`,
      {},
      {
        headers: {
          Authorization: buildBasicAuthHeader(email, password),
        },
      }
    );
    const authData = response.data;
    if (!authData.accessToken || !authData.refreshToken) {
      throw new Error("❌ Dados de autenticação inválidos no login");
    }
    // Decodifica expiração do JWT
    const decoded = jwtDecode(authData.accessToken);
    const exp = decoded.exp * 1000;
    // Atualiza cache
    const userCache = tokenCache[email];
    userCache.accessToken = authData.accessToken;
    userCache.refreshToken = authData.refreshToken;
    userCache.expiresAt = exp;
    console.log(`✅ Login realizado para ${email}, expira em: ${new Date(exp).toLocaleString()}`);
    return authData.accessToken;
    
  } catch (err) {
    console.error(`🚨 Erro ao fazer login para ${email}:`, err.message);
    throw err;
  }
}
/**
 * Obtém um token válido para o email informado
 * Tenta usar cache -> refresh -> login completo
 */
async function getToken(email) {
  if (!USERS[email]) {
    throw new Error(`📛 Usuário não configurado: ${email}`);
  }
  const userCache = tokenCache[email];
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutos de margem
  // 1. Token em cache válido (com margem de segurança)
  if (userCache.accessToken && now < (userCache.expiresAt - bufferTime)) {
    return userCache.accessToken;
  }
  // 2. Tenta refresh se tiver refresh token
  if (userCache.refreshToken) {
    try {
      return await refreshToken(email);
    } catch (refreshErr) {
      console.log(`⚠️ Refresh falhou para ${email}, tentando login completo...`);
    }
  }
  // 3. Login completo como fallback
  return await performLogin(email);
}
/**
 * Força logout de um usuário (limpa cache)
 */
function logout(email) {
  if (tokenCache[email]) {
    tokenCache[email] = { accessToken: null, refreshToken: null, expiresAt: 0 };
    console.log(`🚪 Logout realizado para: ${email}`);
  }
}
module.exports = { getToken, logout };