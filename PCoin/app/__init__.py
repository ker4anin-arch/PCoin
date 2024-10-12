from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///product_coin.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    # Импортируем и регистрируем Blueprint
    from .routes import main  # Импортировать здесь!
    app.register_blueprint(main)

    with app.app_context():
        db.create_all()  # Создаём таблицы

    return app
