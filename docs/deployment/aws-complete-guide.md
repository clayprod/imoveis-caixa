# Guia Completo de Deploy na AWS

## 🎯 Visão Geral

Este guia fornece instruções passo-a-passo para fazer o deploy completo da plataforma **Imóveis Caixa Pro** na Amazon Web Services (AWS), desde a criação das instâncias até a configuração de monitoramento e backup.

## 📋 Pré-requisitos

### Conta AWS
- Conta AWS ativa com cartão de crédito válido
- Acesso ao console AWS
- AWS CLI instalado e configurado (opcional, mas recomendado)

### Conhecimentos Necessários
- Básico de Linux/Ubuntu
- Conceitos de redes (VPC, Security Groups)
- Básico de DNS
- Uso do FileZilla ou similar para FTP

### Ferramentas Locais
- FileZilla (para upload de arquivos)
- Terminal/CMD (para SSH)
- Editor de texto

## 🏗️ Arquitetura de Deploy

```
Internet
    ↓
CloudFront (CDN)
    ↓
Application Load Balancer
    ↓
EC2 Instances (Auto Scaling)
    ↓
RDS (MySQL/PostgreSQL)
    ↓
S3 (Storage) + ElastiCache (Redis)
```

## 📊 Estimativa de Custos

### Configuração Inicial (Recomendada)
- **EC2 t3.medium**: ~$30/mês
- **RDS db.t3.micro**: ~$15/mês  
- **S3**: ~$5/mês (100GB)
- **CloudFront**: ~$10/mês
- **Route 53**: ~$1/mês
- **Total Estimado**: ~$61/mês

### Configuração Escalável
- **EC2 t3.large (2x)**: ~$120/mês
- **RDS db.t3.small**: ~$30/mês
- **ElastiCache**: ~$15/mês
- **Total Estimado**: ~$180/mês

## 🚀 Passo 1: Configuração Inicial da AWS

### 1.1 Criar VPC (Virtual Private Cloud)

1. Acesse o console AWS → VPC
2. Clique em "Create VPC"
3. Configure:
   - **Name**: `imoveis-caixa-vpc`
   - **IPv4 CIDR**: `10.0.0.0/16`
   - **IPv6 CIDR**: Não
   - **Tenancy**: Default

### 1.2 Criar Subnets

**Subnet Pública (Web Servers):**
- **Name**: `imoveis-caixa-public-1a`
- **VPC**: Selecione a VPC criada
- **Availability Zone**: us-east-1a
- **IPv4 CIDR**: `10.0.1.0/24`

**Subnet Privada (Database):**
- **Name**: `imoveis-caixa-private-1a`
- **Availability Zone**: us-east-1a
- **IPv4 CIDR**: `10.0.2.0/24`

**Subnet Privada (Database - Segunda AZ):**
- **Name**: `imoveis-caixa-private-1b`
- **Availability Zone**: us-east-1b
- **IPv4 CIDR**: `10.0.3.0/24`

### 1.3 Configurar Internet Gateway

1. VPC → Internet Gateways → Create
2. **Name**: `imoveis-caixa-igw`
3. Attach à VPC criada

### 1.4 Configurar Route Tables

**Route Table Pública:**
1. VPC → Route Tables → Create
2. **Name**: `imoveis-caixa-public-rt`
3. Adicionar rota: `0.0.0.0/0` → Internet Gateway
4. Associar à subnet pública

## 🖥️ Passo 2: Criar Instância EC2

### 2.1 Lançar Instância

1. EC2 → Launch Instance
2. **Name**: `imoveis-caixa-server`
3. **AMI**: Ubuntu Server 22.04 LTS
4. **Instance Type**: t3.medium (2 vCPU, 4 GB RAM)
5. **Key Pair**: Criar nova ou usar existente
6. **Network Settings**:
   - VPC: Selecionar VPC criada
   - Subnet: Subnet pública
   - Auto-assign Public IP: Enable
   - Security Group: Criar novo

### 2.2 Configurar Security Group

**Security Group: `imoveis-caixa-sg`**

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|---------|-------------|
| SSH | TCP | 22 | Seu IP | SSH Access |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS |
| Custom TCP | TCP | 5000 | 0.0.0.0/0 | Flask API |
| Custom TCP | TCP | 8000 | 0.0.0.0/0 | Laravel |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | React Dev |

### 2.3 Configurar Storage

- **Root Volume**: 30 GB gp3
- **Additional Volume** (opcional): 50 GB gp3 para dados

## 🗄️ Passo 3: Configurar RDS (Banco de Dados)

### 3.1 Criar DB Subnet Group

1. RDS → Subnet Groups → Create
2. **Name**: `imoveis-caixa-db-subnet-group`
3. **VPC**: Selecionar VPC criada
4. **Subnets**: Selecionar ambas subnets privadas

### 3.2 Criar RDS Instance

1. RDS → Create Database
2. **Engine**: MySQL 8.0
3. **Template**: Production (ou Dev/Test para economia)
4. **DB Instance Identifier**: `imoveis-caixa-db`
5. **Master Username**: `admin`
6. **Master Password**: Gerar senha segura
7. **Instance Class**: db.t3.micro (ou db.t3.small)
8. **Storage**: 20 GB gp2
9. **VPC**: Selecionar VPC criada
10. **Subnet Group**: Selecionar grupo criado
11. **Security Group**: Criar novo

### 3.3 Security Group do RDS

**Security Group: `imoveis-caixa-db-sg`**

| Type | Protocol | Port | Source | Description |
|------|----------|------|---------|-------------|
| MySQL/Aurora | TCP | 3306 | imoveis-caixa-sg | Database Access |

## 📦 Passo 4: Configurar S3 (Armazenamento)

### 4.1 Criar Bucket S3

1. S3 → Create Bucket
2. **Name**: `imoveis-caixa-storage-[random]`
3. **Region**: us-east-1
4. **Block Public Access**: Desmarcar se necessário
5. **Versioning**: Enable
6. **Encryption**: Enable

### 4.2 Configurar CORS

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

## 🔑 Passo 5: Configurar IAM (Permissões)

### 5.1 Criar IAM Role para EC2

1. IAM → Roles → Create Role
2. **Service**: EC2
3. **Policies**:
   - `AmazonS3FullAccess`
   - `AmazonBedrockFullAccess`
   - `CloudWatchAgentServerPolicy`

### 5.2 Criar IAM User para Deploy

1. IAM → Users → Create User
2. **Name**: `imoveis-caixa-deploy`
3. **Policies**:
   - `AmazonEC2FullAccess`
   - `AmazonS3FullAccess`
   - Criar Access Keys

## 🔧 Passo 6: Configurar Servidor EC2

### 6.1 Conectar via SSH

```bash
# Substituir pela sua chave e IP público
ssh -i "sua-chave.pem" ubuntu@ec2-xx-xx-xx-xx.compute-1.amazonaws.com
```

### 6.2 Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip
```

### 6.3 Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 6.4 Instalar Python

```bash
sudo apt install -y python3 python3-pip python3-venv
```

### 6.5 Instalar PHP e Composer

```bash
sudo apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-mysql php8.1-xml php8.1-curl php8.1-mbstring php8.1-zip
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### 6.6 Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 6.7 Instalar MySQL Client

```bash
sudo apt install -y mysql-client
```

## 📁 Passo 7: Upload dos Arquivos via FileZilla

### 7.1 Configurar FileZilla

1. Abrir FileZilla
2. **Host**: IP público da EC2
3. **Protocol**: SFTP
4. **Logon Type**: Key file
5. **User**: ubuntu
6. **Key file**: Sua chave .pem

### 7.2 Estrutura de Upload

Fazer upload da pasta `imoveis-caixa-final` para `/home/ubuntu/`:

```
/home/ubuntu/imoveis-caixa-final/
├── backend/
├── frontend/
├── docs/
├── scripts/
└── config/
```

## ⚙️ Passo 8: Configurar Aplicação

### 8.1 Executar Script de Setup

```bash
cd /home/ubuntu/imoveis-caixa-final
chmod +x scripts/setup/install.sh
./scripts/setup/install.sh
```

### 8.2 Configurar Variáveis de Ambiente

```bash
# Backend Flask
cd backend
cp .env.example .env
nano .env
```

**Configurar .env:**
```env
# Database
DB_HOST=seu-rds-endpoint.amazonaws.com
DB_NAME=imoveis_caixa
DB_USER=admin
DB_PASSWORD=sua-senha-rds

# AWS
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=seu-bucket-s3

# APIs
GOOGLE_MAPS_API_KEY=sua-chave-google-maps
OPENAI_API_KEY=sua-chave-openai

# App
APP_ENV=production
APP_DEBUG=false
APP_URL=https://seu-dominio.com
```

### 8.3 Configurar Frontend

```bash
cd ../frontend
cp .env.example .env.local
nano .env.local
```

**Configurar .env.local:**
```env
REACT_APP_API_URL=https://seu-dominio.com/api
REACT_APP_ENVIRONMENT=production
```

## 🔄 Passo 9: Build e Deploy

### 9.1 Build do Frontend

```bash
cd frontend
npm install
npm run build
```

### 9.2 Configurar Backend

```bash
cd ../backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Laravel
composer install --optimize-autoloader --no-dev
php artisan key:generate
php artisan migrate
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 9.3 Configurar Nginx

```bash
sudo cp config/nginx/imoveis-caixa.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/imoveis-caixa.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Passo 10: Configurar SSL (Let's Encrypt)

### 10.1 Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 10.2 Obter Certificado

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 10.3 Configurar Renovação Automática

```bash
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🌐 Passo 11: Configurar Domínio (Route 53)

### 11.1 Criar Hosted Zone

1. Route 53 → Hosted Zones → Create
2. **Domain Name**: seu-dominio.com
3. **Type**: Public Hosted Zone

### 11.2 Configurar Records

**Tipo A:**
- **Name**: seu-dominio.com
- **Value**: IP público da EC2

**Tipo A:**
- **Name**: www.seu-dominio.com  
- **Value**: IP público da EC2

### 11.3 Atualizar Nameservers

Configurar os nameservers no seu registrador de domínio com os NS records do Route 53.

## 📊 Passo 12: Configurar Monitoramento

### 12.1 CloudWatch

1. CloudWatch → Dashboards → Create
2. Adicionar métricas:
   - CPU Utilization
   - Memory Usage
   - Disk Usage
   - Network In/Out

### 12.2 Configurar Alarmes

```bash
# CPU > 80%
aws cloudwatch put-metric-alarm \
  --alarm-name "High-CPU-Usage" \
  --alarm-description "CPU usage > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## 🔄 Passo 13: Configurar Backup

### 13.1 Snapshot Automático EC2

```bash
# Script de backup
#!/bin/bash
INSTANCE_ID="i-1234567890abcdef0"
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "Daily backup $(date)"
```

### 13.2 Backup RDS

1. RDS → Automated Backups
2. **Backup Retention**: 7 dias
3. **Backup Window**: 03:00-04:00 UTC

## 🚀 Passo 14: Configurar CI/CD (GitHub Actions)

### 14.1 Configurar Secrets no GitHub

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
EC2_HOST
EC2_USERNAME
EC2_SSH_KEY
```

### 14.2 Workflow de Deploy

O arquivo `.github/workflows/deploy.yml` já está configurado no projeto.

## 🧪 Passo 15: Testes Finais

### 15.1 Testar Aplicação

1. Acessar `https://seu-dominio.com`
2. Testar login/registro
3. Testar funcionalidades principais
4. Verificar APIs
5. Testar responsividade

### 15.2 Testes de Performance

```bash
# Instalar ferramentas de teste
sudo apt install -y apache2-utils

# Teste de carga
ab -n 1000 -c 10 https://seu-dominio.com/
```

## 🔧 Troubleshooting

### Problemas Comuns

**Erro 502 Bad Gateway:**
- Verificar se os serviços estão rodando
- Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`

**Erro de Conexão com Banco:**
- Verificar Security Groups
- Testar conexão: `mysql -h endpoint -u admin -p`

**Erro de Permissões:**
- Verificar IAM roles
- Verificar permissões de arquivos: `sudo chown -R www-data:www-data /path/to/app`

### Logs Importantes

```bash
# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Laravel
tail -f backend/storage/logs/laravel.log

# Flask
tail -f backend/logs/flask.log

# Sistema
sudo journalctl -u nginx -f
```

## 📈 Otimizações de Performance

### 13.1 Configurar Redis (ElastiCache)

1. ElastiCache → Create → Redis
2. **Name**: `imoveis-caixa-redis`
3. **Node Type**: cache.t3.micro
4. **Subnet Group**: Criar novo com subnets privadas

### 13.2 Configurar CloudFront (CDN)

1. CloudFront → Create Distribution
2. **Origin Domain**: seu-dominio.com
3. **Viewer Protocol Policy**: Redirect HTTP to HTTPS
4. **Caching**: Optimized for performance

## 💰 Otimização de Custos

### Estratégias de Economia

1. **Reserved Instances**: Economize até 75% com compromisso de 1-3 anos
2. **Spot Instances**: Para workloads não críticos
3. **Auto Scaling**: Ajuste automático baseado na demanda
4. **S3 Intelligent Tiering**: Movimentação automática entre classes de storage
5. **CloudWatch**: Monitore custos e configure alertas

### Monitoramento de Custos

1. AWS Cost Explorer → Create Budget
2. **Budget Type**: Cost Budget
3. **Amount**: $100/mês (ajustar conforme necessário)
4. **Alerts**: 80% e 100% do orçamento

## 🎯 Próximos Passos

### Melhorias Recomendadas

1. **Load Balancer**: Para alta disponibilidade
2. **Auto Scaling**: Para escalabilidade automática
3. **Multi-AZ**: Para redundância
4. **WAF**: Para segurança adicional
5. **API Gateway**: Para gerenciamento de APIs

### Expansão

1. **Ambiente de Staging**: Para testes
2. **Múltiplas Regiões**: Para latência reduzida
3. **Microserviços**: Para escalabilidade
4. **Kubernetes**: Para orquestração avançada

## 📞 Suporte

Se encontrar problemas durante o deploy:

1. Verifique os logs detalhados
2. Consulte a documentação AWS
3. Entre em contato: suporte@imoveiscaixapro.com.br

---

**🎉 Parabéns! Sua plataforma Imóveis Caixa Pro está agora rodando na AWS!**

Lembre-se de:
- Monitorar custos regularmente
- Fazer backups frequentes
- Manter o sistema atualizado
- Monitorar performance e segurança

