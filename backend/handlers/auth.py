from boto3.dynamodb.conditions import Key
from handlers.utils import (
    get_table, response, error, get_body,
    create_token, hash_password, verify_password,
    require_auth, now_iso, new_id, pick_color,
)


def signup(event, context):
    body = get_body(event)
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''
    name = (body.get('name') or '').strip()

    if not email or not password or not name:
        return error(400, 'email, password, and name are required')
    if len(password) < 6:
        return error(400, 'Password must be at least 6 characters')

    table = get_table()
    existing = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('gsi1pk').eq(f'EMAIL#{email}'),
    )
    if existing.get('Items'):
        return error(409, 'Email already in use')

    user_id = new_id()
    avatar_color = pick_color(email)
    ts = now_iso()

    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': 'PROFILE',
        'gsi1pk': f'EMAIL#{email}',
        'gsi1sk': f'USER#{user_id}',
        'userId': user_id,
        'email': email,
        'name': name,
        'password_hash': hash_password(password),
        'avatar_color': avatar_color,
        'created_at': ts,
    })

    token = create_token(user_id, email)
    return response(201, {
        'token': token,
        'user': {'userId': user_id, 'email': email, 'name': name, 'avatar_color': avatar_color},
    })


def login(event, context):
    body = get_body(event)
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    if not email or not password:
        return error(400, 'email and password are required')

    table = get_table()
    result = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('gsi1pk').eq(f'EMAIL#{email}'),
    )
    items = result.get('Items', [])
    if not items or not verify_password(password, items[0].get('password_hash', '')):
        return error(401, 'Invalid credentials')

    user = items[0]
    token = create_token(user['userId'], email)
    return response(200, {
        'token': token,
        'user': {
            'userId': user['userId'],
            'email': user['email'],
            'name': user['name'],
            'avatar_color': user.get('avatar_color', '#7c3aed'),
        },
    })


def get_me(event, context):
    user, err = require_auth(event)
    if err:
        return err

    table = get_table()
    result = table.get_item(Key={'PK': f'USER#{user["sub"]}', 'SK': 'PROFILE'})
    item = result.get('Item')
    if not item:
        return error(404, 'User not found')

    return response(200, {
        'userId': item['userId'],
        'email': item['email'],
        'name': item['name'],
        'avatar_color': item.get('avatar_color', '#7c3aed'),
    })
