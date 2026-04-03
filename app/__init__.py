import os
from datetime import datetime
from flask import Flask
from .database import db


def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///events.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['ADMIN_KEY'] = os.environ.get('ADMIN_KEY', 'pcoin-admin-2024')

    db.init_app(app)

    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    with app.app_context():
        db.create_all()
        from .models import seed_categories
        seed_categories()

    # Make `now` available in all templates
    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}

    return app
