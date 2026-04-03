from datetime import datetime, date
from calendar import monthrange
from flask import Blueprint, render_template, request, redirect, url_for, jsonify, abort, current_app
from .models import Event, EventCategory
from .database import db

bp = Blueprint('main', __name__)

PRESET_MEMES = [
    {'name': 'Surprised Pikachu',      'url': 'https://i.imgflip.com/4t0m5.jpg'},
    {'name': 'This Is Fine',           'url': 'https://i.imgflip.com/2cp1.jpg'},
    {'name': 'Stonks',                 'url': 'https://i.imgflip.com/3si4.jpg'},
    {'name': 'Drake Pointing',         'url': 'https://i.imgflip.com/30b1gx.jpg'},
    {'name': 'Distracted Boyfriend',   'url': 'https://i.imgflip.com/1ur9b0.jpg'},
    {'name': 'Wait Its All X',         'url': 'https://i.imgflip.com/46e43q.jpg'},
    {'name': 'Gigachad',               'url': 'https://i.imgflip.com/54hjww.jpg'},
    {'name': 'Trollface',              'url': 'https://i.imgflip.com/1otk96.jpg'},
]


def require_admin():
    key = request.args.get('key', '')
    if key != current_app.config.get('ADMIN_KEY', 'pcoin-admin-2024'):
        abort(403)
    return key


# ─── Public ──────────────────────────────────────────────────────────────────

@bp.route('/')
def index():
    return redirect(url_for('main.calendar'))


@bp.route('/calendar')
def calendar():
    categories = EventCategory.query.all()
    return render_template('calendar.html', categories=categories)


@bp.route('/api/events')
def api_events():
    month_str = request.args.get('month')   # YYYY-MM
    day_str = request.args.get('day')       # YYYY-MM-DD
    category_id = request.args.get('category_id', type=int)

    query = Event.query

    if category_id:
        query = query.filter_by(category_id=category_id)

    if day_str:
        try:
            target_date = datetime.strptime(day_str, '%Y-%m-%d').date()
            query = query.filter(
                db.func.date(Event.start_datetime) == target_date
            )
        except ValueError:
            pass
    elif month_str:
        try:
            year, month = map(int, month_str.split('-'))
            _, days_in_month = monthrange(year, month)
            start = datetime(year, month, 1)
            end = datetime(year, month, days_in_month, 23, 59, 59)
            query = query.filter(Event.start_datetime >= start, Event.start_datetime <= end)
        except (ValueError, AttributeError):
            pass

    events = query.order_by(Event.start_datetime).all()
    return jsonify([e.to_dict() for e in events])


@bp.route('/api/events/<int:event_id>')
def api_event_detail(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())


# ─── Admin ────────────────────────────────────────────────────────────────────

@bp.route('/admin/events')
def admin_events():
    key = require_admin()
    events = Event.query.order_by(Event.start_datetime).all()
    categories = EventCategory.query.all()
    return render_template('admin/events.html', events=events, categories=categories, key=key)


@bp.route('/admin/events/new', methods=['GET', 'POST'])
def admin_event_new():
    key = require_admin()
    categories = EventCategory.query.all()

    if request.method == 'POST':
        event = Event(
            title=request.form['title'],
            description=request.form.get('description', ''),
            start_datetime=datetime.strptime(request.form['start_datetime'], '%Y-%m-%dT%H:%M'),
            end_datetime=datetime.strptime(request.form['end_datetime'], '%Y-%m-%dT%H:%M') if request.form.get('end_datetime') else None,
            location=request.form.get('location', ''),
            is_online='is_online' in request.form,
            is_free='is_free' in request.form,
            category_id=request.form.get('category_id', type=int),
            meme_url=request.form.get('meme_url', '') or None,
        )
        db.session.add(event)
        db.session.commit()
        return redirect(url_for('main.admin_events', key=key))

    return render_template('admin/event_form.html',
                           categories=categories,
                           event=None,
                           key=key,
                           preset_memes=PRESET_MEMES)


@bp.route('/admin/events/<int:event_id>', methods=['GET', 'POST'])
def admin_event_edit(event_id):
    key = require_admin()
    event = Event.query.get_or_404(event_id)
    categories = EventCategory.query.all()

    if request.method == 'POST':
        event.title = request.form['title']
        event.description = request.form.get('description', '')
        event.start_datetime = datetime.strptime(request.form['start_datetime'], '%Y-%m-%dT%H:%M')
        event.end_datetime = datetime.strptime(request.form['end_datetime'], '%Y-%m-%dT%H:%M') if request.form.get('end_datetime') else None
        event.location = request.form.get('location', '')
        event.is_online = 'is_online' in request.form
        event.is_free = 'is_free' in request.form
        event.category_id = request.form.get('category_id', type=int)
        event.meme_url = request.form.get('meme_url', '') or None
        db.session.commit()
        return redirect(url_for('main.admin_events', key=key))

    return render_template('admin/event_form.html',
                           categories=categories,
                           event=event,
                           key=key,
                           preset_memes=PRESET_MEMES)


@bp.route('/admin/events/<int:event_id>/delete', methods=['POST'])
def admin_event_delete(event_id):
    key = require_admin()
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    return redirect(url_for('main.admin_events', key=key))
