require("dotenv").config();

const USER_1_ID = process.env.USER_1_ID;
const USER_1_NAME = process.env.USER_1_NAME;
const USER_1_EMAIL = process.env.USER_1_EMAIL;


const USER_2_ID = process.env.USER_2_ID;
const USER_2_NAME = process.env.USER_2_NAME;
const USER_2_EMAIL = process.env.USER_2_EMAIL;

function getUserEmail(msg) {
  let message = msg.author || msg.from;
  let userId = message.substring(0, 14);
  console.log('userId: ', userId);


  if (userId === USER_1_ID) return USER_1_EMAIL;
  if (userId === USER_2_ID) return USER_2_EMAIL;

  return null;
}

function getUserName(msg) {
  let message = msg.author || msg.from;

  let userId = message.substring(0, 14);

  if (userId === USER_1_ID) return USER_1_NAME;
  if (userId === USER_2_ID) return USER_2_NAME;

  return null;
}

module.exports = { getUserEmail, getUserName };
