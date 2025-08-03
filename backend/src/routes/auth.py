from datetime import datetime, timedelta

import logging

import jwt
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from src.models.user import db, User


logger = logging.getLogger(__name__)


auth_bp = Blueprint('auth', __name__)


def _generate_token(user_id: int, expires_in: int = 3600) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def _token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Token is missing"}), 401
        token = parts[1]
        try:
            data = jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
            current_user = User.query.get(data.get("user_id"))
            if not current_user:
                raise ValueError("User not found")
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(current_user, *args, **kwargs)

    return decorated


@auth_bp.route("/auth/health", methods=["GET"])
def auth_health():
    return {"status": "ok"}


@auth_bp.route("/register", methods=["POST"])
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


@auth_bp.route("/login", methods=["POST"])
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

