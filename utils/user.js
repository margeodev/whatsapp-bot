require("dotenv").config();

const USER_1_PHONE = process.env.USER_1_PHONE;
const USER_1_NAME = process.env.USER_1_NAME;

const USER_2_PHONE = process.env.USER_2_PHONE;
const USER_2_NAME = process.env.USER_2_NAME;

function getUserPhone(msg) {
  let message = msg.author || msg.from;  
  let userPhone = message.substring(0, 12);

  if (userPhone === USER_1_PHONE) return USER_1_PHONE;
  if (userPhone === USER_2_PHONE) return USER_2_PHONE;

  return null;
}

function getUserName(msg) {
  let message = msg.author || msg.from;

  let userPhone = message.substring(0, 12);

  if (userPhone === USER_1_PHONE) return USER_1_NAME;
  if (userPhone === USER_2_PHONE) return USER_2_NAME;

  return null;
}

module.exports = { getUserPhone, getUserName };
