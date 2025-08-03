from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Blueprint, current_app, jsonify, request

from src.models.user import User, db

auth_bp = Blueprint('auth', __name__)


def token_required(f):
    """Decorator that ensures a valid JWT is provided."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=["HS256"]
            )
            current_user = User.query.get(data['id'])
            if current_user is None:
                raise Exception('User not found')
        except Exception:
            return jsonify({'message': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)

    return decorated


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    if not username or not email or not password:
        return jsonify({'message': 'Missing required fields'}), 400
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'message': 'User already exists'}), 400
    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = jwt.encode(
        {'id': user.id, 'exp': datetime.utcnow() + timedelta(days=7)},
        current_app.config['SECRET_KEY'],
        algorithm="HS256"
    )
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'message': 'Missing credentials'}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401
    token = jwt.encode(
        {'id': user.id, 'exp': datetime.utcnow() + timedelta(days=7)},
        current_app.config['SECRET_KEY'],
        algorithm="HS256"
    )
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({'user': current_user.to_dict()})


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    if username:
        if User.query.filter(User.username == username, User.id != current_user.id).first():
            return jsonify({'message': 'Username already taken'}), 400
        current_user.username = username
    if email:
        if User.query.filter(User.email == email, User.id != current_user.id).first():
            return jsonify({'message': 'Email already in use'}), 400
        current_user.email = email
    db.session.commit()
    return jsonify({'user': current_user.to_dict()})


# Optional endpoint used by frontend to validate token
@auth_bp.route('/me', methods=['GET'])
@token_required
def me(current_user):
    return jsonify({'user': current_user.to_dict()})
