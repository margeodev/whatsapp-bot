// handlers/newExpenseHandler.js

const api = require("../services/apiService");
const { getUserEmail } = require("../utils/user");
const { getCategoryId, getCategoryName } = require("../utils/category");
const { formatNewExpenseSuccess } = require("../views/messages");
const { sendMessageSafely } = require("../utils/messageHelper");

const handle = async (message) => {
  try {
    const userEmail = getUserEmail(message);
    const chat = await message.getChat();
    const body = message.body.trim(); // Não usamos toLowerCase() aqui para manter a descrição original

    const rawTokens = body.split(/[,|-]/).map((t) => t.trim());
    let isPersonal = false;
    let description = "";
    let amount = "";

    // 1. Parseamento da Mensagem
    if (rawTokens[0]?.toLowerCase() === "pessoal") {
      isPersonal = true;
      if (rawTokens.length < 3) {
        try {
          await sendMessageSafely(chat, 
            `⚠️ Formato inválido para mensagem pessoal!\nUse: "pessoal, descrição, valor" ou "pessoal - descrição - valor"`
          );
        } catch (msgError) {
          console.error("❌ Erro ao enviar mensagem:", msgError);
        }
        return;
      }
      description = rawTokens[1];
      amount = rawTokens[2];
    } else {
      if (rawTokens.length < 2) {
        // Ignora mensagens curtas que não parecem ser um registro
        console.log("Mensagem curta ignorada, não parece ser um registro de despesa.");
        return;
      }
      description = rawTokens[0];
      amount = rawTokens[1];
    }

    // 2. Validação dos Dados
    if (!description || !amount) {
      try {
        await sendMessageSafely(chat, 
          `⚠️ Formato inválido!\nUse: "descrição, valor" ou "pessoal, descrição, valor"`
        );
      } catch (msgError) {
        console.error("❌ Erro ao enviar mensagem:", msgError);
      }
      return;
    }

    const sanitizedAmount = amount.replace(",", ".");
    if (isNaN(Number(sanitizedAmount))) {
      try {
        await sendMessageSafely(chat, 
          `⚠️ Valor inválido. Certifique-se de enviar um número.\nExemplo: "Almoço, 25.50"`
        );
      } catch (msgError) {
        console.error("❌ Erro ao enviar mensagem:", msgError);
      }
      return;
    }
    
    // 3. Processamento e Chamada da API
    const categoryId = getCategoryId(description);
    const categoryName = getCategoryName(categoryId);

    console.log(`Registrando nova despesa para ${userEmail}...`);
    const result = await api.salvarMensagem(description, sanitizedAmount, categoryId, userEmail, isPersonal);

    // 4. Envio da Resposta
    if (result?.success) {
      const reply = formatNewExpenseSuccess(description, sanitizedAmount, categoryName, isPersonal);
      try {
        await sendMessageSafely(chat, reply);
      } catch (msgError) {
        console.error("❌ Erro ao enviar confirmação:", msgError);
      }
    } else {
      try {
        await sendMessageSafely(chat, "❌ Ocorreu um erro ao incluir o registro, tente novamente.");
      } catch (msgError) {
        console.error("❌ Erro ao enviar mensagem de erro:", msgError);
      }
    }

  } catch (err) {
    console.error("❌ Erro inesperado no newExpenseHandler:", err.message);
    try {
      const chat = await message.getChat();
      await sendMessageSafely(chat, "⚠️ Erro inesperado ao processar sua mensagem.");
    } catch (msgError) {
      console.error("❌ Erro ao enviar mensagem de erro:", msgError);
    }
  }
};

module.exports = { handle };