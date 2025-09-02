const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require("fs");
require('dotenv').config(); 


const GROUP_NAME = process.env.GROUP_NAME;
const categories = JSON.parse(fs.readFileSync("./categories.json", "utf-8"));

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
        const partes = message.body.split(/[,|-]/);
        const cagegoryId = getCategoryId(partes[0]);
        console.log('categoryId: ', cagegoryId);
      
    }
});

getUserId = (msg) => {
    let userId = msg.author || msg.from; // Autor da mensagem        
    userId = userId.substring(0, 12);// Extrair apenas o número
    
    if (userId === "558391264053") { 
        return 1;
    } else if (userId === "558398593829") { 
        return 2;
    }

    // Se não encontrar, retorna o número cru (ou null, se preferir)
    return 0;
}

function getCategoryId(term) {
    const normalize = (str) =>
      str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const tokens = normalize(term).split(/\s+/); // quebra em palavras

    let bestCategory = "11"; // default: outros
    let bestScore = 0;

    for (const [id, termos] of Object.entries(categories)) {
      let score = 0;

      for (const t of termos) {
        const normalizedT = normalize(t);

        for (const token of tokens) {
          // Se o token aparece no termo ou vice-versa, soma ponto
          if (normalizedT.includes(token) || token.includes(normalizedT)) {
            score++;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestCategory = id;
      }
    }

    return bestCategory;
}


// Inicializa o bot
client.initialize();
