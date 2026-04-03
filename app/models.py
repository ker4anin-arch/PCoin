from datetime import datetime
from .database import db


class EventCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(7), default='#7C3AED')
    icon = db.Column(db.String(50), default='fa-calendar')
    meme_url = db.Column(db.Text, nullable=True)
    events = db.relationship('Event', backref='category', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'icon': self.icon,
            'meme_url': self.meme_url,
        }


class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=True)
    location = db.Column(db.String(200), nullable=True)
    is_online = db.Column(db.Boolean, default=False)
    is_free = db.Column(db.Boolean, default=True)
    category_id = db.Column(db.Integer, db.ForeignKey('event_category.id'), nullable=True)
    meme_url = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'start_datetime': self.start_datetime.isoformat() if self.start_datetime else None,
            'end_datetime': self.end_datetime.isoformat() if self.end_datetime else None,
            'location': self.location,
            'is_online': self.is_online,
            'is_free': self.is_free,
            'category': self.category.to_dict() if self.category else None,
            'meme_url': self.meme_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


DEFAULT_CATEGORIES = [
    {'name': 'Встреча',  'color': '#7C3AED', 'icon': 'fa-users',
     'meme_url': 'https://i.imgflip.com/1ur9b0.jpg'},
    {'name': 'Обучение', 'color': '#2563EB', 'icon': 'fa-graduation-cap',
     'meme_url': 'https://i.imgflip.com/2cp1.jpg'},
    {'name': 'Конкурс',  'color': '#D97706', 'icon': 'fa-trophy',
     'meme_url': 'https://i.imgflip.com/3si4.jpg'},
    {'name': 'Аирдроп', 'color': '#059669', 'icon': 'fa-coins',
     'meme_url': 'https://i.imgflip.com/4t0m5.jpg'},
]


def seed_categories():
    if EventCategory.query.count() == 0:
        for cat in DEFAULT_CATEGORIES:
            db.session.add(EventCategory(**cat))
        db.session.commit()
