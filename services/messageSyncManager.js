const api = require("../services/apiService");
const { getCategoryId } = require("../utils/category");
const { getUserEmail } = require("../utils/user");
const { isMessageAlreadySynced, markMessageAsSynced } = require("../utils/syncCache");
require("dotenv").config();

const GROUP_NAME = process.env.GROUP_NAME;
const SYNC_LIMIT = parseInt(process.env.SYNC_LIMIT) || 50; // Configurável via .env, padrão 50

/**
 * Sincroniza mensagens não registradas na inicialização
 * 1. Busca últimas 10 mensagens do grupo (WhatsApp)
 * 2. Busca últimas 10 despesas da API
 * 3. Compara e sincroniza as que faltam
 * @param {Client} client cliente WhatsApp Web.js
 */
async function syncMessagesOnStartup(client) {
  console.log(`\n📡 Iniciando sincronização de mensagens...`);
  
  // Adiciona timeout de 30 segundos para evitar travamentos
  const syncPromise = performSync(client);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout na sincronização (30s)")), 30000)
  );

  try {
    await Promise.race([syncPromise, timeoutPromise]);
  } catch (err) {
    console.error(`❌ Erro na sincronização:`, err.message);
  }
}

/**
 * Executa a sincronização
 */
async function performSync(client) {
  try {
    // 1. Encontra o grupo configurado
    console.log(`🔍 Buscando grupo "${GROUP_NAME}"...`);
    const chats = await client.getChats();
    const targetChat = chats.find(chat => chat.isGroup && chat.name === GROUP_NAME);

    if (!targetChat) {
      console.warn(`⚠️  Grupo "${GROUP_NAME}" não encontrado. Sincronização cancelada.`);
      return;
    }

    console.log(`✅ Grupo "${GROUP_NAME}" encontrado.`);

    // 2. Obtém as últimas 10 mensagens do WhatsApp
    console.log(`📱 Buscando últimas ${SYNC_LIMIT} mensagens do WhatsApp...`);
    const whatsappMessages = await targetChat.fetchMessages({ limit: SYNC_LIMIT });
    
    if (!whatsappMessages || whatsappMessages.length === 0) {
      console.log(`📭 Nenhuma mensagem encontrada no grupo.`);
      return;
    }

    console.log(`📨 ${whatsappMessages.length} mensagens recuperadas do WhatsApp.`);

    // 3. Obtém as últimas despesas da API usando o email do bot
    // O bot faz uma única requisição com seu email e recebe todas as despesas
    // (de USER_1, USER_2, USER_3, etc)
    console.log(`🔍 Buscando últimas ${SYNC_LIMIT} despesas da API (com email do bot)...`);
    
    const botEmail = process.env.USER_3_EMAIL;
    if (!botEmail) {
      console.warn(`⚠️  USER_3_EMAIL não configurado. Sincronização cancelada.`);
      return;
    }

    let apiExpenses = [];
    try {
      const result = await api.listarUltimasDespesas(botEmail, SYNC_LIMIT);
      if (result.success && result.data && Array.isArray(result.data)) {
        apiExpenses = result.data;
        console.log(`💾 ${apiExpenses.length} despesas encontradas na API.`);
      } else {
        console.log(`⚠️  Nenhuma despesa encontrada na API ou resposta inválida.`);
      }
    } catch (err) {
      console.error(`❌ Erro ao buscar despesas da API:`, err.message);
    }

    // 4. Processa mensagens do WhatsApp
    console.log(`\n🔄 Comparando e sincronizando mensagens...`);
    console.log(`📊 Total de mensagens do WhatsApp: ${whatsappMessages.length}`);
    console.log(`📊 Total de despesas na API: ${apiExpenses.length}`);
    
    // Log do cache no início
    const { getCacheStats } = require("../utils/syncCache");
    const cacheStats = getCacheStats();
    console.log(`📋 Cache de sincronização: ${cacheStats.totalMessages} mensagens já processadas`);
    if (cacheStats.totalMessages > 0) {
      console.log(`   IDs no cache: ${Object.keys(cacheStats.cache).slice(0, 3).join(", ")}${Object.keys(cacheStats.cache).length > 3 ? "..." : ""}`);
    }
    
    // Use Sets to track unique message IDs and avoid double counting
    const syncedSet = new Set();
    const skippedSet = new Set();
    const ignoredSet = new Set();

    for (const message of whatsappMessages) {
      console.log(`\n--- Processando mensagem ---`);
      console.log(`   Body: "${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}"`);
      console.log(`   From: ${message.from}`);
      const msgKey = message.id?.id || `${message.from}_${message.t || message.timestamp || Date.now()}`;
      
      // FILTRA: Ignora apenas mensagens do bot (USER_3)
      if (message.from === `558391264053@c.us`) {
        console.log(`   ⏭️  Ignorada (bot)`);
        ignoredSet.add(msgKey);
        continue;
      }
      
      // Ignora mensagens sem conteúdo
      if (!message.body) {
        console.log(`   ⏭️  Ignorada (sem conteúdo)`);
        ignoredSet.add(msgKey);
        continue;
      }
      
      const userEmail = getUserEmail(message);
      console.log(`   Email do usuário: ${userEmail}`);
      if (!userEmail) {
        console.log(`   ❌ Usuário não reconhecido`);
        ignoredSet.add(msgKey);
        continue;
      }

      // Tenta fazer parsing da mensagem
      const parseResult = parseExpenseMessage(message.body);
      console.log(`   Parse result:`, parseResult);
      if (!parseResult) {
        console.log(`   ⏭️  Não é um formato válido de despesa`);
        ignoredSet.add(msgKey);
        continue;
      }

      const { description, amount, isPersonal } = parseResult;
      const messageId = message.id.id; // ID único do WhatsApp

      console.log(`   📌 Descrição: "${description}"`);
      console.log(`   💰 Valor: ${amount}`);
      console.log(`   👤 Tipo: ${isPersonal ? 'Pessoal' : 'Compartilhado'}`);
      console.log(`   🆔 ID Mensagem: ${messageId}`);

      // PRIMEIRA VERIFICAÇÃO: Verifica se já foi sincronizada (cache persistente)
      if (isMessageAlreadySynced(messageId)) {
        console.log(`   ⏭️  Pulando (já processada no cache)`);
        skippedSet.add(messageId);
        continue;
      }

      // SEGUNDA VERIFICAÇÃO: Verifica se já existe na API
      const alreadyInAPI = isExpenseInAPI(description, amount, userEmail, isPersonal, apiExpenses);
      console.log(`   Existe na API? ${alreadyInAPI}`);
      
      if (alreadyInAPI) {
        console.log(`   ⏭️  Já sincronizada (API)`);
        // Marca como sincronizada no cache para futuras reinicializações
        markMessageAsSynced(messageId, description, amount, userEmail, isPersonal);
        skippedSet.add(messageId);
        continue;
      }

      // Se não está em nenhum lugar, sincroniza
      console.log(`   🔄 SINCRONIZANDO...`);
      
      try {
        const categoryId = getCategoryId(description);
        console.log(`   🏷️  Categoria ID: ${categoryId}`);
        
        const result = await api.salvarMensagem(description, amount, categoryId, userEmail, isPersonal);
        console.log(`   API Response: success=${result.success}, error=${result.error}`);

        if (result.success) {
          // Marca como sincronizada no cache
          markMessageAsSynced(messageId, description, amount, userEmail, isPersonal);
          // Registra no set de sincronizados
          syncedSet.add(messageId);
          console.log(`   ✅ Sincronizado com sucesso! (ID: ${messageId})`);
          
          // Envia mensagem de confirmação no chat
          const { formatNewExpenseSuccess } = require("../views/messages");
          const categoryName = require("../utils/category").getCategoryName(categoryId);
          const confirmationMsg = formatNewExpenseSuccess(description, amount, categoryName, isPersonal);
          await targetChat.sendMessage(confirmationMsg);
          console.log(`   💬 Confirmação enviada ao chat`);
        } else {
          console.log(`   ❌ Erro ao sincronizar: ${result.error}`);
        }
      } catch (err) {
        console.error(`   ❌ Erro durante sincronização:`, err.message);
      }
    }

    const finalSynced = syncedSet.size;
    const finalSkipped = skippedSet.size;
    const finalIgnored = ignoredSet.size;

    console.log(`\n✅ Sincronização completa!`);
    console.log(`   • Sincronizadas: ${finalSynced}`);
    console.log(`   • Já existentes: ${finalSkipped}`);
    console.log(`   • Ignoradas: ${finalIgnored}\n`);

  } catch (err) {
    console.error(`❌ Erro durante sincronização de mensagens:`, err.message);
  }
}

/**
 * Verifica se uma despesa já existe na lista da API
 * @param {string} description descrição da despesa
 * @param {number} amount valor
 * @param {string} userEmail email do usuário
 * @param {boolean} isPersonal se é pessoal
 * @param {Array} apiExpenses despesas da API
 * @returns {boolean}
 */
function isExpenseInAPI(description, amount, userEmail, isPersonal, apiExpenses) {
  if (!apiExpenses || apiExpenses.length === 0) return false;

  const normalizedDesc = description.toLowerCase().trim();
  const normalizedAmount = String(amount).replace(",", ".");

  console.log(`      🔍 Comparando com ${apiExpenses.length} despesas da API...`);
  console.log(`         Procurando: "${normalizedDesc}" | ${normalizedAmount} | ${userEmail} | ${isPersonal}`);

  let found = false;
  apiExpenses.forEach((expense, index) => {
    const apiDesc = (expense.description || "").toLowerCase().trim();
    const apiAmount = String(expense.amount || expense.value || 0).replace(",", ".");
    const apiIsPersonal = expense.isPersonal || expense.personal || false;
    
    const descMatch = apiDesc === normalizedDesc;
    const amountMatch = parseFloat(apiAmount) === parseFloat(normalizedAmount);
    const personalMatch = apiIsPersonal === isPersonal;
    
    if (index < 3) { // Log apenas os 3 primeiros para não poluir
      console.log(`         [${index}] "${apiDesc}" | ${apiAmount} | ${apiIsPersonal}`);
      console.log(`             Desc: ${descMatch} | Amount: ${amountMatch} | Personal: ${personalMatch}`);
    }
    
    // IMPORTANTE: Comparação SEM email, pois a API retorna userEmail como "unknown"
    // A combinação descrição + valor + tipo (pessoal/compartilhado) é suficiente para identificar
    if (descMatch && amountMatch && personalMatch) {
      found = true;
      console.log(`      ✅ ENCONTRADO NA API!`);
    }
  });

  return found;
}

/**
 * Faz parsing de uma mensagem para extrair descrição e valor
 * @param {string} body corpo da mensagem
 * @returns {Object|null} { description, amount, isPersonal } ou null se não for válido
 */
function parseExpenseMessage(body) {
  const rawTokens = body.split(/[,|-]/).map((t) => t.trim());
  let isPersonal = false;
  let description = "";
  let amount = "";

  try {
    if (rawTokens[0]?.toLowerCase() === "pessoal") {
      isPersonal = true;
      if (rawTokens.length < 3) {
        return null;
      }
      description = rawTokens[1];
      amount = rawTokens[2];
    } else {
      if (rawTokens.length < 2) {
        return null;
      }
      description = rawTokens[0];
      amount = rawTokens[1];
    }

    if (!description || !amount) {
      return null;
    }

    const sanitizedAmount = amount.replace(",", ".");
    if (isNaN(Number(sanitizedAmount))) {
      return null;
    }

    return { description, amount: sanitizedAmount, isPersonal };
  } catch (err) {
    return null;
  }
}

module.exports = { syncMessagesOnStartup };
