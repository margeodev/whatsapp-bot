const axios = require("axios");
const { getToken } = require("./auth");
require("dotenv").config();

const API_URL = process.env.API_URL;

async function salvarMensagem(description, amount, categoryId, phoneNumber) {
  try {
    const token = await getToken(phoneNumber);

    await axios.post(
      `${API_URL}/api/v1/entries`,
      { description, amount, categoryId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Registro incluido com sucesso!');
    

  } catch (err) {
    console.error("❌ Erro ao salvar mensagem:", err.message);
  }
}

module.exports = { salvarMensagem };
