const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
require("dotenv").config();

const { getCategoryId, getCategoryName } = require("./utils/category");
const { getUserPhone, getUserName } = require("./utils/user");
const { getToken } = require("./services/auth");
const { salvarMensagem, listarMensagensPessoais } = require("./services/message");

const GROUP_NAME = process.env.GROUP_NAME;
const WWEBJS_PATH = process.env.WWEBJS_PATH || "./.wwebjs_auth";

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "meu-bot", dataPath: WWEBJS_PATH }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

client.on("qr", (qr) => {
  console.log("📷 Escaneie este QR Code com seu WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => console.log("✅ Client ready!"));

client.on("message_create", async (message) => {
  const chat = await message.getChat();

  if (!chat.isGroup || chat.name !== GROUP_NAME) return;
  if (!message.author) return;

  const rawTokens = message.body.split(/[,|-]/).map(t => t.trim());
  const userPhone = getUserPhone(message);
  const userName = getUserName(message);

  if (!userPhone) {
    console.log("⚠️ Usuário não reconhecido, ignorando mensagem");
    return;
  }

  // 📋 Verifica se é uma solicitação de listagem de despesas pessoais
  const isListRequest = rawTokens.length === 2 &&
    rawTokens[0]?.toLowerCase() === "pessoal" &&
    rawTokens[1]?.toLowerCase() === "list";

  if (isListRequest) {
    try {
      const result = await listarMensagensPessoais(userPhone, userName);

      if (!result.success) {
        await chat.sendMessage("⚠️ Não foi possível consultar as despesas pessoais. Tente novamente mais tarde.");
        return;
      }

      const entries = result.data;

      if (!entries.length) {
        await chat.sendMessage("📭 Nenhuma despesa pessoal registrada neste mês.");
        return;
      }

      let reply = `📋 *Despesas pessoais do mês:*\n\n`;
      entries.forEach((entry, index) => {
        reply += `${index + 1}. *${entry.description}* - ${Number(entry.amount).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })}\n`;
      });

      await chat.sendMessage(reply);
    } catch (err) {
      console.error("❌ Erro ao consultar despesas pessoais:", err.message);
      await chat.sendMessage("⚠️ Erro inesperado ao consultar despesas pessoais.");
    }

    return;
  }

  // 🧾 Processamento de mensagem de registro
  let isPersonal = false;
  let description = "";
  let amount = "";

  if (rawTokens[0]?.toLowerCase() === "pessoal") {
    isPersonal = true;

    if (rawTokens.length < 3) {
      await chat.sendMessage(
        `⚠️ Formato inválido para mensagem pessoal!\nUse: "pessoal, descrição, valor" ou "pessoal - descrição - valor"\n` +
        `Exemplos:\n` +
        `pessoal, almoço, 25.50\n` +
        `pessoal - conta de energia - 25.50`
      );
      return;
    }

    description = rawTokens[1];
    amount = rawTokens[2];
  } else {
    description = rawTokens[0];
    amount = rawTokens[1];
  }

  if (!description || !amount || typeof amount !== "string") {
    await chat.sendMessage(
      `⚠️ Formato inválido!\nUse: "descrição, valor" ou "pessoal, descrição, valor"\n` +
      `Exemplos:\n` +
      `Almoço, 25.50\n` +
      `pessoal - mercado - 89.90`
    );
    return;
  }

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

  try {
    await getToken(userPhone);
    const result = await salvarMensagem(description, amount, categoryId, userPhone, isPersonal);

    if (result?.success) {
      await chat.sendMessage(
        `✅ Registro incluído com sucesso!\n` +
        `📌 Descrição: *${description}*\n` +
        `💰 Valor: *${Number(amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n` +
        `🏷️ Categoria: *${categoryName}*` +
        (isPersonal ? `\n👤 Tipo: *Pessoal*` : "")
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
