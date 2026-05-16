import asyncio
import logging
import sys
from typing import Dict, Any

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

# --- ASOSIY SOZLAMALAR ---
# Buyurtma qabul qiladigan bot (Siz ko'rsatgan 1-token)
TOKEN = '8574329398:AAEbVdblZpI83Lv3EvLX8EbcRq2Pf8r976c'

# Adminga xabar yuboradigan ikkinchi bot (Siz ko'rsatgan 2-token)
ADMIN_BOT_TOKEN = '8521051511:AAGqsWjQ82kecjN6reYPZ3-x3WUGXEb6jlc'
# DIQQAT: Xabar borishi kerak bo'lgan shaxsning Telegram ID raqami
# (Buni @userinfobot orqali bilib olishingiz mumkin)
ADMIN_CHAT_ID = 8283401187 

# Botlarni ishga tushirish
bot = Bot(token=TOKEN)
admin_bot = Bot(token=ADMIN_BOT_TOKEN) # Ikkinchi bot orqali xabar yuborish uchun
dp = Dispatcher()

# --- MAHSULOTLAR BAZASI ---
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

# --- KLAVIATURALAR ---
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

# --- HANDLERLAR ---
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
    session = get_session(message.chat.id)
    if not session['cart']:
        await message.answer("🛒 Savatchangiz allaqachon bo'sh.")
    else:
        session['cart'] = {}
        await message.answer("🗑 Savatchangiz muvaffaqiyatli tozalandi!")

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
        # Buyurtmani IKIKINCHI bot orqali adminga yuborish
        await admin_bot.send_message(ADMIN_CHAT_ID, order_text, parse_mode='Markdown')
    except Exception as e:
        logging.error(f"Xabar yuborishda xato: {e}")

    await query.message.edit_text("✅ Buyurtma qabul qilindi! Rahmat.", reply_markup=None)
    session['cart'] = {}
    await query.answer()

async def main():
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
