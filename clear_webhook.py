import urllib.request

tokens = [
    '8633439971:AAFR1WG5SyYnpEuwMVhQMC20LVyYSB4pSjE', # Main bot
    '8429193461:AAEnBiGsVX4hKYVnKYCnI5ZdLvNg7_0jZdE'  # Admin bot
]

for token in tokens:
    try:
        url = f"https://api.telegram.org/bot{token}/deleteWebhook?drop_pending_updates=true"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(f"Token {token[:10]}... : {response.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error for {token[:10]}: {e}")
