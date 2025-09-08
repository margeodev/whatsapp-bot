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
      isPersonal
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

async function listarMensagensPessoais(phoneNumber, userName) {
  try {
    const token = await getToken(phoneNumber);
    
    const response = await axios.get(
      `${API_URL}/api/v1/entries/current-month/personal`,
      { headers: {
          Authorization: `Bearer ${token}`,
          username: userName
        } 
      }
    );

    console.log("📦 Mensagens pessoais recuperadas com sucesso!");
    return { success: true, data: response.data };

  } catch (err) {
    console.error("❌ Erro ao listar mensagens pessoais:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { salvarMensagem, listarMensagensPessoais };
