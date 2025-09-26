const userStates = {}; // Nosso "banco de dados" em memória

/**
 * Define o estado atual de um usuário.
 * @param {string} userId - O ID do usuário (ex: email).
 * @param {string | null} state - O estado para definir (ex: 'awaitingMenuOption') ou null para limpar.
 */
const setUserState = (userId, state) => {
  if (state) {
    console.log(`[State] Mudando estado de ${userId} para: ${state}`);
    userStates[userId] = state;
  } else {
    console.log(`[State] Limpando estado de ${userId}`);
    delete userStates[userId];
  }
};

/**
 * Obtém o estado atual de um usuário.
 * @param {string} userId - O ID do usuário (ex: email).
 * @returns {string | undefined} O estado atual do usuário.
 */
const getUserState = (userId) => {
  return userStates[userId];
};

module.exports = {
  setUserState,
  getUserState,
};