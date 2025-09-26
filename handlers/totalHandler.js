const { setUserState } = require("../state/stateManager");
const { getUserEmail } = require("../utils/user");
const { getMainMenu } = require("../views/messages");

const handle = async (message) => {
  const userEmail = getUserEmail(message);
  const chat = await message.getChat();
  const body = message.body.trim().toLowerCase();

  if (body === "1") {
    setUserState(userEmail, "awaitingMenuOption");
    await chat.sendMessage(getMainMenu());
  } else {
    await chat.sendMessage("⚠️ Opção inválida. Digite *1* para voltar ao menu principal.");
  }
};

module.exports = { handle };