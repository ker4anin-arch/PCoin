from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from .database import db


class EventCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(7), default='#7C3AED')
    icon = db.Column(db.String(50), default='fa-calendar')
    meme_url = db.Column(db.Text, nullable=True)
    events = db.relationship('Event', backref='category', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name,
                'color': self.color, 'icon': self.icon,
                'meme_url': self.meme_url}


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
    # Recurrence
    recurrence = db.Column(db.String(20), default='none')   # none/daily/weekly/monthly/yearly
    recurrence_end_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, override_start=None, override_end=None):
        start = override_start or self.start_datetime
        end = override_end or self.end_datetime
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'start_datetime': start.isoformat() if start else None,
            'end_datetime': end.isoformat() if end else None,
            'location': self.location,
            'is_online': self.is_online,
            'is_free': self.is_free,
            'category': self.category.to_dict() if self.category else None,
            'meme_url': self.meme_url,
            'recurrence': self.recurrence,
            'recurrence_end_date': self.recurrence_end_date.isoformat() if self.recurrence_end_date else None,
        }


def expand_events(events, range_start, range_end):
    """Expand recurring events into individual instances within [range_start, range_end]."""
    result = []
    for ev in events:
        if ev.recurrence == 'none':
            result.append(ev.to_dict())
            continue

        # generate occurrences
        cur_start = ev.start_datetime
        duration = (ev.end_datetime - ev.start_datetime) if ev.end_datetime else timedelta(0)
        end_limit = ev.recurrence_end_date or range_end

        while cur_start <= min(end_limit, range_end):
            if cur_start >= range_start:
                result.append(ev.to_dict(
                    override_start=cur_start,
                    override_end=(cur_start + duration) if ev.end_datetime else None,
                ))
            # advance
            if ev.recurrence == 'daily':
                cur_start += timedelta(days=1)
            elif ev.recurrence == 'weekly':
                cur_start += timedelta(weeks=1)
            elif ev.recurrence == 'monthly':
                cur_start += relativedelta(months=1)
            elif ev.recurrence == 'yearly':
                cur_start += relativedelta(years=1)
            else:
                break

    return result


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
