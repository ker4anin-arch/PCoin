from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    # Настройки базы данных
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///product_coin.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    # Регистрация маршрутов
    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    # Создание таблиц при запуске
    with app.app_context():
        db.create_all()

    return app
