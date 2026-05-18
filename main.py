import os
import asyncio
import logging
import sys
import json
from typing import Dict, Any
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiohttp import web

TOKEN = '8574329398:AAEbVdblZpI83Lv3EvLX8EbcRq2Pf8r976c'
ADMIN_BOT_TOKEN = '8521051511:AAGqsWjQ82kecjN6reYPZ3-x3WUGXEb6jlc'
ADMIN_CHAT_ID = 8283401187 

# --- SMS GATEWAY CONFIG ---
SMS_API_KEY = "b84499890e0e572ffb6a7fb0952aee0d1d73254806bb183b"

async def send_sms_api(phone, otp):
    """
    Real SMS sending logic via smsmobileapi.com API
    """
    import aiohttp
    import urllib.parse

    text = f"Ideal Taxi: Tasdiqlash kodi - {otp}"
    # Remove any non-numeric characters from the phone number
    clean_phone = ''.join(filter(str.isdigit, phone))
    
    encoded_text = urllib.parse.quote(text)
    url = f"https://api.smsmobileapi.com/sendsms/?recipients={clean_phone}&message={encoded_text}&apikey={SMS_API_KEY}"
    
    logging.info(f"Sending real SMS to {clean_phone}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                resp_text = await resp.text()
                logging.info(f"SMS API response: {resp_text}")
                
        # Send confirmation to Telegram admin as well
        await admin_bot.send_message(ADMIN_CHAT_ID, f"📱 *SMS mijozning telefoniga yuborildi ({clean_phone}):*\n{text}\n\nJavob: {resp_text}", parse_mode='Markdown')
        return True
    except Exception as e:
        logging.error(f"Failed to send SMS: {e}")
        return False

bot = Bot(token=TOKEN)
admin_bot = Bot(token=ADMIN_BOT_TOKEN) 
dp = Dispatcher()

# Database simulation for reviews
REVIEWS_FILE = 'reviews.json'
if not os.path.exists(REVIEWS_FILE):
    with open(REVIEWS_FILE, 'w') as f:
        json.dump([], f)

def load_reviews():
    with open(REVIEWS_FILE, 'r') as f:
        return json.load(f)

def save_reviews(reviews):
    with open(REVIEWS_FILE, 'w') as f:
        json.dump(reviews, f)

products = {
    'burgers': [
        {'id': 'b1', 'name': 'Cheese Burger', 'price': 35000},
        {'id': 'b2', 'name': 'Mazza Burger', 'price': 38000},
        {'id': 'b3', 'name': 'Twins Burger', 'price': 40000},
        {'id': 'b4', 'name': 'Chicken Burger', 'price': 28000},
        {'id': 'b5', 'name': 'Halapeno Burger', 'price': 33000},
        {'id': 'b6', 'name': 'BBQ Burger', 'price': 32000}
    ],
    'lavash': [
        {'id': 'l1', 'name': 'Lavash Oddiy', 'price': 35000},
        {'id': 'l2', 'name': 'Lavash Mini', 'price': 33000},
        {'id': 'l3', 'name': 'Tandir Lavash', 'price': 40000},
        {'id': 'l4', 'name': 'Shaurma', 'price': 35000}
    ],
    'kfc': [
        {'id': 'k1', 'name': 'Twister', 'price': 33000},
        {'id': 'k2', 'name': 'KFS 1 Porsa', 'price': 25000},
        {'id': 'k3', 'name': 'Tovuqli Sandvich', 'price': 50000},
        {'id': 'k4', 'name': 'Donar Tarelka', 'price': 50000}
    ],
    'hotdog': [
        {'id': 'h1', 'name': 'Oddiy Hot-Dog', 'price': 10000},
        {'id': 'h2', 'name': 'Kanada Hot-Dog', 'price': 12000},
        {'id': 'h3', 'name': 'Qovurilgan Hot-Dog', 'price': 20000},
        {'id': 'h4', 'name': "Go'shtli Hot-Dog", 'price': 30000}
    ],
    'snacks': [
        {'id': 's1', 'name': 'Sharik', 'price': 18000},
        {'id': 's2', 'name': 'Fri', 'price': 18000},
        {'id': 's3', 'name': 'Derevenskiy Fri', 'price': 18000}
    ]
}

flat_products = []
for cat in products.values():
    flat_products.extend(cat)

def get_product_by_id(p_id):
    return next((p for p in flat_products if p['id'] == p_id), None)

sessions: Dict[int, Dict[str, Any]] = {}

def get_session(chat_id: int):
    if chat_id not in sessions:
        sessions[chat_id] = {'cart': {}, 'type': None, 'payment': None}
    return sessions[chat_id]

def get_start_menu():
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text='📜 Menyu (Taomlar)', callback_data='show_categories'))
    builder.row(InlineKeyboardButton(text="🌐 Saytga o'tish", web_app=types.WebAppInfo(url='https://mazzafood.netlify.app/')))
    return builder.as_markup()

def get_categories_menu():
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text='🍔 Burgerlar', callback_data='cat_burgers'), InlineKeyboardButton(text='🥙 Lavash', callback_data='cat_lavash'))
    builder.row(InlineKeyboardButton(text='🌯 KFC', callback_data='cat_kfc'), InlineKeyboardButton(text='🌭 Hot-Doglar', callback_data='cat_hotdog'))
    builder.row(InlineKeyboardButton(text='🍟 Gazaklar', callback_data='cat_snacks'))
    builder.row(InlineKeyboardButton(text='🛒 Savatcha', callback_data='cart_view'))
    builder.row(InlineKeyboardButton(text='🔙 Bosh sahifa', callback_data='back_start'))
    return builder.as_markup()

@dp.message(CommandStart())
async def command_start_handler(message: types.Message):
    await message.answer_photo(
        photo='https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1965',
        caption="🍔 *Mazza Foodga xush kelibsiz!*\n\nMenyuni ochish uchun tugmani bosing:",
        parse_mode='Markdown',
        reply_markup=get_start_menu()
    )

@dp.message(Command("menu"))
async def command_menu_handler(message: types.Message):
    await message.answer("😋 *Kategoriyani tanlang:*", parse_mode='Markdown', reply_markup=get_categories_menu())

@dp.message(Command("clear"))
async def command_clear_handler(message: types.Message):
    # --- НОВАЯ ЛОГИКА ПОЛНОЙ ОЧИСТКИ ЧАТА ---
    # Получаем ID текущего сообщения как точку отсчета
    current_msg_id = message.message_id
    chat_id = message.chat.id
    
    # Удаляем сообщения в цикле (назад на 100 сообщений)
    for msg_id in range(current_msg_id, current_msg_id - 100, -1):
        try:
            await bot.delete_message(chat_id=chat_id, message_id=msg_id)
        except Exception:
            # Пропускаем, если сообщение старое (>48ч) или уже удалено
            continue
    
    # Отправляем финальное уведомление
    status_msg = await message.answer("🧹 Chat muvaffaqiyatli tozalandi!")
    
    # Ждем 3-4 секунды и удаляем само уведомление
    await asyncio.sleep(3.5)
    try:
        await bot.delete_message(chat_id=chat_id, message_id=status_msg.message_id)
    except Exception:
        pass

    # Очищаем также сессию корзины
    session = get_session(chat_id)
    session['cart'] = {}

@dp.message(Command("about"))
async def command_about_handler(message: types.Message):
    about_text = (
        "🍕 *PIZZA & KFC & FAST FOOD*\n\n"
        "🍕 *PIZZA буюртма берсангиз етказиб бериш хизмати бепул!!!*\n\n"
        "📍 *Манзил:* Пўстиндўз кўчаси (Спортивные) нон маркази билан ён маён\n\n"
        "💳 *CLICK*\n"
        "`5614 6822 1326 5467` \n"
        "*Xatamkulov Xabibjon*\n\n"
        "🚗 *Доставка хизмати*\n"
        "+99897-201-10-10\n"
        "+99888-201-10-10"
    )
    await message.answer(about_text, parse_mode='Markdown')

# --- НОВАЯ КОМАНДА /commands ---
@dp.message(Command("commands"))
async def command_list_handler(message: types.Message):
    commands_text = (
        "🤖 *Bot buyruqlari ro'yxati:*\n\n"
        "🚀 /start — Botni ishga tushirish va asosiy menyu\n"
        "🍽 /menu — Taomlar va kategoriyalar menyusi\n"
        "🗑 /clear — Savatchani toliq tozalash\n"
        "ℹ️ /about — Biz haqimizda va aloqa ma'lumotlari\n"
        "📜 /commands — Hozirgi buyruqlar ro'yxati"
    )
    await message.answer(commands_text, parse_mode='Markdown')

@dp.callback_query(F.data == 'show_categories')
async def show_categories(query: CallbackQuery):
    await query.message.answer("😋 *Kategoriyani tanlang:*", parse_mode='Markdown', reply_markup=get_categories_menu())
    await query.answer()

@dp.callback_query(F.data.startswith('cat_'))
async def show_category_items(query: CallbackQuery):
    cat_id = query.data.replace('cat_', '')
    items = products.get(cat_id, [])
    builder = InlineKeyboardBuilder()
    for p in items:
        builder.row(InlineKeyboardButton(text=f"➕ {p['name']} - {p['price']} so'm", callback_data=f"add_{p['id']}"))
    builder.row(InlineKeyboardButton(text="🛒 Savatcha", callback_data='cart_view'), InlineKeyboardButton(text='🔙 Orqaga', callback_data='show_categories'))
    await query.message.edit_text("Nima buyurtma qilasiz?", reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith('add_'))
async def add_to_cart(query: CallbackQuery):
    p_id = query.data.replace('add_', '')
    p = get_product_by_id(p_id)
    session = get_session(query.message.chat.id)
    if p_id not in session['cart']:
        session['cart'][p_id] = {**p, 'count': 0}
    session['cart'][p_id]['count'] += 1
    await query.answer(text=f"✅ {p['name']} qo'shildi!", show_alert=True)

@dp.callback_query(F.data == 'cart_view')
async def cart_view(query: CallbackQuery):
    session = get_session(query.message.chat.id)
    if not session['cart']:
        await query.answer("Savatcha bo'sh!", show_alert=True)
        return
    text = '*Savatchangiz:*\n\n'
    total = 0
    builder = InlineKeyboardBuilder()
    for p_id, item in session['cart'].items():
        text += f"- {item['name']} x {item['count']} = {item['price'] * item['count']} so'm\n"
        total += item['price'] * item['count']
        builder.row(InlineKeyboardButton(text='➖', callback_data=f"cart_dec_{p_id}"), InlineKeyboardButton(text=f"{item['name']} ({item['count']})", callback_data='noop'), InlineKeyboardButton(text='➕', callback_data=f"cart_inc_{p_id}"))
    text += f"\n*Jami: {total} so'm*"
    builder.row(InlineKeyboardButton(text='🗑 Tozalash', callback_data='cart_clear'), InlineKeyboardButton(text='🚀 Buyurtma', callback_data='checkout_type'))
    await query.message.edit_text(text, parse_mode='Markdown', reply_markup=builder.as_markup())

@dp.callback_query(F.data == 'checkout_type')
async def checkout_type(query: CallbackQuery):
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text='🚚 Dostavka', callback_data='type_delivery'), InlineKeyboardButton(text='🚶‍♂️ Soboy', callback_data='type_pickup'))
    await query.message.edit_text("Yetkazib berish usulini tanlang:", reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith('type_'))
async def checkout_payment(query: CallbackQuery):
    session = get_session(query.message.chat.id)
    session['type'] = query.data.replace('type_', '')
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text='💵 Naqd', callback_data='pay_cash'), InlineKeyboardButton(text='💳 Click', callback_data='pay_click'))
    await query.message.edit_text("To'lov usuli:", reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith('pay_'))
async def finish_order(query: CallbackQuery):
    chat_id = query.message.chat.id
    session = get_session(chat_id)
    session['payment'] = query.data.replace('pay_', '')
    
    order_text = "🚨 *Yangi Buyurtma!*\n\n"
    total = 0
    for p_id, item in session['cart'].items():
        order_text += f"- {item['name']} x {item['count']} = {item['price'] * item['count']} so'm\n"
        total += item['price'] * item['count']
    
    order_text += f"\n*Jami:* {total} so'm\n*Usul:* {session['type']}\n*To'lov:* {session['payment']}\n"
    order_text += f"*Xaridor:* {query.from_user.full_name} (@{query.from_user.username})"

    try:
        await admin_bot.send_message(ADMIN_CHAT_ID, order_text, parse_mode='Markdown')
    except Exception as e:
        logging.error(f"Xabar yuborishda xato: {e}")

    await query.message.edit_text("✅ Buyurtma qabul qilindi! Rahmat.", reply_markup=None)
    session['cart'] = {}
    await query.answer()

# --- REVIEW MODERATION HANDLERS ---
@dp.callback_query(F.data.startswith('rev_'))
async def moderate_review(query: CallbackQuery):
    if query.from_user.id != ADMIN_CHAT_ID:
        await query.answer("Siz admin emassiz!", show_alert=True)
        return

    parts = query.data.split('_')
    action = parts[1] # 'approve' or 'delete'
    review_id = parts[2]

    # In a real app, we would update the status in a database.
    # Here we'll just acknowledge the action for the admin.
    
    if action == 'approve':
        await query.message.edit_caption(
            caption=query.message.caption + "\n\n✅ *Tasdiqlandi!* Sharh saytda paydo bo'ladi.",
            parse_mode='Markdown',
            reply_markup=None
        )
        await query.answer("Sharh tasdiqlandi!")
    else:
        await query.message.edit_caption(
            caption=query.message.caption + "\n\n❌ *O'chirildi!*",
            parse_mode='Markdown',
            reply_markup=None
        )
        await query.answer("Sharh o'chirildi!")

async def handle_api(request):
    # CORS Headers for local development
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    if request.method == 'OPTIONS':
        return web.Response(headers=headers)

    try:
        data = await request.json()
        action = data.get('action')

        if action == 'new_review':
            review = data.get('review')
            # Notify Admin
            text = (
                f"📝 *Yangi sharh (Moderatsiya)!*\n\n"
                f"👤 Mijoz: *{review['name']}*\n"
                f"⭐ Baho: {review['rating']} / 5\n"
                f"💬 Matn: {review['text']}\n"
            )
            
            builder = InlineKeyboardBuilder()
            builder.row(
                InlineKeyboardButton(text="✅ Qoldirish", callback_data=f"rev_approve_{review['ts']}"),
                InlineKeyboardButton(text="❌ O'chirish", callback_data=f"rev_delete_{review['ts']}")
            )
            
            await admin_bot.send_message(ADMIN_CHAT_ID, text, parse_mode='Markdown', reply_markup=builder.as_markup())
            return web.json_response({'ok': True}, headers=headers)

        if action == 'send_otp':
            phone = data.get('phone')
            otp = data.get('otp')
            success = await send_sms_api(phone, otp)
            return web.json_response({'ok': success}, headers=headers)

        return web.json_response({'ok': False, 'error': 'Unknown action'}, headers=headers)
    except Exception as e:
        logging.error(f"API Error: {e}")
        return web.json_response({'ok': False, 'error': str(e)}, headers=headers)

async def handle(request):
    return web.Response(text="Bot is running smoothly on Web Service mode!")

async def start_web_server():
    app = web.Application()
    app.router.add_get('/', handle)
    app.router.add_post('/api', handle_api)
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.environ.get("PORT", 10000))
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()

async def main():
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    asyncio.create_task(start_web_server())
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
