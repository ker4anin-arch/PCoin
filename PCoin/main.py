from app import create_app, db
from app.models import User
import threading
import time

app = create_app()

def restore_energy():
    while True:
        with app.app_context():
            users = User.query.all()
            for user in users:
                user.energy = min(user.energy + 10, 300)  # Не превышает 300
            db.session.commit()
        time.sleep(3600)  # 60 минут

# Запуск фонового потока для восстановления энергии
threading.Thread(target=restore_energy, daemon=True).start()

if __name__ == '__main__':
    app.run(debug=True)

if __name__ == "__main__":
    print("Бот запущен и готов принимать команды...")
    main()
