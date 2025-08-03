import os
import sys

import pytest
from werkzeug.security import generate_password_hash

# Ensure backend package is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Configure test environment before importing app
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['SECRET_KEY'] = 'test-secret'

from src.main import app  # noqa: E402
from src.models.user import User, db  # noqa: E402


@pytest.fixture
def client():
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def create_user(email='test@example.com', password='password', username='tester'):
    user = User(
        email=email,
        username=username,
        password=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()
    return user


def login_and_get_token(client):
    create_user()
    res = client.post('/api/login', json={'email': 'test@example.com', 'password': 'password'})
    data = res.get_json()
    return data['token']


def test_get_profile_returns_user(client):
    token = login_and_get_token(client)
    res = client.get('/api/profile', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = res.get_json()
    assert data['email'] == 'test@example.com'


def test_put_profile_updates_user(client):
    token = login_and_get_token(client)
    res = client.put(
        '/api/profile',
        headers={'Authorization': f'Bearer {token}'},
        json={'username': 'updated'},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data['username'] == 'updated'
