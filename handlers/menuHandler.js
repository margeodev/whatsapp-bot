// handlers/menuHandler.js

const { setUserState } = require("../state/stateManager");
const { getUserEmail, getUserName } = require("../utils/user");
const { getCategoriesMenu, formatPersonalExpenses, formatTotalExpenses } = require("../views/messages");
const categoryService = require("../services/categoryService");
const api = require("../services/apiService");
const { sendMessageSafely } = require("../utils/messageHelper");

const handle = async (message) => {
  try {
    const userEmail = getUserEmail(message);
    const userName = getUserName(message);
    const chat = await message.getChat();
    const body = message.body.trim().toLowerCase();

    switch (body) {
      case "1":
        // Lógica para Listar Despesas Pessoais
        await handleListPersonalExpenses(chat, userEmail, userName);
        break;

      case "2":
        // Lógica para Listar por Categoria
        console.log("Montando menu de categorias dinâmico...");
        const categories = await categoryService.getCategories(userEmail);
        if (!categories) {
            await sendMessageSafely(chat, "⚠️ Desculpe, não consegui carregar as categorias. Tente novamente.");
            return;
        }
        setUserState(userEmail, "awaitingCategoryOption");
        await sendMessageSafely(chat, getCategoriesMenu(categories));
        break;

      case "3":
        await handleShowTotalExpenses(chat, userEmail, userName);
        break;

      case "4":
        // Limpa o estado do usuário, retornando ao modo padrão
        setUserState(userEmail, null); 
        await sendMessageSafely(chat, "✅ Ok, saindo do menu. Você já pode registrar novas despesas.");
        break;

      default:
        // Resposta para opção inválida
        await sendMessageSafely(chat, "⚠️ Opção inválida. Digite um número de *1* a *4*.");
        break;
    }
  } catch (error) {
    console.error("❌ Erro no menuHandler:", error);
    try {
      const chat = await message.getChat();
      await chat.sendMessage("⚠️ Erro ao processar sua opção. Tente novamente.");
    } catch (msgError) {
      console.error("❌ Erro ao enviar mensagem de erro:", msgError);
    }
  }
};

/**
 * Sub-função para lidar com a listagem de despesas pessoais
 */
const handleListPersonalExpenses = async (chat, userEmail, userName) => {
    try {
        console.log(`Buscando despesas pessoais para ${userEmail}...`);
        const result = await api.listarMensagensPessoais(userEmail, userName);

        if (!result.success) {
            try {
                await chat.sendMessage("⚠️ Não foi possível consultar as despesas pessoais. Tente novamente mais tarde.");
            } catch (msgError) {
                console.error("❌ Erro ao enviar mensagem de erro:", msgError);
            }
            return;
        }

        // A formatação da resposta agora vem do nosso "view"
        const reply = formatPersonalExpenses(result.data);
        try {
            await chat.sendMessage(reply);
        } catch (msgError) {
            console.error("❌ Erro ao enviar despesas pessoais:", msgError);
        }

        // Muda o estado do usuário para o próximo passo
        setUserState(userEmail, "awaitingPersonalAction");

    } catch (err) {
        console.error("❌ Erro em handleListPersonalExpenses:", err.message);
        try {
            await chat.sendMessage("⚠️ Erro inesperado ao consultar despesas pessoais.");
        } catch (msgError) {
            console.error("❌ Erro ao enviar mensagem de erro:", msgError);
        }
    }
}

/**
 * Sub-função para lidar com a exibição do total de despesas
 */
const handleShowTotalExpenses = async (chat, userEmail, userName) => {
    try {
        console.log(`Buscando totais de despesas para ${userEmail}...`);
        const result = await api.listarTotaisPorCategoria(userEmail, userName);

        if (!result.success) {
            try {
                await chat.sendMessage("⚠️ Não foi possível consultar o total de despesas. Tente novamente mais tarde.");
            } catch (msgError) {
                console.error("❌ Erro ao enviar mensagem de erro:", msgError);
            }
            return;
        }

        const reply = formatTotalExpenses(result.data);
        try {
            await chat.sendMessage(reply);
        } catch (msgError) {
            console.error("❌ Erro ao enviar total de despesas:", msgError);
        }

        // Define o próximo estado
        setUserState(userEmail, "awaitingTotalAction");

    } catch (err) {
        console.error("❌ Erro em handleShowTotalExpenses:", err.message);
        try {
            await chat.sendMessage("⚠️ Erro inesperado ao consultar o total de despesas.");
        } catch (msgError) {
            console.error("❌ Erro ao enviar mensagem de erro:", msgError);
        }
    }
}

module.exports = { handle };