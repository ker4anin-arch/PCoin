from flask import Blueprint, jsonify, request
from .models import User, Skill, UserSkill, db

# Инициализация Blueprint
main = Blueprint('main', __name__)

# Создание пользователя
@main.route('/user', methods=['POST'], endpoint='create_user')
def create_user():
    data = request.get_json()
    telegram_id = data['telegram_id']

    # Проверяем, существует ли пользователь
    existing_user = User.query.filter_by(telegram_id=telegram_id).first()
    if existing_user:
        return jsonify({"error": "User already exists"}), 400

    # Создаём нового пользователя
    user = User(
        telegram_id=telegram_id,
        name=data.get('name', 'Anonymous')
    )
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201

# Получение данных пользователя
@main.route('/user/<int:telegram_id>', methods=['GET'], endpoint='get_user_data')
def get_user_data(telegram_id):
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200

# Получение списка навыков
@main.route('/skills', methods=['GET'], endpoint='get_skills')
def get_skills():
    skills = Skill.query.all()
    skill_list = [
        {"id": skill.id, "name": skill.name, "cost": skill.cost, "income_per_hour": skill.income_per_hour}
        for skill in skills
    ]
    return jsonify(skill_list), 200

@main.route('/user/<int:telegram_id>/buy_skill', methods=['POST'])
def buy_skill(telegram_id):
    data = request.get_json()
    skill_id = data.get('skill_id')

    user = User.query.filter_by(telegram_id=telegram_id).first()
    skill = Skill.query.get(skill_id)

    if not user or not skill:
        return jsonify({"error": "User or Skill not found"}), 404

    if user.coins < skill.cost:
        return jsonify({"error": "Not enough coins"}), 400

    user.coins -= skill.cost
    user.income_per_hour += skill.income_per_hour
    user.experience += 10  # Начисление опыта

    db.session.commit()
    return jsonify({"message": "Skill purchased successfully"}), 200

# Удаление пользователя по telegram_id
@main.route('/user/<int:telegram_id>', methods=['DELETE'])
def delete_user(telegram_id):
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted successfully"}), 200