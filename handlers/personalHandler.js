// handlers/personalHandler.js

const { setUserState } = require("../state/stateManager");
const { getUserEmail } = require("../utils/user");
const { getMainMenu } = require("../views/messages");
const { sendMessageSafely } = require("../utils/messageHelper");

const handle = async (message) => {
  try {
    const userEmail = getUserEmail(message);
    const chat = await message.getChat();
    const body = message.body.trim().toLowerCase();

    // O usuário só tem uma opção válida nesta tela: voltar ao menu.
    if (body === "1") {
      // Muda o estado de volta para o menu principal
      setUserState(userEmail, "awaitingMenuOption");
      // Envia a mensagem do menu principal
      try {
        await sendMessageSafely(chat, getMainMenu());
      } catch (msgError) {
        console.error("❌ Erro ao enviar menu principal:", msgError);
      }
    } else {
      // Se o usuário digitar qualquer outra coisa
      try {
        await sendMessageSafely(chat, "⚠️ Opção inválida. Digite *1* para voltar ao menu principal.");
      } catch (msgError) {
        console.error("❌ Erro ao enviar mensagem:", msgError);
      }
    }
  } catch (error) {
    console.error("❌ Erro no personalHandler:", error);
  }
};

module.exports = { handle };