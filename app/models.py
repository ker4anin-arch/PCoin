from .database import db
from . import db

from . import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)
    skills = db.relationship('UserSkill', back_populates='user')  # Связь с UserSkill

    def __repr__(self):
        return f'<User {self.name}>'


    def to_dict(self):
        return {
            "telegram_id": self.telegram_id,
            "name": self.name,
            "level": self.level,
            "coins": self.coins,
            "energy": self.energy,
            "income_per_hour": self.income_per_hour,
            "friends": self.friends,
            "skills": self.skills,
            "tasks": self.tasks,
            "experience": self.experience
        }

def update_user_level(user):
    if user.experience >= 100 and user.level == "Junior":
        user.level = "Middle"
    elif user.experience >= 200 and user.level == "Middle":
        user.level = "Senior"
    db.session.commit()

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    daily = db.Column(db.Boolean, default=False)  # Ежедневное задание или разовое
    reward = db.Column(db.Integer, default=10)  # Награда в монетах


class Skill(db.Model):
    __tablename__ = 'skills'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    income = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=0)
    cost = db.Column(db.Integer, nullable=False)
    users = db.relationship('UserSkill', back_populates='skill')  # Связь с UserSkill

    def __repr__(self):
        return f'<Skill {self.name}>'


class UserSkill(db.Model):
    __tablename__ = 'user_skills'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skills.id'), nullable=False)
    user = db.relationship('User', back_populates='skills')
    skill = db.relationship('Skill', back_populates='users')

