const axios = require("axios");
const { getToken } = require("./auth");
require("dotenv").config();

const API_URL = process.env.API_URL;

async function salvarMensagem(description, amount, categoryId, phoneNumber, isPersonal = false) {
  try {
    const token = await getToken(phoneNumber);

    const payload = {
      description,
      amount,
      categoryId,
      isPersonal // será enviado como false por padrão, ou true se for pessoal
    };

    await axios.post(
      `${API_URL}/api/v1/entries`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("✅ Registro incluído com sucesso!");
    return { success: true };

  } catch (err) {
    console.error("❌ Erro ao salvar mensagem:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { salvarMensagem };
