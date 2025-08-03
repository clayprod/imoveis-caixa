from flask import Blueprint

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/auth/health', methods=['GET'])
def auth_health():
    return {'status': 'ok'}
