const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
require("dotenv").config();

const { getCategoryId, getCategoryName } = require("./utils/category");
const { getUserEmail, getUserName } = require("./utils/user");
const { getToken } = require("./services/auth");
const {
  salvarMensagem,
  listarMensagensPessoais,
  listarTotaisPorCategoria,
} = require("./services/message");

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

// 🔹 Estados temporários por usuário
const userStates = {};

/**
 * Envia o menu principal
 */
async function enviarMenu(chat) {
  const menu =
    `📋 *Menu de opções*
1️⃣ - Listar despesas pessoais
2️⃣ - Listar despesas por categoria

👉 Digite o número da opção desejada.`;
  await chat.sendMessage(menu);
}

/**
 * Envia o menu de categorias
 */
async function enviarMenuCategorias(chat) {
  const categorias =
    `📊 *Categorias disponíveis*
1 - Moradia
2 - Supermercado
3 - Conta Consumo
4 - Transporte
5 - Lazer
6 - Saúde
7 - Bares e Restaurantes
8 - Manutenção Casa
9 - Padaria
10 - Farmácia
11 - Outros
12 - Pets
13 - Manutenção Carro

👉 Digite o número da categoria ou *0* para voltar ao menu principal.`;
  await chat.sendMessage(categorias);
}

client.on("message_create", async (message) => {
  const chat = await message.getChat();

  if (!chat.isGroup || chat.name !== GROUP_NAME) return;
  if (!message.author) return;

  const userEmail = getUserEmail(message);
  const userName = getUserName(message);

  if (!userEmail) {
    console.log("⚠️ Usuário não reconhecido, ignorando mensagem");
    return;
  }

  const body = message.body.trim().toLowerCase();
  const rawTokens = body.split(/[,|-]/).map((t) => t.trim());

  if (body === "menu") {
    userStates[userEmail] = "awaitingMenuOption";
    await enviarMenu(chat);
    return;
  }

  // === MENU PRINCIPAL ===
  if (userStates[userEmail] === "awaitingMenuOption") {
    if (body === "1") {
      try {
        const result = await listarMensagensPessoais(userEmail, userName);

        if (!result.success) {
          await chat.sendMessage("⚠️ Não foi possível consultar as despesas pessoais. Tente novamente mais tarde.");
          return;
        }

        const entries = result.data;
        if (!entries.length) {
          await chat.sendMessage("📭 Nenhuma despesa pessoal registrada neste mês.\n\n1️⃣ - Voltar ao menu principal");
          userStates[userEmail] = "awaitingPersonalAction";
          return;
        }

        let reply = `📋 *Despesas pessoais do mês:*\n\n`;
        let total = 0;
        entries.forEach((entry, index) => {
          const valor = Number(entry.amount);
          total += valor;
          reply += `${index + 1}. *${entry.description}* - ${valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}\n`;
        });

        reply += `\n💰 *Total:* ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n`;
        reply += `\n1️⃣ - Voltar ao menu principal`;

        await chat.sendMessage(reply);
        userStates[userEmail] = "awaitingPersonalAction";
      } catch (err) {
        console.error("❌ Erro ao consultar despesas pessoais:", err.message);
        await chat.sendMessage("⚠️ Erro inesperado ao consultar despesas pessoais.");
      }

      return;
    }
    if (body === "2") {
      userStates[userEmail] = "awaitingCategoryOption";
      await enviarMenuCategorias(chat);
      return;
    }

    await chat.sendMessage("⚠️ Opção inválida. Digite apenas *1* ou *2*.");
    return;
  }

  // === DESPESAS PESSOAIS (VOLTAR) ===
  if (userStates[userEmail] === "awaitingPersonalAction") {
    if (body === "1") {
      userStates[userEmail] = "awaitingMenuOption";
      await enviarMenu(chat);
    } else {
      await chat.sendMessage("⚠️ Opção inválida. Digite *1* para voltar ao menu principal.");
    }
    return;
  }

  // === CATEGORIAS ===
  if (userStates[userEmail] === "awaitingCategoryOption") {
    if (body === "0") {
      userStates[userEmail] = "awaitingMenuOption";
      await enviarMenu(chat);
      return;
    }

    const categoryNum = parseInt(body, 10);
    const categorias = {
      1: "Moradia",
      2: "Supermercado",
      3: "Conta Consumo",
      4: "Transporte",
      5: "Lazer",
      6: "Saúde",
      7: "Bares e Restaurantes",
      8: "Manutenção Casa",
      9: "Padaria",
      10: "Farmácia",
      11: "Outros",
      12: "Pets",
      13: "Manutenção Carro",
    };

    if (!categorias[categoryNum]) {
      await chat.sendMessage("⚠️ Categoria inválida. Digite um número entre 1 e 13 ou *0* para voltar.");
      return;
    }

    try {
      const result = await listarTotaisPorCategoria(userEmail, userName);

      if (!result.success) {
        await chat.sendMessage("⚠️ Não foi possível consultar os totais por categoria. Tente novamente mais tarde.");
        return;
      }

      const totals = result.data;
      const categoriaSelecionada = categorias[categoryNum];
      const item = totals.find((t) =>
        categoriaSelecionada.toLowerCase().includes(t.categoryDescription.toLowerCase())
      );

      if (!item) {
        await chat.sendMessage(
          `📭 Nenhuma despesa encontrada para *${categoriaSelecionada}* neste mês.\n\n` +
          `1️⃣ - Voltar para categorias\n` +
          `2️⃣ - Voltar ao menu principal`
        );
        userStates[userEmail] = "awaitingCategoryAction";
        return;
      }

      await chat.sendMessage(
        `📊 *Resumo de ${categoriaSelecionada}:*\n\n` +
        `💰 Total: *${Number(item.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n\n` +
        `1️⃣ - Voltar para categorias\n` +
        `2️⃣ - Voltar ao menu principal`
      );

      userStates[userEmail] = "awaitingCategoryAction";
    } catch (err) {
      console.error("❌ Erro ao consultar totais por categoria:", err.message);
      await chat.sendMessage("⚠️ Erro inesperado ao consultar totais por categoria.");
    }

    return;
  }

  // === AÇÕES APÓS VER CATEGORIA ===
  if (userStates[userEmail] === "awaitingCategoryAction") {
    if (body === "1") {
      userStates[userEmail] = "awaitingCategoryOption";
      await enviarMenuCategorias(chat);
    } else if (body === "2") {
      userStates[userEmail] = "awaitingMenuOption";
      await enviarMenu(chat);
    } else {
      await chat.sendMessage("⚠️ Opção inválida. Digite *1* para voltar às categorias ou *2* para o menu principal.");
    }
    return;
  }

  // === REGISTRO DE NOVA DESPESA ===
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
    await getToken(userEmail);
    const result = await salvarMensagem(description, amount, categoryId, userEmail, isPersonal);

    if (result?.success) {
      await chat.sendMessage(
        `✅ Registro incluído com sucesso!\n` +
        `📌 Descrição: *${description}*\n` +
        `💰 Valor: *${Number(amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n` +
        `🏷️ Categoria: *${categoryName}*` +
        `${isPersonal ? `\n👤 Tipo: *Pessoal*` : ""}`
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
