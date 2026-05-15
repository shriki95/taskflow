from boto3.dynamodb.conditions import Key
from handlers.utils import (
    get_table, response, error, get_body,
    require_auth, now_iso, new_id,
)

PROJECT_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2']


def _fmt(item: dict) -> dict:
    return {
        'projectId': item['projectId'],
        'name': item['name'],
        'description': item.get('description', ''),
        'color': item.get('color', '#7c3aed'),
        'owner_id': item['owner_id'],
        'created_at': item['created_at'],
    }


def list_projects(event, context):
    user, err = require_auth(event)
    if err:
        return err

    table = get_table()
    memberships = table.query(
        IndexName='GSI1',
        KeyConditionExpression=(
            Key('gsi1pk').eq(f'USER#{user["sub"]}') &
            Key('gsi1sk').begins_with('PROJECT#')
        ),
    )

    projects = []
    for m in memberships.get('Items', []):
        res = table.get_item(Key={'PK': f'PROJECT#{m["projectId"]}', 'SK': 'METADATA'})
        item = res.get('Item')
        if item:
            projects.append(_fmt(item))

    return response(200, {'projects': projects})


def create_project(event, context):
    user, err = require_auth(event)
    if err:
        return err

    body = get_body(event)
    name = (body.get('name') or '').strip()
    if not name:
        return error(400, 'Project name is required')

    table = get_table()
    project_id = new_id()
    color = body.get('color', PROJECT_COLORS[0])
    ts = now_iso()

    table.put_item(Item={
        'PK': f'PROJECT#{project_id}',
        'SK': 'METADATA',
        'projectId': project_id,
        'name': name,
        'description': body.get('description', ''),
        'color': color,
        'owner_id': user['sub'],
        'created_at': ts,
    })

    table.put_item(Item={
        'PK': f'PROJECT#{project_id}',
        'SK': f'MEMBER#{user["sub"]}',
        'gsi1pk': f'USER#{user["sub"]}',
        'gsi1sk': f'PROJECT#{project_id}',
        'projectId': project_id,
        'userId': user['sub'],
        'role': 'owner',
        'joined_at': ts,
    })

    return response(201, {
        'projectId': project_id,
        'name': name,
        'description': body.get('description', ''),
        'color': color,
        'owner_id': user['sub'],
        'created_at': ts,
    })


def get_project(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    table = get_table()
    res = table.get_item(Key={'PK': f'PROJECT#{project_id}', 'SK': 'METADATA'})
    item = res.get('Item')
    if not item:
        return error(404, 'Project not found')

    return response(200, _fmt(item))


def update_project(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    body = get_body(event)
    table = get_table()

    set_parts, expr_names, expr_values = [], {}, {}

    if 'name' in body:
        set_parts.append('#nm = :name')
        expr_names['#nm'] = 'name'
        expr_values[':name'] = body['name']
    if 'description' in body:
        set_parts.append('description = :desc')
        expr_values[':desc'] = body['description']
    if 'color' in body:
        set_parts.append('color = :color')
        expr_values[':color'] = body['color']

    if not set_parts:
        return error(400, 'No fields to update')

    kwargs = {
        'Key': {'PK': f'PROJECT#{project_id}', 'SK': 'METADATA'},
        'UpdateExpression': 'SET ' + ', '.join(set_parts),
        'ExpressionAttributeValues': expr_values,
    }
    if expr_names:
        kwargs['ExpressionAttributeNames'] = expr_names

    table.update_item(**kwargs)
    return response(200, {'message': 'Project updated'})


def delete_project(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    table = get_table()
    res = table.get_item(Key={'PK': f'PROJECT#{project_id}', 'SK': 'METADATA'})
    item = res.get('Item')
    if not item:
        return error(404, 'Project not found')
    if item['owner_id'] != user['sub']:
        return error(403, 'Only the project owner can delete this project')

    table.delete_item(Key={'PK': f'PROJECT#{project_id}', 'SK': 'METADATA'})
    return response(200, {'message': 'Project deleted'})


def list_members(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    table = get_table()

    result = table.query(
        KeyConditionExpression=(
            Key('PK').eq(f'PROJECT#{project_id}') &
            Key('SK').begins_with('MEMBER#')
        ),
    )

    members = []
    for m in result.get('Items', []):
        u = table.get_item(
            Key={'PK': f'USER#{m["userId"]}', 'SK': 'PROFILE'}
        ).get('Item')
        if u:
            members.append({
                'userId': u['userId'],
                'name': u['name'],
                'email': u['email'],
                'avatar_color': u.get('avatar_color', '#7c3aed'),
                'role': m['role'],
            })

    return response(200, {'members': members})


def add_member(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    body = get_body(event)
    member_id = body.get('userId')
    if not member_id:
        return error(400, 'userId is required')

    table = get_table()
    table.put_item(Item={
        'PK': f'PROJECT#{project_id}',
        'SK': f'MEMBER#{member_id}',
        'gsi1pk': f'USER#{member_id}',
        'gsi1sk': f'PROJECT#{project_id}',
        'projectId': project_id,
        'userId': member_id,
        'role': 'member',
        'joined_at': now_iso(),
    })
    return response(201, {'message': 'Member added'})
