require("dotenv").config();
const { getUserEmail, getUserName } = require("./utils/user");
const { getUserState, setUserState } = require("./state/stateManager");
const { getMainMenu } = require("./views/messages");
const totalHandler = require('./handlers/totalHandler');

// Importaremos nossos futuros handlers aqui
const menuHandler = require('./handlers/menuHandler');
const categoryHandler = require('./handlers/categoryHandler');
const personalHandler = require('./handlers/personalHandler');
const newExpenseHandler = require('./handlers/newExpenseHandler');

const GROUP_NAME = process.env.GROUP_NAME;

const handleMessage = async (message) => {
    try {
        const chat = await message.getChat();

        // Validações iniciais
        if (!chat.isGroup || chat.name !== GROUP_NAME) return;
        if (!message.author) return;

        const userEmail = getUserEmail(message);
        if (!userEmail) {
            console.log("⚠️ Usuário não reconhecido, ignorando mensagem");
            return;
        }

        const currentState = getUserState(userEmail);
        const body = message.body.trim().toLowerCase();

        // Comando global para chamar o menu a qualquer momento
        if (body === "menu") {
            setUserState(userEmail, "awaitingMenuOption");
            await chat.sendMessage(getMainMenu());
            return;
        }

        // O "Roteador" principal que direciona para o handler correto
        switch (currentState) {
            case "awaitingMenuOption":
                await menuHandler.handle(message);
                break;

            case "awaitingCategoryOption":
            case "awaitingCategoryAction":
                await categoryHandler.handle(message);
                break;

            case "awaitingPersonalAction":
                await personalHandler.handle(message);
                break;

            case "awaitingTotalAction": // <-- ADICIONE ESTE NOVO CASE
                await totalHandler.handle(message);
                break;

            // Se não houver estado, consideramos que é um registro de nova despesa
            default:
                await newExpenseHandler.handle(message);
                break;
        }
    } catch (error) {
        console.error("❌ Erro inesperado no messageRouter:", error);
        // Idealmente, poderíamos enviar uma mensagem de erro para o chat aqui
        const chat = await message.getChat();
        await chat.sendMessage("⚠️ Ocorreu um erro inesperado. Tente novamente mais tarde.");
    }
};

module.exports = { handleMessage };