from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Blueprint, current_app, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from src.models.user import User, db

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
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")
    username = data.get("username")

    missing_fields = [
        field for field in ["email", "password", "username"] if not data.get(field)
    ]
    if missing_fields:
        return (
            jsonify({"error": "Missing fields", "missing_fields": missing_fields}),
            400,
        )

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User already exists"}), 409

    hashed_password = generate_password_hash(password)
    new_user = User(email=email, username=username, password=hashed_password)

    db.session.add(new_user)
    db.session.commit()

    token = _generate_token(new_user.id)
    return jsonify({"token": token, "user": new_user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = _generate_token(user.id)
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/profile", methods=["GET", "PUT"])
@_token_required
def profile(current_user):
    if request.method == "GET":
        return jsonify(current_user.to_dict()), 200

    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")

    if not username and not email:
        return jsonify({"error": "No fields to update"}), 400

    if username:
        current_user.username = username
    if email:
        current_user.email = email

    db.session.commit()
    return jsonify(current_user.to_dict()), 200
