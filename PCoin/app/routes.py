from flask import Blueprint, render_template, request, redirect, url_for
from .models import User  # Предполагаем, что у вас есть модель User
from . import db

bp = Blueprint('main', __name__)


@bp.route('/')
def index():
    user = {"level": "Junior", "coins": 300, "energy": 300}
    return render_template('index.html', user=user)

@bp.route('/airdrop')
def airdrop():
    return render_template('airdrop.html')

@bp.route('/dashboard/<int:telegram_id>')
def dashboard(telegram_id):
    """Страница дашборда для пользователя"""
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if user:
        return render_template('dashboard.html', user=user, available_skills=[])
    return "User not found", 404
