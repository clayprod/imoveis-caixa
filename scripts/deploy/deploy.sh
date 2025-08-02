#!/bin/bash

# Imóveis Caixa Pro - Script de Deploy
# Executa deploy completo da aplicação

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
ENVIRONMENT=${1:-production}
PROJECT_DIR="/home/ubuntu/imoveis-caixa-final"
WEB_DIR="/var/www/imoveis-caixa"
BACKUP_DIR="/home/ubuntu/backups"
LOG_FILE="/var/log/imoveis-caixa/deploy.log"

# Função para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> $LOG_FILE
    exit 1
}

# Verificar se está no diretório correto
if [ ! -f "$PROJECT_DIR/README.md" ]; then
    error "Diretório do projeto não encontrado: $PROJECT_DIR"
fi

cd $PROJECT_DIR

log "🚀 Iniciando deploy para ambiente: $ENVIRONMENT"

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR
mkdir -p $(dirname $LOG_FILE)

# Função para rollback
rollback() {
    warn "🔄 Executando rollback..."
    
    if [ -f "$BACKUP_DIR/latest_backup.tar.gz" ]; then
        log "Restaurando backup anterior..."
        cd /home/ubuntu
        tar -xzf $BACKUP_DIR/latest_backup.tar.gz
        
        # Reiniciar serviços
        sudo systemctl restart imoveis-caixa-flask
        if systemctl is-enabled imoveis-caixa-laravel &> /dev/null; then
            sudo systemctl restart imoveis-caixa-laravel
        fi
        sudo systemctl reload nginx
        
        log "✅ Rollback concluído"
    else
        error "Backup não encontrado para rollback"
    fi
}

# Trap para executar rollback em caso de erro
trap 'rollback' ERR

# 1. Backup da versão atual
log "💾 Criando backup da versão atual..."
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf $BACKUP_FILE \
    --exclude=node_modules \
    --exclude=venv \
    --exclude=.git \
    --exclude=*.log \
    $PROJECT_DIR

# Manter link para último backup
ln -sf $BACKUP_FILE $BACKUP_DIR/latest_backup.tar.gz
log "✅ Backup criado: $BACKUP_FILE"

# 2. Atualizar código (se usando Git)
if [ -d ".git" ]; then
    log "📥 Atualizando código do repositório..."
    git fetch origin
    
    if [ "$ENVIRONMENT" = "production" ]; then
        git checkout production
        git pull origin production
    else
        git checkout main
        git pull origin main
    fi
    
    log "✅ Código atualizado"
fi

# 3. Verificar e instalar dependências do backend
log "🐍 Verificando dependências do backend..."
cd backend

# Ativar ambiente virtual
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# Instalar/atualizar dependências Python
pip install --upgrade pip
pip install -r requirements.txt

# Laravel (se existir)
if [ -f "composer.json" ]; then
    log "🐘 Atualizando dependências Laravel..."
    composer install --optimize-autoloader --no-dev
    
    # Executar migrações se for produção
    if [ "$ENVIRONMENT" = "production" ]; then
        php artisan migrate --force
    fi
    
    # Limpar e recriar cache
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
    php artisan cache:clear
    
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

cd ..

# 4. Build do frontend
log "⚛️ Fazendo build do frontend..."
cd frontend

# Verificar se Node.js está disponível
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado"
fi

# Instalar dependências
npm ci --production=false

# Configurar variáveis de ambiente para build
if [ "$ENVIRONMENT" = "production" ]; then
    export REACT_APP_API_URL="https://seu-dominio.com/api"
    export REACT_APP_ENVIRONMENT="production"
elif [ "$ENVIRONMENT" = "staging" ]; then
    export REACT_APP_API_URL="https://staging.seu-dominio.com/api"
    export REACT_APP_ENVIRONMENT="staging"
else
    export REACT_APP_API_URL="http://localhost:5000/api"
    export REACT_APP_ENVIRONMENT="development"
fi

# Build da aplicação
npm run build

# Verificar se build foi criado
if [ ! -d "dist" ]; then
    error "Build do frontend falhou - diretório dist não encontrado"
fi

cd ..

# 5. Deploy dos arquivos estáticos
log "📁 Fazendo deploy dos arquivos estáticos..."

# Criar diretório web se não existir
sudo mkdir -p $WEB_DIR

# Backup dos arquivos atuais
if [ -d "$WEB_DIR" ] && [ "$(ls -A $WEB_DIR)" ]; then
    sudo tar -czf $BACKUP_DIR/web_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C $WEB_DIR .
fi

# Copiar novos arquivos
sudo cp -r frontend/dist/* $WEB_DIR/
sudo chown -R www-data:www-data $WEB_DIR
sudo chmod -R 755 $WEB_DIR

log "✅ Arquivos estáticos deployados"

# 6. Atualizar configurações
log "⚙️ Atualizando configurações..."

# Nginx
if [ -f "config/nginx/imoveis-caixa.conf" ]; then
    sudo cp config/nginx/imoveis-caixa.conf /etc/nginx/sites-available/
    
    # Testar configuração
    if sudo nginx -t; then
        log "✅ Configuração Nginx válida"
    else
        error "Configuração Nginx inválida"
    fi
fi

# Systemd services
if [ -f "config/systemd/imoveis-caixa-flask.service" ]; then
    sudo cp config/systemd/imoveis-caixa-flask.service /etc/systemd/system/
    sudo systemctl daemon-reload
fi

if [ -f "config/systemd/imoveis-caixa-laravel.service" ]; then
    sudo cp config/systemd/imoveis-caixa-laravel.service /etc/systemd/system/
    sudo systemctl daemon-reload
fi

# 7. Reiniciar serviços
log "🔄 Reiniciando serviços..."

# Flask
if systemctl is-active imoveis-caixa-flask &> /dev/null; then
    sudo systemctl restart imoveis-caixa-flask
    log "✅ Serviço Flask reiniciado"
else
    sudo systemctl start imoveis-caixa-flask
    log "✅ Serviço Flask iniciado"
fi

# Laravel (se existir)
if systemctl is-enabled imoveis-caixa-laravel &> /dev/null; then
    if systemctl is-active imoveis-caixa-laravel &> /dev/null; then
        sudo systemctl restart imoveis-caixa-laravel
        log "✅ Serviço Laravel reiniciado"
    else
        sudo systemctl start imoveis-caixa-laravel
        log "✅ Serviço Laravel iniciado"
    fi
fi

# Nginx
sudo systemctl reload nginx
log "✅ Nginx recarregado"

# 8. Health checks
log "🏥 Executando health checks..."

# Aguardar serviços iniciarem
sleep 10

# Verificar Flask
if curl -f http://localhost:5000/api/analysis/health &> /dev/null; then
    log "✅ Flask API respondendo"
else
    warn "❌ Flask API não está respondendo"
fi

# Verificar Laravel (se existir)
if systemctl is-enabled imoveis-caixa-laravel &> /dev/null; then
    if curl -f http://localhost:8000/health &> /dev/null; then
        log "✅ Laravel respondendo"
    else
        warn "❌ Laravel não está respondendo"
    fi
fi

# Verificar Nginx
if curl -f http://localhost/health &> /dev/null; then
    log "✅ Nginx respondendo"
else
    warn "❌ Nginx não está respondendo"
fi

# Verificar HTTPS (se configurado)
if [ "$ENVIRONMENT" = "production" ]; then
    if curl -f https://localhost/health &> /dev/null; then
        log "✅ HTTPS funcionando"
    else
        warn "❌ HTTPS não está funcionando"
    fi
fi

# 9. Limpeza
log "🧹 Executando limpeza..."

# Limpar builds antigos do frontend
find frontend -name "dist" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

# Limpar logs antigos
find /var/log/imoveis-caixa -name "*.log" -mtime +30 -delete 2>/dev/null || true

# Limpar backups antigos (manter últimos 7)
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
find $BACKUP_DIR -name "web_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

# Limpar cache npm
npm cache clean --force &> /dev/null || true

log "✅ Limpeza concluída"

# 10. Notificações (se configurado)
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 Deploy concluído com sucesso no ambiente $ENVIRONMENT\"}" \
        $SLACK_WEBHOOK &> /dev/null || true
fi

# 11. Relatório final
log "📊 Gerando relatório de deploy..."

DEPLOY_REPORT="$BACKUP_DIR/deploy_report_$(date +%Y%m%d_%H%M%S).txt"
cat > $DEPLOY_REPORT << EOF
=== RELATÓRIO DE DEPLOY ===
Data: $(date)
Ambiente: $ENVIRONMENT
Usuário: $(whoami)
Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Branch: $(git branch --show-current 2>/dev/null || echo "N/A")

=== STATUS DOS SERVIÇOS ===
Flask: $(systemctl is-active imoveis-caixa-flask 2>/dev/null || echo "N/A")
Laravel: $(systemctl is-active imoveis-caixa-laravel 2>/dev/null || echo "N/A")
Nginx: $(systemctl is-active nginx 2>/dev/null || echo "N/A")
Redis: $(systemctl is-active redis-server 2>/dev/null || echo "N/A")

=== HEALTH CHECKS ===
Flask API: $(curl -f http://localhost:5000/api/analysis/health &> /dev/null && echo "OK" || echo "FAIL")
Nginx: $(curl -f http://localhost/health &> /dev/null && echo "OK" || echo "FAIL")

=== ARQUIVOS ===
Backup: $BACKUP_FILE
Web Directory: $WEB_DIR
Log File: $LOG_FILE

=== PRÓXIMOS PASSOS ===
1. Verificar aplicação no navegador
2. Monitorar logs por alguns minutos
3. Executar testes de fumaça se disponíveis
4. Notificar equipe sobre o deploy

EOF

log "📄 Relatório salvo em: $DEPLOY_REPORT"

# Desabilitar trap de rollback (deploy foi bem-sucedido)
trap - ERR

# Mensagem final
echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}      DEPLOY CONCLUÍDO COM SUCESSO!      ${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "${GREEN}Ambiente:${NC} $ENVIRONMENT"
echo -e "${GREEN}Data:${NC} $(date)"
echo -e "${GREEN}Backup:${NC} $BACKUP_FILE"
echo -e "${GREEN}Relatório:${NC} $DEPLOY_REPORT"
echo ""
echo -e "${GREEN}URLs para teste:${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "- Frontend: https://seu-dominio.com"
    echo "- API: https://seu-dominio.com/api/analysis/health"
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "- Frontend: https://staging.seu-dominio.com"
    echo "- API: https://staging.seu-dominio.com/api/analysis/health"
else
    echo "- Frontend: http://localhost"
    echo "- API: http://localhost:5000/api/analysis/health"
fi
echo ""
echo -e "${YELLOW}Comandos úteis:${NC}"
echo "- Ver logs Flask: sudo journalctl -u imoveis-caixa-flask -f"
echo "- Ver logs Nginx: sudo tail -f /var/log/nginx/imoveis-caixa-error.log"
echo "- Status serviços: sudo systemctl status imoveis-caixa-flask nginx"
echo "- Rollback: $0 rollback"
echo ""

log "🎉 Deploy finalizado com sucesso!"

# Executar testes de fumaça se existirem
if [ -f "tests/smoke-tests.sh" ]; then
    log "🧪 Executando testes de fumaça..."
    bash tests/smoke-tests.sh $ENVIRONMENT || warn "Alguns testes de fumaça falharam"
fi

exit 0

