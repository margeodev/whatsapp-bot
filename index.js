// === index.js ===
const { Client, LocalAuth } = require("whatsapp-web.js");
require("dotenv").config();

const { getCategoryId, getCategoryName } = require("./utils/category");
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

  // Só processa mensagens do grupo configurado
  if (!chat.isGroup || chat.name !== GROUP_NAME) return;

  // Mensagem do bot → não processar (elas não têm "author")
  if (!message.author) return;

  const messageTokens = message.body.split(/[,|-]/);
  const description = messageTokens[0];
  const amount = messageTokens[1];
  const categoryId = getCategoryId(description);
  const categoryName = getCategoryName(categoryId);
  const userPhone = getUserPhone(message);

  if (!userPhone) {
    console.log("⚠️ Usuário não reconhecido, ignorando mensagem");
    return;
  }

  try {
    // Garante que o token esteja válido
    await getToken(userPhone);

    // Tenta salvar no backend
    const result = await salvarMensagem(description, amount, categoryId, userPhone);
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    if (result?.success) {
      await chat.sendMessage(
        `✅ Registro incluído com sucesso!\n` +
        `📌 Descrição: *${description}*\n` +
        `💰 Valor: *${formattedAmount}*\n` +
        `🏷️ Categoria: *${categoryName}*`
      );
    } else {
      await chat.sendMessage("❌ Ocorreu um erro ao incluir o registro, tente novamente mais tarde.");
    }
  } catch (err) {
    console.error("❌ Erro inesperado:", err.message);
    await chat.sendMessage("⚠️ Erro inesperado ao processar sua mensagem.");
  }
});

client.initialize();
