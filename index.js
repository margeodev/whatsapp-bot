const { Client, LocalAuth } = require("whatsapp-web.js");
require("dotenv").config();

const { getCategoryId } = require("./utils/category");
const { getUserPhone } = require("./utils/user");
const { getToken } = require("./services/auth");
const { salvarMensagem } = require("./services/message");

const GROUP_NAME = process.env.GROUP_NAME;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "meu-bot" }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

client.on("ready", () => console.log("✅ Client ready!"));

client.on("message_create", async (message) => {
  const chat = await message.getChat();

  if (chat.isGroup && chat.name === GROUP_NAME) {
    const messageTokens = message.body.split(/[,|-]/);
    const description = messageTokens[0];
    const amount = messageTokens[1];
    const categoryId = getCategoryId(description);
    const userPhone = getUserPhone(message);

    if (!userPhone) {
      console.log("⚠️ Usuário não reconhecido, ignorando mensagem");
      return;
    }

    await getToken(userPhone);
    await salvarMensagem(description, amount, categoryId, userPhone);
  }
});

client.initialize();
