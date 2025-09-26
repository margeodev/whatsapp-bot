const getMainMenu = () => {
  return `📋 *Menu de opções*
1️⃣ - Listar despesas pessoais
2️⃣ - Listar despesas por categoria
3️⃣ - Exibir total de despesas
4️⃣ - Sair

👉 Digite o número da opção desejada.`;
};

const getCategoriesMenu = (categories) => {
  let menuText = `📊 *Categorias disponíveis*\n`;

  if (!categories || categories.length === 0) {
      return "Não foi possível carregar as categorias no momento.";
  }

  categories.forEach(category => {
    menuText += `${category.id} - ${category.description}\n`;
  });

  menuText += `\n👉 Digite o número da categoria ou *0* para voltar ao menu principal.`;
  return menuText;
};

const formatTotalExpenses = (totalsByCategory) => {
    if (!totalsByCategory || totalsByCategory.length === 0) {
        return "📭 Nenhuma despesa registrada neste mês.\n\n1️⃣ - Voltar ao menu principal";
    }

    // Soma o total de cada categoria para obter o total geral
    const totalGeral = totalsByCategory.reduce((sum, category) => sum + Number(category.total), 0);

    let reply = `💰 *Total de despesas do mês:*\n\n`;
    reply += `*${totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n\n`;
    reply += `1️⃣ - Voltar ao menu principal`;

    return reply;
};

const getCategoryActionsMenu = () => {
    return `1️⃣ - Voltar para categorias\n` +
           `2️⃣ - Voltar ao menu principal`;
}

const formatPersonalExpenses = (expenses) => {
    if (!expenses.length) {
        return "📭 Nenhuma despesa pessoal registrada neste mês.\n\n1️⃣ - Voltar ao menu principal";
    }

    let reply = `📋 *Despesas pessoais do mês:*\n\n`;
    let total = 0;

    expenses.forEach((entry, index) => {
        const valor = Number(entry.amount);
        total += valor;
        reply += `${index + 1}. *${entry.description}* - ${valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        })}\n`;
    });

    reply += `\n💰 *Total:* ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
    reply += `\n\n1️⃣ - Voltar ao menu principal`;
    return reply;
};

const formatCategoryTotal = (item, categoryName) => {
    if (!item) {
        return `📭 Nenhuma despesa encontrada para *${categoryName}* neste mês.\n\n${getCategoryActionsMenu()}`;
    }

    return `📊 *Resumo de ${categoryName}:*\n\n` +
           `💰 Total: *${Number(item.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n\n` +
           `${getCategoryActionsMenu()}`;
}

const formatNewExpenseSuccess = (description, amount, categoryName, isPersonal) => {
    let message = `✅ Registro incluído com sucesso!\n` +
                  `📌 Descrição: *${description}*\n` +
                  `💰 Valor: *${Number(amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n` +
                  `🏷️ Categoria: *${categoryName}*`;
    
    if (isPersonal) {
        message += `\n👤 Tipo: *Pessoal*`;
    }
    return message;
}

module.exports = {
  getMainMenu,
  getCategoriesMenu,
  getCategoryActionsMenu,
  formatPersonalExpenses,
  formatCategoryTotal,
  formatNewExpenseSuccess,
  formatTotalExpenses
};