from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# Команда /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Получаем ID пользователя
    telegram_id = update.effective_user.id

    # Формируем URL с переданным telegram_id
    url = f"https://ker4anin-arch.github.io/PCoin/?telegram_id={telegram_id}"

    # Создаём кнопку для перехода на сайт
    keyboard = [[
        InlineKeyboardButton("Открыть приложение", web_app={"url": url})
    ]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Отправляем сообщение с кнопкой
    await update.message.reply_text(
        "Нажмите кнопку, чтобы открыть приложение:",
        reply_markup=reply_markup
    )

# Инициализация бота
TOKEN = "7842592728:AAF49trG_i35bMZ9eftIKReBJ6oinXbsDrE"
app = ApplicationBuilder().token(TOKEN).build()

# Привязка команды /start
app.add_handler(CommandHandler("start", start))

# Запуск бота
print("Бот запущен...")
app.run_polling()
