// handlers/newExpenseHandler.js

const api = require("../services/apiService");
const { getUserEmail } = require("../utils/user");
const { getCategoryId, getCategoryName } = require("../utils/category");
const { formatNewExpenseSuccess } = require("../views/messages");

const handle = async (message) => {
  const userEmail = getUserEmail(message);
  const chat = await message.getChat();
  const body = message.body.trim(); // Não usamos toLowerCase() aqui para manter a descrição original

  const rawTokens = body.split(/[,|-]/).map((t) => t.trim());
  let isPersonal = false;
  let description = "";
  let amount = "";

  try {
    // 1. Parseamento da Mensagem
    if (rawTokens[0]?.toLowerCase() === "pessoal") {
      isPersonal = true;
      if (rawTokens.length < 3) {
        await chat.sendMessage(
          `⚠️ Formato inválido para mensagem pessoal!\nUse: "pessoal, descrição, valor" ou "pessoal - descrição - valor"`
        );
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
      await chat.sendMessage(
        `⚠️ Formato inválido!\nUse: "descrição, valor" ou "pessoal, descrição, valor"`
      );
      return;
    }

    const sanitizedAmount = amount.replace(",", ".");
    if (isNaN(Number(sanitizedAmount))) {
      await chat.sendMessage(
        `⚠️ Valor inválido. Certifique-se de enviar um número.\nExemplo: "Almoço, 25.50"`
      );
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
      await chat.sendMessage(reply);
    } else {
      await chat.sendMessage("❌ Ocorreu um erro ao incluir o registro, tente novamente.");
    }

  } catch (err) {
    console.error("❌ Erro inesperado no newExpenseHandler:", err.message);
    await chat.sendMessage("⚠️ Erro inesperado ao processar sua mensagem.");
  }
};

module.exports = { handle };