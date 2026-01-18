const { setUserState } = require("../state/stateManager");
const { getUserEmail } = require("../utils/user");
const { getMainMenu } = require("../views/messages");
const { sendMessageSafely } = require("../utils/messageHelper");

const handle = async (message) => {
  try {
    const userEmail = getUserEmail(message);
    const chat = await message.getChat();
    const body = message.body.trim().toLowerCase();

    if (body === "1") {
      setUserState(userEmail, "awaitingMenuOption");
      try {
        await sendMessageSafely(chat, getMainMenu());
      } catch (msgError) {
        console.error("❌ Erro ao enviar menu principal:", msgError);
      }
    } else {
      try {
        await sendMessageSafely(chat, "⚠️ Opção inválida. Digite *1* para voltar ao menu principal.");
      } catch (msgError) {
        console.error("❌ Erro ao enviar mensagem:", msgError);
      }
    }
  } catch (error) {
    console.error("❌ Erro no totalHandler:", error);
  }
};

module.exports = { handle };