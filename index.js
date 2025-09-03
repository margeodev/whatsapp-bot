// === index.js ===
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal"); // Para exibir QR Code no terminal
require("dotenv").config();

const { getCategoryId, getCategoryName } = require("./utils/category");
const { getUserPhone } = require("./utils/user");
const { getToken } = require("./services/auth");
const { salvarMensagem } = require("./services/message");

const GROUP_NAME = process.env.GROUP_NAME;

// Caminho da sessão persistente
const WWEBJS_PATH = process.env.WWEBJS_PATH || "./.wwebjs_auth";

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "meu-bot", dataPath: WWEBJS_PATH }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

// Exibe QR Code no terminal apenas se precisar autenticar
client.on("qr", (qr) => {
  console.log("📷 Escaneie este QR Code com seu WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => console.log("✅ Client ready!"));

client.on("message_create", async (message) => {
  const chat = await message.getChat();

  if (!chat.isGroup || chat.name !== GROUP_NAME) return;
  if (!message.author) return; // Ignora mensagens do próprio bot

  const messageTokens = message.body.split(/[,|-]/);
  const description = messageTokens[0]?.trim();
  let amount = messageTokens[1]?.trim();

  // Validação do formato
  if (!description || !amount) {
    await chat.sendMessage(
      `⚠️ Formato inválido! \nUse: "descrição, valor" separados por vírgula ou -\n` +
      `Padrões aceitos: \n` + 
      `Almoço, 25.50\n` +
      `Conta de energia - 25.50` 
    );
    return;
  }

  // Ajusta valores com vírgula para ponto (opcional)
  amount = amount.replace(",", ".");
  if (isNaN(Number(amount))) {
    await chat.sendMessage(
      `⚠️ Valor inválido. Certifique-se de enviar um número.\n` +
      `Exemplo: "Almoço, 25.50"`
    );
    return;
  }

  const categoryId = getCategoryId(description);
  const categoryName = getCategoryName(categoryId);
  const userPhone = getUserPhone(message);

  if (!userPhone) {
    console.log("⚠️ Usuário não reconhecido, ignorando mensagem");
    return;
  }

  try {
    await getToken(userPhone);
    const result = await salvarMensagem(description, amount, categoryId, userPhone);

    if (result?.success) {
      await chat.sendMessage(
        `✅ Registro incluído com sucesso!\n` +
        `📌 Descrição: *${description}*\n` +
        `💰 Valor: *${Number(amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n` +
        `🏷️ Categoria: *${categoryName}*`
      );
    } else {
      await chat.sendMessage("❌ Ocorreu um erro ao incluir o registro, tente novamente.");
    }
  } catch (err) {
    console.error("❌ Erro inesperado:", err.message);
    await chat.sendMessage("⚠️ Erro inesperado ao processar sua mensagem.");
  }
});

client.initialize();
