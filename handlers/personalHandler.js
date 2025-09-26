// handlers/personalHandler.js

const { setUserState } = require("../state/stateManager");
const { getUserEmail } = require("../utils/user");
const { getMainMenu } = require("../views/messages");

const handle = async (message) => {
  const userEmail = getUserEmail(message);
  const chat = await message.getChat();
  const body = message.body.trim().toLowerCase();

  // O usuário só tem uma opção válida nesta tela: voltar ao menu.
  if (body === "1") {
    // Muda o estado de volta para o menu principal
    setUserState(userEmail, "awaitingMenuOption");
    // Envia a mensagem do menu principal
    await chat.sendMessage(getMainMenu());
  } else {
    // Se o usuário digitar qualquer outra coisa
    await chat.sendMessage("⚠️ Opção inválida. Digite *1* para voltar ao menu principal.");
  }
};

module.exports = { handle };