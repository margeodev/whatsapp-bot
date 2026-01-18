/**
 * Função auxiliar para enviar mensagens com segurança e retry
 * Resolve problemas com 'markedUnread' undefined na biblioteca whatsapp-web.js
 */
const sendMessageSafely = async (chat, message, retries = 2) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Pequeno delay antes de enviar (aumenta a cada tentativa)
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            // sendSeen: false evita tentar marcar como lido, prevenindo o erro
            await chat.sendMessage(message, { sendSeen: false });
            return true;
        } catch (error) {
            console.error(`❌ Tentativa ${attempt} de envio falhou:`, error.message);
            if (attempt === retries) {
                throw error;
            }
            // Aguarda um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return false;
};

module.exports = { sendMessageSafely };
