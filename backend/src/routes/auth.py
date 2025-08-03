from datetime import datetime, timedelta
import logging
import jwt
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from src.models.user import db, User

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/auth/health', methods=['GET'])
def auth_health():
    return {'status': 'ok'}


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}

        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username, email and password are required'}), 400

        if User.query.filter_by(email=data['email']).first() or User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'User already exists'}), 409

        hashed_password = generate_password_hash(data['password'])
        new_user = User(username=data['username'], email=data['email'], password=hashed_password)

        db.session.add(new_user)
        db.session.commit()

        token = jwt.encode(
            {'user_id': new_user.id, 'exp': datetime.utcnow() + timedelta(hours=1)},
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({'token': token, 'user': new_user.to_dict()}), 201
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}

        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username, email and password are required'}), 400

        user = User.query.filter_by(email=data['email'], username=data['username']).first()

        if not user or not check_password_hash(user.password, data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401

        token = jwt.encode(
            {'user_id': user.id, 'exp': datetime.utcnow() + timedelta(hours=1)},
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({'token': token, 'user': user.to_dict()}), 200
    except Exception as e:
        logger.error(f"Error during login: {e}")
        return jsonify({'error': 'Internal server error'}), 500
