from telegram import Update, Bot
from telegram.ext import Updater, CommandHandler, CallbackContext
from app import create_app, db
from app.models import User


# Настройка приложения Flask
app = create_app()

# Ваш Telegram-токен (замените на свой)
TOKEN = "7842592728:AAF49trG_i35bMZ9eftIKReBJ6oinXbsDrE"

def start(update: Update, context: CallbackContext):
    try:
        telegram_id = update.effective_user.id
        name = update.effective_user.first_name

        with app.app_context():
            user = User.query.filter_by(telegram_id=telegram_id).first()
            if user:
                message = f"Добро пожаловать обратно, {user.name}! У вас {user.coins} монет."
            else:
                user = User(
                    telegram_id=telegram_id,
                    name=name,
                    coins=300,
                    energy=300,
                    experience=0,
                    income_per_hour=0
                )
                db.session.add(user)
                db.session.commit()
                message = f"Привет, {name}! Вы зарегистрированы. Вам начислено 300 монет."

        context.bot.send_message(chat_id=update.effective_chat.id, text=message)
    except Exception as e:
        print(f"Ошибка: {e}")


def balance(update: Update, context: CallbackContext):
    """Отправляет пользователю его текущий баланс."""
    telegram_id = update.effective_user.id

    with app.app_context():
        user = User.query.filter_by(telegram_id=telegram_id).first()
        if user:
            message = f"Ваш баланс: {user.coins} монет."
        else:
            message = "Вы ещё не зарегистрированы. Отправьте /start для регистрации."

    # Отправляем сообщение с балансом
    context.bot.send_message(chat_id=update.effective_chat.id, text=message)

def main():
    """Запуск бота."""
    updater = Updater(TOKEN, use_context=True)
    dispatcher = updater.dispatcher

    # Обработчики команд
    dispatcher.add_handler(CommandHandler("start", start))
    di
