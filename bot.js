const TelegramBot = require('node-telegram-bot-api');

// Bot token provided by the user
const token = '8521051511:AAGqsWjQ82kecjN6reYPZ3-x3WUGXEb6jlc';
const bot = new TelegramBot(token, { polling: true });

// Admin ID for incoming orders
const ADMIN_ID = '8283401187';

// Product Database
const products = {
    'burgers': [
        { id: 'b1', name: 'Cheese Burger', price: 35000 },
        { id: 'b2', name: 'Mazza Burger', price: 38000 },
        { id: 'b3', name: 'Twins Burger', price: 40000 },
        { id: 'b4', name: 'Chicken Burger', price: 28000 },
        { id: 'b5', name: 'Halapeno Burger', price: 33000 },
        { id: 'b6', name: 'BBQ Burger', price: 32000 }
    ],
    'lavash': [
        { id: 'l1', name: 'Lavash Oddiy', price: 35000 },
        { id: 'l2', name: 'Lavash Mini', price: 33000 },
        { id: 'l3', name: 'Tandir Lavash', price: 40000 },
        { id: 'l4', name: 'Shaurma', price: 35000 }
    ],
    'kfc': [
        { id: 'k1', name: 'Twister', price: 33000 },
        { id: 'k2', name: 'KFS 1 Porsa', price: 25000 },
        { id: 'k3', name: 'Tovuqli Sandvich', price: 50000 },
        { id: 'k4', name: 'Donar Tarelka', price: 50000 }
    ],
    'hotdog': [
        { id: 'h1', name: 'Oddiy Hot-Dog', price: 10000 },
        { id: 'h2', name: 'Kanada Hot-Dog', price: 12000 },
        { id: 'h3', name: 'Qovurilgan Hot-Dog', price: 20000 },
        { id: 'h4', name: 'Go\'shtli Hot-Dog', price: 30000 }
    ],
    'snacks': [
        { id: 's1', name: 'Sharik', price: 18000 },
        { id: 's2', name: 'Fri', price: 18000 },
        { id: 's3', name: 'Derevenskiy Fri', price: 18000 }
    ]
};

const flatProducts = [];
Object.values(products).forEach(arr => flatProducts.push(...arr));
const getProductById = (id) => flatProducts.find(p => p.id === id);

// In-memory sessions
const sessions = {};
const getSession = (chatId) => {
    if (!sessions[chatId]) {
        sessions[chatId] = {
            cart: {},
            type: null,
            payment: null
        };
    }
    return sessions[chatId];
};

const getStartMenu = () => {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📜 Menyu (Taomlar)', callback_data: 'show_categories' }],
                [{ text: '🌐 Saytga o\'tish (Web App)', web_app: { url: 'https://mazzafood.netlify.app/' } }]
            ]
        }
    };
};

const getCategoriesMenu = () => {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🍔 Burgerlar', callback_data: 'cat_burgers' }, { text: '🥙 Lavash & Shaurma', callback_data: 'cat_lavash' }],
                [{ text: '🌯 Twister & KFC', callback_data: 'cat_kfc' }, { text: '🌭 Hot-Doglar', callback_data: 'cat_hotdog' }],
                [{ text: '🍟 Gazaklar & Fri', callback_data: 'cat_snacks' }],
                [{ text: '🛒 Savatcha (Buyurtma berish)', callback_data: 'cart_view' }],
                [{ text: '🔙 Bosh sahifa', callback_data: 'back_start' }]
            ]
        }
    };
};

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        const welcomeMessage = `🍔 *Mazza Foodga xush kelibsiz!* 🍟\n\nSizni ko'rib turganimizdan xursandmiz. Biz bilan eng mazali va tez tayyorlanadigan fast food taomlaridan bahramand bo'ling!\n\n👇 _Iltimos, Menyuni ochish uchun quyidagi tugmani bosing:_`;
        
        // Use a photo with the start message for a beautiful effect
        bot.sendPhoto(chatId, 'https://cdn-icons-png.flaticon.com/512/7997/7997011.png', {
            caption: welcomeMessage,
            parse_mode: 'Markdown',
            ...getStartMenu()
        });
    }
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const session = getSession(chatId);

    // Provide a default answer query to stop loading spinner
    try { bot.answerCallbackQuery(query.id); } catch(e){}

    if (data === 'show_categories') {
        // We delete the photo message and send a text message for categories to keep it clean, or edit caption
        try {
            bot.deleteMessage(chatId, query.message.message_id);
        } catch(e) {}
        bot.sendMessage(chatId, "😋 *Kategoriyani tanlang:*", {
            parse_mode: 'Markdown',
            ...getCategoriesMenu()
        });
    }

    else if (data === 'back_start') {
        try { bot.deleteMessage(chatId, query.message.message_id); } catch(e) {}
        const welcomeMessage = `🍔 *Mazza Foodga xush kelibsiz!* 🍟\n\n👇 _Iltimos, Menyuni ochish uchun quyidagi tugmani bosing:_`;
        bot.sendPhoto(chatId, 'https://cdn-icons-png.flaticon.com/512/7997/7997011.png', {
            caption: welcomeMessage,
            parse_mode: 'Markdown',
            ...getStartMenu()
        });
    }

    else if (data.startsWith('cat_')) {
        const catId = data.replace('cat_', '');
        const items = products[catId];
        
        let keyboard = [];
        items.forEach(p => {
            keyboard.push([{ text: `➕ ${p.name} - ${p.price} so'm`, callback_data: `add_${p.id}` }]);
        });
        keyboard.push([{ text: '🛒 Savatchani ko\'rish', callback_data: 'cart_view' }]);
        keyboard.push([{ text: '🔙 Orqaga', callback_data: 'show_categories' }]);

        bot.editMessageText(`Bulyimni tanladingiz. Nima buyurtma qilasiz?\n_Tugmani bosib savatchaga qo'shishingiz mumkin._`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    else if (data.startsWith('add_')) {
        const pId = data.replace('add_', '');
        const p = getProductById(pId);
        if(!session.cart[pId]) session.cart[pId] = { ...p, count: 0 };
        session.cart[pId].count += 1;
        
        bot.answerCallbackQuery(query.id, { text: `✅ ${p.name} savatchaga qo'shildi!`, show_alert: true });
    }

    else if (data === 'cart_view') {
        let text = '*Sizning savatchangiz:*\n\n';
        let total = 0;
        let keys = Object.keys(session.cart);
        
        if(keys.length === 0) {
           bot.answerCallbackQuery(query.id, { text: "Savatcha bo'sh!", show_alert: true });
           bot.editMessageText("Sizning savatchangiz bo'sh. Mahsulot tanlang:", {
               chat_id: chatId,
               message_id: query.message.message_id,
               ...getCategoriesMenu()
           });
           return;
        }

        keys.forEach(k => {
            const item = session.cart[k];
            text += `- ${item.name} x ${item.count} = ${item.price * item.count} so'm\n`;
            total += item.price * item.count;
        });
        text += `\n*Jami: ${total} so'm*`;

        bot.editMessageText(text, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🗑 Tozalash', callback_data: 'cart_clear' }, { text: '🚀 Buyurtma berish', callback_data: 'checkout_type' }],
                    [{ text: '🔙 Orqaga', callback_data: 'show_categories' }]
                ]
            }
        });
    }

    else if (data === 'cart_clear') {
        session.cart = {};
        bot.answerCallbackQuery(query.id, { text: "Savatcha tozalandi." });
        bot.editMessageText("Savatchangiz tozalandi. Quyidan menyuni tanlang:", {
            chat_id: chatId,
            message_id: query.message.message_id,
            ...getCategoriesMenu()
        });
    }

    else if (data === 'checkout_type') {
        bot.editMessageText("Barchasi tayyor! Yetkazib berish usulini tanlang:", {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🚚 Dostavka (Yetkazib berish)', callback_data: 'type_delivery' }],
                    [{ text: '🚶‍♂️ Olib ketish (Soboy)', callback_data: 'type_pickup' }],
                    [{ text: '🔙 Bekor qilish', callback_data: 'cart_view' }]
                ]
            }
        });
    }

    else if (data.startsWith('type_')) {
        session.type = data.replace('type_', ''); // delivery or pickup
        bot.editMessageText("To'lov usulini tanlang:", {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💵 Naqd pul', callback_data: 'pay_cash' }, { text: '💳 Click', callback_data: 'pay_click' }],
                    [{ text: '🔙 Bekor qilish', callback_data: 'cart_view' }]
                ]
            }
        });
    }

    else if (data.startsWith('pay_')) {
        session.payment = data.replace('pay_', ''); // cash or click
        
        let orderText = `🚨 *Yangi Buyurtma!*\n\n`;
        let total = 0;
        Object.keys(session.cart).forEach(k => {
            const item = session.cart[k];
            orderText += `- ${item.name} x ${item.count} = ${item.price * item.count} so'm\n`;
            total += item.price * item.count;
        });
        
        const typeStr = session.type === 'delivery' ? 'Yetkazib berish (Доставка) 🚚' : 'Olib ketish (Собой) 🚶‍♂️';
        const payStr = session.payment === 'cash' ? 'Naqd pul 💵' : 'Click 💳';

        orderText += `\n*Jami summa:* ${total} so'm\n`;
        orderText += `*Olish usuli:* ${typeStr}\n`;
        orderText += `*To'lov usuli:* ${payStr}\n`;

        const name = query.from.first_name || 'Ismsiz';
        const link = query.from.username ? `@${query.from.username}` : `[${name}](tg://user?id=${query.from.id})`;

        orderText += `*Xaridor:* ${link}`;

        bot.sendMessage(ADMIN_ID, orderText, { parse_mode: 'Markdown' }).catch(err => console.log('Admin send error: ', err.message));

        bot.editMessageText(`✅ *Buyurtmangiz muvaffaqiyatli qabul qilindi!*\n\nOperatorlarimiz tez orada siz bilan bog'lanishadi.\n\n*Jami summa:* ${total} so'm.\n*Buyurtma turi:* ${typeStr}\n*To'lov:* ${payStr}\n\nXaridingiz uchun rahmat!`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🏠 Bosh sahifaga qaytish', callback_data: 'back_start' }]
                ]
            }
        });

        session.cart = {};
    }
});

console.log('Mazza Food Bot is running...');
