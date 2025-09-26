const { getUserState, setUserState } = require("../state/stateManager");
const { getUserEmail, getUserName } = require("../utils/user");
const { getMainMenu, getCategoriesMenu, formatCategoryTotal } = require("../views/messages");
const api = require("../services/apiService");
const categoryService = require("../services/categoryService");

const handle = async (message) => {
  const currentState = getUserState(getUserEmail(message));

  if (currentState === "awaitingCategoryOption") {
    await handleCategorySelection(message);
  } else if (currentState === "awaitingCategoryAction") {
    await handleAfterCategoryView(message);
  }
};

const handleCategorySelection = async (message) => {
  const userEmail = getUserEmail(message);
  const userName = getUserName(message);
  const chat = await message.getChat();
  const body = message.body.trim().toLowerCase();

  if (body === "0") {
    setUserState(userEmail, "awaitingMenuOption");
    await chat.sendMessage(getMainMenu());
    return;
  }

  const categories = await categoryService.getCategories(userEmail);
  if (!categories) {
      await chat.sendMessage("⚠️ Desculpe, não consegui validar as categorias. Tente novamente.");
      return;
  }

  const categoryNum = parseInt(body, 10);
  const selectedCategory = categories.find(c => c.id === categoryNum);

  if (!selectedCategory) {
    await chat.sendMessage(`⚠️ Categoria inválida. Digite um número da lista ou *0* para voltar.`);
    return;
  }

  try {
    const result = await api.listarTotaisPorCategoria(userEmail, userName);
    if (!result.success) {
      await chat.sendMessage("⚠️ Não foi possível consultar os totais. Tente novamente.");
      return;
    }
    
    const totals = result.data;
    const categoriaSelecionadaDesc = selectedCategory.description;
    
    const item = totals.find((t) =>
      categoriaSelecionadaDesc.toLowerCase().includes(t.categoryDescription.toLowerCase())
    );

    const reply = formatCategoryTotal(item, categoriaSelecionadaDesc);
    await chat.sendMessage(reply);
    setUserState(userEmail, "awaitingCategoryAction");
  } catch (err) {
    console.error("❌ Erro em handleCategorySelection:", err.message);
    await chat.sendMessage("⚠️ Erro inesperado ao consultar os totais.");
  }
};

const handleAfterCategoryView = async (message) => {
  const userEmail = getUserEmail(message);
  const chat = await message.getChat();
  const body = message.body.trim().toLowerCase();

  switch (body) {
    case "1": // Voltar para categorias
      const categories = await categoryService.getCategories(userEmail);
      setUserState(userEmail, "awaitingCategoryOption");
      await chat.sendMessage(getCategoriesMenu(categories));
      break;
    case "2": // Voltar ao menu principal
      setUserState(userEmail, "awaitingMenuOption");
      await chat.sendMessage(getMainMenu());
      break;
    default:
      await chat.sendMessage("⚠️ Opção inválida. Digite *1* ou *2*.");
      break;
  }
};

module.exports = { handle };