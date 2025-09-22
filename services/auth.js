const axios = require("axios");
const { jwtDecode } = require("jwt-decode");
require("dotenv").config();

const API_URL = process.env.API_URL;

// Mapeamento dos usuários (email -> senha)
const USERS = {
  [process.env.USER_1_EMAIL]: process.env.USER_1_PASS,
  [process.env.USER_2_EMAIL]: process.env.USER_2_PASS,
};

// Cache de tokens (por email)
const tokenCache = Object.keys(USERS).reduce((acc, email) => {
  acc[email] = { token: null, expiresAt: 0 };
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
 * Obtém um token válido para o email informado
 */
async function getToken(email) {
  if (!USERS[email]) {
    throw new Error(`📛 Usuário não configurado: ${email}`);
  }

  const userCache = tokenCache[email];
  const now = Date.now();

  // Token em cache válido
  if (userCache.token && now < userCache.expiresAt) {
    return userCache.token;
  }

  const password = USERS[email];
  try {
    const response = await axios.post(
      `${API_URL}/auth/login`,
      null,
      {
        headers: {
          Authorization: buildBasicAuthHeader(email, password),
        },
      }
    );

    const token = response.data;
    if (!token) throw new Error("❌ Token não retornado pela API");

    // Decodifica expiração do JWT
    const decoded = jwtDecode(token);
    const exp = decoded.exp * 1000;

    userCache.token = token;
    userCache.expiresAt = exp;

    console.log(`✅ Novo token para ${email}, expira em: ${new Date(exp).toLocaleString()}`);
    return token;
  } catch (err) {
    console.error(`🚨 Erro ao gerar token para ${email}:`, err.message);
    throw err;
  }
}

module.exports = { getToken };
