# 🚀 Guia Rápido de Deploy - Imóveis Caixa Pro

## ⚡ Deploy Rápido (5 minutos)

### 1. Upload via FileZilla
1. Conecte no seu servidor EC2 via SFTP
2. Faça upload da pasta `imoveis-caixa-final` para `/home/ubuntu/`

### 2. Executar Instalação
```bash
cd /home/ubuntu/imoveis-caixa-final
chmod +x scripts/setup/install.sh
./scripts/setup/install.sh
```

### 3. Configurar Variáveis
```bash
# Backend
cd backend
cp .env.example .env
nano .env  # Configure suas credenciais

# Frontend  
cd ../frontend
cp .env.example .env.local
nano .env.local  # Configure URL da API
```

### 4. Primeiro Deploy
```bash
cd /home/ubuntu/imoveis-caixa-final
./scripts/deploy/deploy.sh
```

### 5. Configurar SSL
```bash
sudo certbot --nginx -d seu-dominio.com
```

## 🎯 Pronto! Sua plataforma está no ar!

---

## 📋 Checklist Completo

### ☁️ AWS Setup
- [ ] Instância EC2 criada (t3.medium)
- [ ] RDS MySQL configurado
- [ ] S3 Bucket criado
- [ ] Security Groups configurados
- [ ] Elastic IP associado

### 🔧 Servidor Setup  
- [ ] SSH funcionando
- [ ] Arquivos uploadados via FileZilla
- [ ] Script de instalação executado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy inicial executado

### 🌐 Domínio & SSL
- [ ] Domínio apontando para IP da EC2
- [ ] SSL configurado com Let's Encrypt
- [ ] HTTPS funcionando

### ✅ Testes Finais
- [ ] Frontend carregando
- [ ] API respondendo
- [ ] Login funcionando
- [ ] Análise de IA funcionando

---

## 🔧 Comandos Úteis

### Status dos Serviços
```bash
sudo systemctl status imoveis-caixa-flask
sudo systemctl status nginx
sudo systemctl status redis-server
```

### Ver Logs
```bash
# Flask API
sudo journalctl -u imoveis-caixa-flask -f

# Nginx
sudo tail -f /var/log/nginx/imoveis-caixa-error.log

# Deploy
tail -f /var/log/imoveis-caixa/deploy.log
```

### Reiniciar Serviços
```bash
sudo systemctl restart imoveis-caixa-flask
sudo systemctl reload nginx
```

### Deploy Manual
```bash
cd /home/ubuntu/imoveis-caixa-final
./scripts/deploy/deploy.sh production
```

---

## 🆘 Troubleshooting

### Erro 502 Bad Gateway
```bash
# Verificar se Flask está rodando
sudo systemctl status imoveis-caixa-flask

# Reiniciar se necessário
sudo systemctl restart imoveis-caixa-flask
```

### Erro de Permissões
```bash
# Corrigir permissões dos arquivos web
sudo chown -R www-data:www-data /var/www/imoveis-caixa
sudo chmod -R 755 /var/www/imoveis-caixa
```

### Erro de Banco de Dados
```bash
# Testar conexão com RDS
mysql -h seu-rds-endpoint.amazonaws.com -u admin -p

# Verificar variáveis no .env
cat backend/.env | grep DB_
```

### Frontend não carrega
```bash
# Verificar se build existe
ls -la /var/www/imoveis-caixa/

# Refazer build se necessário
cd frontend
npm run build
sudo cp -r dist/* /var/www/imoveis-caixa/
```

---

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs primeiro
2. Consulte a [documentação completa](docs/deployment/aws-complete-guide.md)
3. Entre em contato: suporte@imoveiscaixapro.com.br

---

**🎉 Parabéns! Sua plataforma SaaS está funcionando na AWS!**

