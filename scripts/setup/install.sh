#!/bin/bash

# Imóveis Caixa Pro - Script de Instalação Automatizada
# Este script configura automaticamente o ambiente de produção na AWS

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como usuário correto
if [ "$EUID" -eq 0 ]; then
    error "Este script não deve ser executado como root. Use o usuário ubuntu."
fi

log "🚀 Iniciando instalação da plataforma Imóveis Caixa Pro..."

# Verificar se estamos no diretório correto
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error "Execute este script a partir do diretório raiz do projeto (imoveis-caixa-final)"
fi

# Atualizar sistema
log "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
log "🔧 Instalando dependências básicas..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Instalar Node.js 18
log "📦 Instalando Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log "✅ Node.js $(node --version) instalado"
else
    log "✅ Node.js já está instalado: $(node --version)"
fi

# Instalar Python 3.11
log "🐍 Configurando Python..."
sudo apt install -y python3 python3-pip python3-venv python3-dev
if ! command -v python3.11 &> /dev/null; then
    sudo add-apt-repository ppa:deadsnakes/ppa -y
    sudo apt update
    sudo apt install -y python3.11 python3.11-venv python3.11-dev
fi

# Instalar PHP 8.1 e extensões
log "🐘 Instalando PHP 8.1..."
if ! command -v php &> /dev/null; then
    sudo apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-mysql php8.1-xml php8.1-curl php8.1-mbstring php8.1-zip php8.1-gd php8.1-intl php8.1-bcmath
    log "✅ PHP $(php --version | head -n1) instalado"
else
    log "✅ PHP já está instalado: $(php --version | head -n1)"
fi

# Instalar Composer
log "🎼 Instalando Composer..."
if ! command -v composer &> /dev/null; then
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    sudo chmod +x /usr/local/bin/composer
    log "✅ Composer $(composer --version) instalado"
else
    log "✅ Composer já está instalado: $(composer --version)"
fi

# Instalar Nginx
log "🌐 Instalando Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    log "✅ Nginx instalado e iniciado"
else
    log "✅ Nginx já está instalado"
fi

# Instalar MySQL Client
log "🗄️ Instalando MySQL Client..."
sudo apt install -y mysql-client

# Instalar Redis (opcional)
log "🔴 Instalando Redis..."
if ! command -v redis-cli &> /dev/null; then
    sudo apt install -y redis-server
    sudo systemctl enable redis-server
    sudo systemctl start redis-server
    log "✅ Redis instalado e iniciado"
else
    log "✅ Redis já está instalado"
fi

# Configurar firewall
log "🔒 Configurando firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # React dev
sudo ufw allow 5000  # Flask
sudo ufw allow 8000  # Laravel
log "✅ Firewall configurado"

# Configurar diretórios
log "📁 Configurando diretórios..."
sudo mkdir -p /var/www/imoveis-caixa
sudo mkdir -p /var/log/imoveis-caixa
sudo chown -R $USER:$USER /var/www/imoveis-caixa
sudo chown -R $USER:$USER /var/log/imoveis-caixa

# Configurar backend Flask
log "🔧 Configurando backend Flask..."
cd backend

# Criar ambiente virtual Python
if [ ! -d "venv" ]; then
    python3 -m venv venv
    log "✅ Ambiente virtual Python criado"
fi

# Ativar ambiente virtual e instalar dependências
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
log "✅ Dependências Python instaladas"

# Configurar Laravel (se existir)
if [ -f "composer.json" ]; then
    log "🔧 Configurando Laravel..."
    composer install --optimize-autoloader --no-dev
    
    # Configurar .env se não existir
    if [ ! -f ".env" ]; then
        cp .env.example .env
        php artisan key:generate
        warn "Configure o arquivo .env com suas credenciais antes de continuar"
    fi
    
    log "✅ Laravel configurado"
fi

cd ..

# Configurar frontend React
log "⚛️ Configurando frontend React..."
cd frontend

# Instalar dependências
npm install
log "✅ Dependências Node.js instaladas"

# Configurar .env se não existir
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    warn "Configure o arquivo .env.local com suas configurações antes do build"
fi

cd ..

# Configurar Nginx
log "🌐 Configurando Nginx..."
if [ -f "config/nginx/imoveis-caixa.conf" ]; then
    sudo cp config/nginx/imoveis-caixa.conf /etc/nginx/sites-available/
    sudo ln -sf /etc/nginx/sites-available/imoveis-caixa.conf /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log "✅ Nginx configurado e recarregado"
    else
        error "Erro na configuração do Nginx"
    fi
else
    warn "Arquivo de configuração do Nginx não encontrado"
fi

# Configurar serviços systemd
log "⚙️ Configurando serviços systemd..."

# Serviço Flask
if [ -f "config/systemd/imoveis-caixa-flask.service" ]; then
    sudo cp config/systemd/imoveis-caixa-flask.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable imoveis-caixa-flask
    log "✅ Serviço Flask configurado"
fi

# Serviço Laravel (se existir)
if [ -f "config/systemd/imoveis-caixa-laravel.service" ]; then
    sudo cp config/systemd/imoveis-caixa-laravel.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable imoveis-caixa-laravel
    log "✅ Serviço Laravel configurado"
fi

# Configurar cron jobs
log "⏰ Configurando cron jobs..."
if [ -f "config/cron/imoveis-caixa-cron" ]; then
    sudo cp config/cron/imoveis-caixa-cron /etc/cron.d/
    sudo chmod 644 /etc/cron.d/imoveis-caixa-cron
    log "✅ Cron jobs configurados"
fi

# Configurar logrotate
log "📋 Configurando logrotate..."
if [ -f "config/logrotate/imoveis-caixa" ]; then
    sudo cp config/logrotate/imoveis-caixa /etc/logrotate.d/
    log "✅ Logrotate configurado"
fi

# Criar script de deploy
log "🚀 Criando script de deploy..."
cat > deploy.sh << 'EOF'
#!/bin/bash

# Script de deploy da aplicação
set -e

log() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

log "🚀 Iniciando deploy..."

# Build do frontend
log "⚛️ Fazendo build do frontend..."
cd frontend
npm run build
cd ..

# Copiar build para diretório web
sudo cp -r frontend/dist/* /var/www/imoveis-caixa/
sudo chown -R www-data:www-data /var/www/imoveis-caixa

# Reiniciar serviços
log "🔄 Reiniciando serviços..."
sudo systemctl restart imoveis-caixa-flask
if systemctl is-enabled imoveis-caixa-laravel &> /dev/null; then
    sudo systemctl restart imoveis-caixa-laravel
fi
sudo systemctl reload nginx

log "✅ Deploy concluído!"
EOF

chmod +x deploy.sh
log "✅ Script de deploy criado"

# Criar script de backup
log "💾 Criando script de backup..."
cat > backup.sh << 'EOF'
#!/bin/bash

# Script de backup da aplicação
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup do código
tar -czf $BACKUP_DIR/code_$DATE.tar.gz --exclude=node_modules --exclude=venv --exclude=vendor .

# Backup do banco (se configurado)
if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_NAME" ]; then
    mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/database_$DATE.sql
fi

# Manter apenas os últimos 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup concluído: $BACKUP_DIR"
EOF

chmod +x backup.sh
log "✅ Script de backup criado"

# Configurar monitoramento básico
log "📊 Configurando monitoramento básico..."
if ! command -v htop &> /dev/null; then
    sudo apt install -y htop iotop nethogs
fi

# Instalar AWS CLI (se não estiver instalado)
if ! command -v aws &> /dev/null; then
    log "☁️ Instalando AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    log "✅ AWS CLI instalado"
fi

# Configurar SSL (Let's Encrypt)
log "🔒 Preparando configuração SSL..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    log "✅ Certbot instalado"
fi

# Criar arquivo de status
cat > installation_status.txt << EOF
Instalação concluída em: $(date)
Status: Sucesso

Próximos passos:
1. Configure os arquivos .env no backend e frontend
2. Configure o banco de dados RDS
3. Execute o build do frontend: cd frontend && npm run build
4. Execute o deploy: ./deploy.sh
5. Configure SSL: sudo certbot --nginx -d seu-dominio.com
6. Teste a aplicação

Comandos úteis:
- Ver logs Flask: sudo journalctl -u imoveis-caixa-flask -f
- Ver logs Nginx: sudo tail -f /var/log/nginx/error.log
- Reiniciar serviços: sudo systemctl restart imoveis-caixa-flask nginx
- Status dos serviços: sudo systemctl status imoveis-caixa-flask nginx

Arquivos importantes:
- Configuração Nginx: /etc/nginx/sites-available/imoveis-caixa.conf
- Logs da aplicação: /var/log/imoveis-caixa/
- Diretório web: /var/www/imoveis-caixa/
EOF

log "📄 Status da instalação salvo em installation_status.txt"

# Verificar serviços
log "🔍 Verificando serviços..."
echo "Status dos serviços:"
sudo systemctl is-active nginx && echo "✅ Nginx: Ativo" || echo "❌ Nginx: Inativo"
sudo systemctl is-active redis-server && echo "✅ Redis: Ativo" || echo "❌ Redis: Inativo"

# Mostrar informações finais
log "🎉 Instalação concluída com sucesso!"
echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}    INSTALAÇÃO CONCLUÍDA COM SUCESSO!    ${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "${GREEN}Próximos passos:${NC}"
echo "1. Configure os arquivos .env:"
echo "   - backend/.env (banco de dados, APIs, etc.)"
echo "   - frontend/.env.local (URL da API)"
echo ""
echo "2. Execute o primeiro deploy:"
echo "   ./deploy.sh"
echo ""
echo "3. Configure SSL para seu domínio:"
echo "   sudo certbot --nginx -d seu-dominio.com"
echo ""
echo "4. Teste a aplicação no navegador"
echo ""
echo -e "${GREEN}Comandos úteis:${NC}"
echo "- Ver logs: sudo journalctl -u imoveis-caixa-flask -f"
echo "- Reiniciar: sudo systemctl restart imoveis-caixa-flask"
echo "- Status: sudo systemctl status imoveis-caixa-flask"
echo ""
echo -e "${YELLOW}Documentação completa em: docs/deployment/aws-complete-guide.md${NC}"
echo ""

log "✨ Instalação finalizada! Boa sorte com seu projeto!"

