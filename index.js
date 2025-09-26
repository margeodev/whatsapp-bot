// index.js

const qrcode = require("qrcode-terminal");
const client = require("./client");
const { handleMessage } = require("./messageRouter");

console.log("Iniciando aplicação...");

// Evento para gerar o QR Code
client.on("qr", (qr) => {
  console.log("📷 Escaneie este QR Code com seu WhatsApp:");
  qrcode.generate(qr, { small: true });
});

// Evento de cliente pronto
client.on("ready", () => {
  console.log("✅ Cliente do WhatsApp está pronto!");
});

// Evento de erro de autenticação
client.on('auth_failure', msg => {
    console.error('❌ Falha na autenticação!', msg);
});

// Anexa o nosso roteador de mensagens ao evento 'message_create'
client.on("message_create", handleMessage);

// Inicia o cliente
client.initialize().catch(err => {
    console.error("❌ Erro ao inicializar o cliente:", err);
});