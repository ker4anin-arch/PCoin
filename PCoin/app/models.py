from . import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.Integer, unique=True, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    level = db.Column(db.String(20), default="Junior")
    coins = db.Column(db.Integer, default=300)
    energy = db.Column(db.Integer, default=300)
    experience = db.Column(db.Integer, default=0)
    income_per_hour = db.Column(db.Integer, default=0)
    friends = db.Column(db.PickleType, default=list)
    skills = db.Column(db.PickleType, default=dict)
    tasks = db.Column(db.PickleType, default=list)

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
