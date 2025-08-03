import os
import sys
import pytest

# Ensure project root is on the PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set environment variables before importing app
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['SECRET_KEY'] = 'test-secret'

from src.main import app, db  # noqa: E402


@pytest.fixture()

def client():
    app.config['TESTING'] = True
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def test_register_and_login_returns_token_and_user(client):
    payload = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'secret'
    }

    register_resp = client.post('/api/register', json=payload)
    assert register_resp.status_code == 201
    reg_data = register_resp.get_json()
    assert 'token' in reg_data
    assert 'user' in reg_data
    assert reg_data['user']['username'] == payload['username']

    login_resp = client.post('/api/login', json=payload)
    assert login_resp.status_code == 200
    login_data = login_resp.get_json()
    assert 'token' in login_data
    assert 'user' in login_data
    assert login_data['user']['email'] == payload['email']

