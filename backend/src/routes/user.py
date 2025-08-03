from flask import Blueprint, jsonify, request
import logging
import traceback
from src.models.user import User, db

logger = logging.getLogger(__name__)

ERROR_MESSAGES = {
    'MISSING_FIELDS': 'Campos obrigatórios ausentes',
    'USERNAME_EXISTS': 'Nome de usuário já existe',
    'EMAIL_EXISTS': 'Email já cadastrado',
    'INTERNAL_ERROR': 'Erro interno do servidor'
}

user_bp = Blueprint('user', __name__)


@user_bp.route('/users', methods=['GET'])
def get_users():
    try:
        users = User.query.all()
        return jsonify([user.to_dict() for user in users])
    except Exception as e:
        logger.error(f"Erro ao listar usuários: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': ERROR_MESSAGES['INTERNAL_ERROR'], 'message': str(e)}), 500


@user_bp.route('/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json() or {}
        username = data.get('username')
        email = data.get('email')

        missing_fields = [field for field in ['username', 'email'] if not data.get(field)]
        if missing_fields:
            return jsonify({'error': ERROR_MESSAGES['MISSING_FIELDS'], 'missing_fields': missing_fields}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'error': ERROR_MESSAGES['USERNAME_EXISTS']}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': ERROR_MESSAGES['EMAIL_EXISTS']}), 400

        user = User(username=username, email=email)
        db.session.add(user)
        db.session.commit()
        return jsonify(user.to_dict()), 201
    except Exception as e:
        logger.error(f"Erro ao criar usuário: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': ERROR_MESSAGES['INTERNAL_ERROR'], 'message': str(e)}), 500


@user_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        return jsonify(user.to_dict())
    except Exception as e:
        logger.error(f"Erro ao obter usuário {user_id}: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': ERROR_MESSAGES['INTERNAL_ERROR'], 'message': str(e)}), 500


@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json() or {}
        username = data.get('username')
        email = data.get('email')

        missing_fields = [field for field in ['username', 'email'] if not data.get(field)]
        if missing_fields:
            return jsonify({'error': ERROR_MESSAGES['MISSING_FIELDS'], 'missing_fields': missing_fields}), 400

        if username != user.username and User.query.filter(User.username == username, User.id != user_id).first():
            return jsonify({'error': ERROR_MESSAGES['USERNAME_EXISTS']}), 400

        if email != user.email and User.query.filter(User.email == email, User.id != user_id).first():
            return jsonify({'error': ERROR_MESSAGES['EMAIL_EXISTS']}), 400

        user.username = username
        user.email = email
        db.session.commit()
        return jsonify(user.to_dict())
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário {user_id}: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': ERROR_MESSAGES['INTERNAL_ERROR'], 'message': str(e)}), 500


@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        return '', 204
    except Exception as e:
        logger.error(f"Erro ao deletar usuário {user_id}: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': ERROR_MESSAGES['INTERNAL_ERROR'], 'message': str(e)}), 500
