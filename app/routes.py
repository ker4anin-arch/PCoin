from datetime import datetime
from calendar import monthrange
from functools import wraps
from flask import (Blueprint, render_template, request, redirect,
                   url_for, jsonify, session, current_app, flash)
from .models import Event, EventCategory, expand_events
from .database import db

bp = Blueprint('main', __name__)

PRESET_MEMES = [
    {'name': 'Surprised Pikachu',    'url': 'https://i.imgflip.com/4t0m5.jpg'},
    {'name': 'This Is Fine',         'url': 'https://i.imgflip.com/2cp1.jpg'},
    {'name': 'Stonks',               'url': 'https://i.imgflip.com/3si4.jpg'},
    {'name': 'Drake Pointing',       'url': 'https://i.imgflip.com/30b1gx.jpg'},
    {'name': 'Distracted Boyfriend', 'url': 'https://i.imgflip.com/1ur9b0.jpg'},
    {'name': 'Wait Its All X',       'url': 'https://i.imgflip.com/46e43q.jpg'},
    {'name': 'Gigachad',             'url': 'https://i.imgflip.com/54hjww.jpg'},
    {'name': 'Trollface',            'url': 'https://i.imgflip.com/1otk96.jpg'},
]

RECURRENCE_LABELS = {
    'none':    'Не повторяется',
    'daily':   'Каждый день',
    'weekly':  'Каждую неделю',
    'monthly': 'Каждый месяц',
    'yearly':  'Каждый год',
}


# ── Auth decorator ────────────────────────────────────────────────────────────

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('main.admin_login'))
        return f(*args, **kwargs)
    return decorated


# ── Public ────────────────────────────────────────────────────────────────────

@bp.route('/')
def index():
    return redirect(url_for('main.calendar'))


@bp.route('/calendar')
def calendar():
    categories = EventCategory.query.all()
    return render_template('calendar.html', categories=categories)


@bp.route('/api/events')
def api_events():
    month_str   = request.args.get('month')       # YYYY-MM
    day_str     = request.args.get('day')          # YYYY-MM-DD
    category_id = request.args.get('category_id', type=int)

    query = Event.query
    if category_id:
        query = query.filter_by(category_id=category_id)

    if day_str:
        try:
            target = datetime.strptime(day_str, '%Y-%m-%d')
            range_start = target.replace(hour=0, minute=0, second=0)
            range_end   = target.replace(hour=23, minute=59, second=59)
            query = query.filter(Event.start_datetime <= range_end)
        except ValueError:
            range_start = range_end = datetime.utcnow()
    elif month_str:
        try:
            year, month = map(int, month_str.split('-'))
            _, days_in_month = monthrange(year, month)
            range_start = datetime(year, month, 1)
            range_end   = datetime(year, month, days_in_month, 23, 59, 59)
            # include recurring events that started before this month
            query = query.filter(Event.start_datetime <= range_end)
        except (ValueError, AttributeError):
            range_start = range_end = datetime.utcnow()
    else:
        range_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
        range_end   = datetime(range_start.year + 1, 12, 31)

    events = query.order_by(Event.start_datetime).all()
    return jsonify(expand_events(events, range_start, range_end))


@bp.route('/api/events/<int:event_id>')
def api_event_detail(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())


# ── Admin Auth ────────────────────────────────────────────────────────────────

@bp.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if session.get('admin_logged_in'):
        return redirect(url_for('main.admin_events'))

    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        if (username == current_app.config['ADMIN_USERNAME'] and
                password == current_app.config['ADMIN_PASSWORD']):
            session['admin_logged_in'] = True
            session.permanent = True
            return redirect(url_for('main.admin_events'))
        error = 'Неверный логин или пароль'

    return render_template('admin/login.html', error=error)


@bp.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('main.admin_login'))


# ── Admin Events ──────────────────────────────────────────────────────────────

@bp.route('/admin/events')
@admin_required
def admin_events():
    events     = Event.query.order_by(Event.start_datetime).all()
    categories = EventCategory.query.all()
    return render_template('admin/events.html',
                           events=events, categories=categories,
                           recurrence_labels=RECURRENCE_LABELS)


@bp.route('/admin/events/new', methods=['GET', 'POST'])
@admin_required
def admin_event_new():
    categories = EventCategory.query.all()

    if request.method == 'POST':
        rec_end_raw = request.form.get('recurrence_end_date')
        event = Event(
            title       = request.form['title'],
            description = request.form.get('description', ''),
            start_datetime = datetime.strptime(request.form['start_datetime'], '%Y-%m-%dT%H:%M'),
            end_datetime   = (datetime.strptime(request.form['end_datetime'], '%Y-%m-%dT%H:%M')
                              if request.form.get('end_datetime') else None),
            location    = request.form.get('location', ''),
            is_online   = 'is_online' in request.form,
            is_free     = 'is_free'   in request.form,
            category_id = request.form.get('category_id', type=int),
            meme_url    = request.form.get('meme_url', '') or None,
            recurrence  = request.form.get('recurrence', 'none'),
            recurrence_end_date = (datetime.strptime(rec_end_raw, '%Y-%m-%d')
                                   if rec_end_raw else None),
        )
        db.session.add(event)
        db.session.commit()
        return redirect(url_for('main.admin_events'))

    return render_template('admin/event_form.html',
                           categories=categories, event=None,
                           preset_memes=PRESET_MEMES,
                           recurrence_options=RECURRENCE_LABELS)


@bp.route('/admin/events/<int:event_id>', methods=['GET', 'POST'])
@admin_required
def admin_event_edit(event_id):
    event      = Event.query.get_or_404(event_id)
    categories = EventCategory.query.all()

    if request.method == 'POST':
        rec_end_raw = request.form.get('recurrence_end_date')
        event.title       = request.form['title']
        event.description = request.form.get('description', '')
        event.start_datetime = datetime.strptime(request.form['start_datetime'], '%Y-%m-%dT%H:%M')
        event.end_datetime   = (datetime.strptime(request.form['end_datetime'], '%Y-%m-%dT%H:%M')
                                if request.form.get('end_datetime') else None)
        event.location    = request.form.get('location', '')
        event.is_online   = 'is_online' in request.form
        event.is_free     = 'is_free'   in request.form
        event.category_id = request.form.get('category_id', type=int)
        event.meme_url    = request.form.get('meme_url', '') or None
        event.recurrence  = request.form.get('recurrence', 'none')
        event.recurrence_end_date = (datetime.strptime(rec_end_raw, '%Y-%m-%d')
                                     if rec_end_raw else None)
        db.session.commit()
        return redirect(url_for('main.admin_events'))

    return render_template('admin/event_form.html',
                           categories=categories, event=event,
                           preset_memes=PRESET_MEMES,
                           recurrence_options=RECURRENCE_LABELS)


@bp.route('/admin/events/<int:event_id>/delete', methods=['POST'])
@admin_required
def admin_event_delete(event_id):
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    return redirect(url_for('main.admin_events'))
