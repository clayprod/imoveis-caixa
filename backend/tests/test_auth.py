import os
import sys

import pytest
from werkzeug.security import generate_password_hash

# Ensure the backend package is on the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Configure in-memory database before importing app
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

from src.main import app  # noqa: E402
from src.models.user import db, User  # noqa: E402


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def test_login_returns_token_and_user(client):
    password = 'secret'
    user = User(username='john', email='john@example.com',
                password=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    response = client.post('/api/login',
                           json={'email': 'john@example.com', 'password': password})

    assert response.status_code == 200
    data = response.get_json()
    assert 'token' in data
    assert 'user' in data
    assert data['user']['email'] == 'john@example.com'
    assert data['user']['username'] == 'john'
