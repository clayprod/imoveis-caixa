import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv

# Garantir que a raiz do projeto esteja no path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 🟢 Carregar variáveis do .env (ex: API keys, configs)
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.middleware.proxy_fix import ProxyFix  # ✅ Importante

from src.models.user import db
from src.routes.auth import auth_bp
from src.routes.user import user_bp
from src.routes.analysis import analysis_bp
from src.routes.financing import financing_bp

# 📝 Logging básico
logging.basicConfig(level=logging.INFO)

# 🔐 Configurar a chave secreta do Flask
secret_key = os.environ.get("SECRET_KEY") or os.urandom(24).hex()

# 🚀 Inicialização do app Flask
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = secret_key

# 🔁 Trocar SQLite por PostgreSQL (lendo do .env)
# Exemplo: postgresql://imoveisuser:senhaSegura123@localhost:5432/imoveisdb
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise ValueError("DATABASE_URL não definido no .env")
app.config["SQLALCHEMY_DATABASE_URI"] = database_url

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ✅ Corrigir problema de "Bad Request" com host externo
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

# 🛠 Extensões
CORS(app)
db.init_app(app)
migrate = Migrate(app, db)

# 🔗 Blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
app.register_blueprint(financing_bp, url_prefix='/api/financing')

# ✅ Health Check
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

# 🌐 Rota para servir arquivos estáticos (ex: React build)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if not static_folder_path:
        return "Static folder not configured", 404

    file_path = os.path.join(static_folder_path, path)
    if path != "" and os.path.exists(file_path):
        return send_from_directory(static_folder_path, path)
    
    index_path = os.path.join(static_folder_path, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(static_folder_path, 'index.html')
    
    return "index.html not found", 404

# 🔁 Rodar o servidor
if __name__ == '__main__':
    print("Iniciando Flask em modo desenvolvimento...")
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
