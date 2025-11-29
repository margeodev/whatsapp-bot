require("dotenv").config();

// Carrega usuários dinamicamente do .env
function loadUsers() {
  const users = {};
  let userIndex = 1;
  
  while (process.env[`USER_${userIndex}_ID`]) {
    users[userIndex] = {
      id: process.env[`USER_${userIndex}_ID`],
      name: process.env[`USER_${userIndex}_NAME`],
      email: process.env[`USER_${userIndex}_EMAIL`],
    };
    userIndex++;
  }
  
  return users;
}

const USERS = loadUsers();

function getUserEmail(msg) {
  let message = msg.author || msg.from;
  console.log('Full message.author/from:', message);
  
  // Tenta diferentes formatos de ID
  let userId = message.substring(0, 14);
  console.log('userId (primeiros 14 chars):', userId);

  // Procura nos usuários configurados
  for (const [index, user] of Object.entries(USERS)) {
    if (userId === user.id || userId.includes(user.id)) {
      console.log(`✅ Identificado como USER_${index}`);
      return user.email;
    }
  }

  // Se não encontrou, tenta com todo o ID antes do @
  const fullUserId = message.split('@')[0];
  console.log('fullUserId:', fullUserId);
  
  for (const [index, user] of Object.entries(USERS)) {
    if (fullUserId === user.id) {
      console.log(`✅ Identificado como USER_${index} (full ID)`);
      return user.email;
    }
  }

  console.log('❌ Usuário não reconhecido');
  return null;
}

function getUserName(msg) {
  let message = msg.author || msg.from;

  // Tenta diferentes formatos de ID
  let userId = message.substring(0, 14);

  // Procura nos usuários configurados
  for (const [index, user] of Object.entries(USERS)) {
    if (userId === user.id || userId.includes(user.id)) {
      return user.name;
    }
  }

  // Se não encontrou, tenta com todo o ID antes do @
  const fullUserId = message.split('@')[0];
  
  for (const [index, user] of Object.entries(USERS)) {
    if (fullUserId === user.id) {
      return user.name;
    }
  }

  return null;
}

module.exports = { getUserEmail, getUserName };
