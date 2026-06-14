import asyncio
from aiogram import Bot

ADMIN_BOT_TOKEN = '8429193461:AAEnBiGsVX4hKYVnKYCnI5ZdLvNg7_0jZdE'
ADMIN_CHAT_ID = 8283401187

async def main():
    bot = Bot(token=ADMIN_BOT_TOKEN)
    try:
        await bot.send_message(ADMIN_CHAT_ID, '🚨 <b>Yangi test!</b>', parse_mode='HTML')
        print('SUCCESS')
    except Exception as e:
        print('ERROR:', str(e))
    finally:
        await bot.session.close()

if __name__ == '__main__':
    asyncio.run(main())
