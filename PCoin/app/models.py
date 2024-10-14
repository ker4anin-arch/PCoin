from .database import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100))
    coins = db.Column(db.Integer, default=0)
    energy = db.Column(db.Integer, default=100)
    level = db.Column(db.String(50), default='Junior')



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
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    cost = db.Column(db.Integer, default=100)
    income_per_hour = db.Column(db.Integer, default=10)

class UserSkill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    skill_id = db.Column(db.Integer, db.ForeignKey('skill.id'))
    level = db.Column(db.Integer, default=0)

    user = db.relationship('User', backref='user_skills')
    skill = db.relationship('Skill')
