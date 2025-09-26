const { Client, LocalAuth } = require("whatsapp-web.js");
require("dotenv").config();

const WWEBJS_PATH = process.env.WWEBJS_PATH || "./.wwebjs_auth";

console.log("Inicializando o cliente do WhatsApp...");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "meu-bot", dataPath: WWEBJS_PATH }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

module.exports = client;