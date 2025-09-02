const { Client, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config(); 


const GROUP_NAME = process.env.GROUP_NAME;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "meu-bot" // identificador único (pode ser qualquer string)
    }),
    puppeteer: {
        headless: true, // se quiser ver o navegador abrindo, use false
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Exibe QR code apenas na primeira vez
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

// Dispara quando a sessão for autenticada
client.on('ready', () => {
    console.log('✅ Client ready!');
});

// Captura mensagens
client.on('message_create', async message => {
    const chat = await message.getChat();

    if (chat.isGroup && chat.name === GROUP_NAME) {
        console.log(`📩 Mensagem no grupo "${chat.name}": ${message.body}`);
    }
});

// Inicializa o bot
client.initialize();
