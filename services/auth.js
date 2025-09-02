const axios = require("axios");
const { jwtDecode } = require("jwt-decode");
require("dotenv").config();

const USER_1_PHONE = process.env.USER_1_PHONE;
const USER_2_PHONE = process.env.USER_2_PHONE;
const API_URL = process.env.API_URL;

let tokens = {
  [USER_1_PHONE]: { token: null, expiresAt: 0 },
  [USER_2_PHONE]: { token: null, expiresAt: 0 },
};

async function getToken(phoneNumber) {
  const userCache = tokens[phoneNumber];

  if (userCache.token && Date.now() < userCache.expiresAt) {
    return userCache.token;
  }

  let password = null;
  if (phoneNumber === USER_1_PHONE) {
    password = process.env.USER_1_PASS;
  } else if (phoneNumber === USER_2_PHONE) {
    password = process.env.USER_2_PASS;
  }

  if (!password) throw new Error(`Senha não configurada para ${phoneNumber}`);

  const response = await axios.post(`${API_URL}/auth/login/robo`, null, {
    headers: { phoneNumber, password },
  });

  const token = response.data?.token;
  if (!token) throw new Error("Token não retornado pela API");

  const decoded = jwtDecode(token);
  const exp = decoded.exp * 1000;

  userCache.token = token;
  userCache.expiresAt = exp;

  console.log(`✅ Novo token gerado para ${phoneNumber}, expira em: ${new Date(exp).toLocaleString()}`);
  return token;
}

module.exports = { getToken };
