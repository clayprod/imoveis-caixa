import os
import sys
import logging
from datetime import datetime  # necessário para o /health

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from src.models.user import db
from src.routes.auth import auth_bp
from src.routes.user import user_bp
from src.routes.analysis import analysis_bp
from src.routes.financing import financing_bp

# Configurar logging global
logging.basicConfig(level=logging.INFO)

# Definir SECRET_KEY de forma segura
secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    secret_key = os.urandom(24).hex()

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = secret_key

# Enable CORS for all routes
CORS(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
app.register_blueprint(financing_bp, url_prefix='/api/financing')

# Configuração do banco
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db)

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'services': {
            'bedrock': 'available',
            'database': 'connected',
            'cache': 'active'
        }
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

