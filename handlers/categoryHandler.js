const { getUserState, setUserState } = require("../state/stateManager");
const { getUserEmail, getUserName } = require("../utils/user");
const { getMainMenu, getCategoriesMenu, formatCategoryTotal } = require("../views/messages");
const api = require("../services/apiService");
const categoryService = require("../services/categoryService");
const { sendMessageSafely } = require("../utils/messageHelper");

const handle = async (message) => {
  try {
    const currentState = getUserState(getUserEmail(message));

    if (currentState === "awaitingCategoryOption") {
      await handleCategorySelection(message);
    } else if (currentState === "awaitingCategoryAction") {
      await handleAfterCategoryView(message);
    }
  } catch (error) {
    console.error("❌ Erro no categoryHandler:", error);
    try {
      const chat = await message.getChat();
      await sendMessageSafely(chat, "⚠️ Erro ao processar sua opção. Tente novamente.");
    } catch (msgError) {
      console.error("❌ Erro ao enviar mensagem de erro:", msgError);
    }
  }
};

const handleCategorySelection = async (message) => {
  try {
    const userEmail = getUserEmail(message);
    const userName = getUserName(message);
    const chat = await message.getChat();
    const body = message.body.trim().toLowerCase();

    if (body === "0") {
      setUserState(userEmail, "awaitingMenuOption");
      try {
        await sendMessageSafely(chat, getMainMenu());
      } catch (msgError) {
        console.error("❌ Erro ao enviar menu principal:", msgError);
      }
      return;
    }

    const categories = await categoryService.getCategories(userEmail);
    if (!categories) {
        try {
          await sendMessageSafely(chat, "⚠️ Desculpe, não consegui validar as categorias. Tente novamente.");
        } catch (msgError) {
          console.error("❌ Erro ao enviar mensagem:", msgError);
        }
        return;
    }

    const categoryNum = parseInt(body, 10);
    const selectedCategory = categories.find(c => c.id === categoryNum);

    if (!selectedCategory) {
      try {
        await sendMessageSafely(chat, `⚠️ Categoria inválida. Digite um número da lista ou *0* para voltar.`);
      } catch (msgError) {
        console.error("❌ Erro ao enviar mensagem:", msgError);
      }
      return;
    }

    try {
      const result = await api.listarTotaisPorCategoria(userEmail, userName);
      if (!result.success) {
        try {
          await sendMessageSafely(chat, "⚠️ Não foi possível consultar os totais. Tente novamente.");
        } catch (msgError) {
          console.error("❌ Erro ao enviar mensagem:", msgError);
        }
        return;
      }
      
      const totals = result.data;
      const categoriaSelecionadaDesc = selectedCategory.description;
      
      const item = totals.find((t) =>
        categoriaSelecionadaDesc.toLowerCase().includes(t.categoryDescription.toLowerCase())
      );

      const reply = formatCategoryTotal(item, categoriaSelecionadaDesc);
      try {
        await sendMessageSafely(chat, reply);
      } catch (msgError) {
        console.error("❌ Erro ao enviar total da categoria:", msgError);
      }
      setUserState(userEmail, "awaitingCategoryAction");
    } catch (err) {
      console.error("❌ Erro em handleCategorySelection:", err.message);
      try {
        await sendMessageSafely(chat, "⚠️ Erro inesperado ao consultar os totais.");
      } catch (msgError) {
        console.error("❌ Erro ao enviar mensagem de erro:", msgError);
      }
    }
  } catch (error) {
    console.error("❌ Erro geral em handleCategorySelection:", error);
  }
};

const handleAfterCategoryView = async (message) => {
  try {
    const userEmail = getUserEmail(message);
    const chat = await message.getChat();
    const body = message.body.trim().toLowerCase();

    switch (body) {
      case "1": // Voltar para categorias
        const categories = await categoryService.getCategories(userEmail);
        setUserState(userEmail, "awaitingCategoryOption");
        try {
          await sendMessageSafely(chat, getCategoriesMenu(categories));
        } catch (msgError) {
          console.error("❌ Erro ao enviar menu de categorias:", msgError);
        }
        break;
      case "2": // Voltar ao menu principal
        setUserState(userEmail, "awaitingMenuOption");
        try {
          await sendMessageSafely(chat, getMainMenu());
        } catch (msgError) {
          console.error("❌ Erro ao enviar menu principal:", msgError);
        }
        break;
      default:
        try {
          await sendMessageSafely(chat, "⚠️ Opção inválida. Digite *1* ou *2*.");
        } catch (msgError) {
          console.error("❌ Erro ao enviar mensagem:", msgError);
        }
        break;
    }
  } catch (error) {
    console.error("❌ Erro em handleAfterCategoryView:", error);
  }
};

module.exports = { handle };