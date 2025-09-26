// handlers/menuHandler.js

const { setUserState } = require("../state/stateManager");
const { getUserEmail, getUserName } = require("../utils/user");
const { getCategoriesMenu, formatPersonalExpenses, formatTotalExpenses } = require("../views/messages");
const categoryService = require("../services/categoryService");
const api = require("../services/apiService");

const handle = async (message) => {
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
          await chat.sendMessage("⚠️ Desculpe, não consegui carregar as categorias. Tente novamente.");
          return;
      }
      setUserState(userEmail, "awaitingCategoryOption");
      await chat.sendMessage(getCategoriesMenu(categories));
      break;

    case "3":
      await handleShowTotalExpenses(chat, userEmail, userName);
      break;

    case "4":
      // Limpa o estado do usuário, retornando ao modo padrão
      setUserState(userEmail, null); 
      await chat.sendMessage("✅ Ok, saindo do menu. Você já pode registrar novas despesas.");
      break;

    default:
      // Resposta para opção inválida
      await chat.sendMessage("⚠️ Opção inválida. Digite um número de *1* a *4*.");
      break;
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
            await chat.sendMessage("⚠️ Não foi possível consultar as despesas pessoais. Tente novamente mais tarde.");
            return;
        }

        // A formatação da resposta agora vem do nosso "view"
        const reply = formatPersonalExpenses(result.data);
        await chat.sendMessage(reply);

        // Muda o estado do usuário para o próximo passo
        setUserState(userEmail, "awaitingPersonalAction");

    } catch (err) {
        console.error("❌ Erro em handleListPersonalExpenses:", err.message);
        await chat.sendMessage("⚠️ Erro inesperado ao consultar despesas pessoais.");
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
            await chat.sendMessage("⚠️ Não foi possível consultar o total de despesas. Tente novamente mais tarde.");
            return;
        }

        const reply = formatTotalExpenses(result.data);
        await chat.sendMessage(reply);

        // Define o próximo estado
        setUserState(userEmail, "awaitingTotalAction");

    } catch (err) {
        console.error("❌ Erro em handleShowTotalExpenses:", err.message);
        await chat.sendMessage("⚠️ Erro inesperado ao consultar o total de despesas.");
    }
}

module.exports = { handle };