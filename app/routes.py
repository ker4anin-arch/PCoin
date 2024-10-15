from flask import Blueprint, render_template

bp = Blueprint('main', __name__, template_folder='../templates')

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/skills')
def skills():
    return render_template('skills.html')

@bp.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@bp.route('/airdrop')
def airdrop():
    return render_template('airdrop.html')
