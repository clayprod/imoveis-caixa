# Inicialização do Banco de Dados

Este projeto utiliza **Flask-Migrate** para gerenciar o esquema do banco de dados.
Siga os passos abaixo para configurar o banco localmente.

## Passos

1. **Instale as dependências**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Defina a aplicação Flask**
   ```bash
   export FLASK_APP=src.main
   export PYTHONPATH=$(pwd)/src
   ```

3. **Inicialize as migrações (apenas uma vez)**
   ```bash
   flask db init
   ```

4. **Gerar uma nova migração**
   ```bash
   flask db migrate -m "Descrição da migração"
   ```

5. **Aplicar migrações ao banco**
   ```bash
   flask db upgrade
   ```

Após executar esses comandos, o arquivo `app.db` será atualizado conforme as migrações definidas.

Para mais detalhes, consulte a [documentação do Flask-Migrate](https://flask-migrate.readthedocs.io/).
