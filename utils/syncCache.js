const fs = require("fs");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "../.cache");
const SYNCED_MESSAGES_FILE = path.join(CACHE_DIR, "synced_messages.json");

// Garante que o diretório de cache existe
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`[SyncCache] Diretório de cache criado: ${CACHE_DIR}`);
  }
}

/**
 * Obtém o cache de mensagens sincronizadas
 * @returns {Object} objeto com estrutura { messageId: timestamp }
 */
function getSyncedMessagesCache() {
  ensureCacheDir();
  
  try {
    if (fs.existsSync(SYNCED_MESSAGES_FILE)) {
      const data = fs.readFileSync(SYNCED_MESSAGES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[SyncCache] Erro ao ler cache:`, err.message);
  }

  return {};
}

/**
 * Registra uma mensagem como sincronizada no cache
 * @param {string} messageId ID da mensagem WhatsApp
 * @param {string} description descrição da despesa
 * @param {number} amount valor
 * @param {string} userEmail email do usuário
 * @param {boolean} isPersonal se é pessoal
 */
function markMessageAsSynced(messageId, description, amount, userEmail, isPersonal = false) {
  ensureCacheDir();
  
  const cache = getSyncedMessagesCache();
  
  cache[messageId] = {
    timestamp: new Date().toISOString(),
    description,
    amount: Number(amount),
    userEmail,
    isPersonal,
  };

  try {
    fs.writeFileSync(SYNCED_MESSAGES_FILE, JSON.stringify(cache, null, 2));
    console.log(`[SyncCache] Mensagem marcada como sincronizada: ${messageId}`);
  } catch (err) {
    console.error(`[SyncCache] Erro ao salvar cache:`, err.message);
  }
}

/**
 * Verifica se uma mensagem já foi sincronizada
 * @param {string} messageId ID da mensagem WhatsApp
 * @returns {boolean}
 */
function isMessageAlreadySynced(messageId) {
  const cache = getSyncedMessagesCache();
  return !!cache[messageId];
}

/**
 * Limpa o cache (uso opcional para debug)
 */
function clearSyncCache() {
  ensureCacheDir();
  try {
    fs.unlinkSync(SYNCED_MESSAGES_FILE);
    console.log("[SyncCache] Cache de sincronização limpo com sucesso.");
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`[SyncCache] Erro ao limpar cache:`, err.message);
    }
  }
}

/**
 * Obtém estatísticas do cache
 */
function getCacheStats() {
  const cache = getSyncedMessagesCache();
  return {
    totalMessages: Object.keys(cache).length,
    cache: cache,
  };
}

module.exports = {
  getSyncedMessagesCache,
  markMessageAsSynced,
  isMessageAlreadySynced,
  clearSyncCache,
  getCacheStats,
};
