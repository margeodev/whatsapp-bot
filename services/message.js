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

    console.log("✅ Registro incluído com sucesso!");
    return { success: true }; // 🔑 devolve sucesso

  } catch (err) {
    console.error("❌ Erro ao salvar mensagem:", err.message);
    return { success: false, error: err.message }; // 🔑 devolve erro
  }
}

module.exports = { salvarMensagem };
