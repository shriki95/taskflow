from boto3.dynamodb.conditions import Key
from handlers.utils import (
    get_table, response, error, get_body,
    require_auth, now_iso, new_id,
)


def list_subtasks(event, context):
    user, err = require_auth(event)
    if err:
        return err

    task_id = event['pathParameters']['taskId']
    result = get_table().query(
        KeyConditionExpression=(
            Key('PK').eq(f'TASK#{task_id}') &
            Key('SK').begins_with('SUBTASK#')
        ),
    )
    subtasks = [
        {
            'subtaskId': i['subtaskId'],
            'taskId': i['taskId'],
            'title': i['title'],
            'completed': i.get('completed', False),
            'created_at': i['created_at'],
        }
        for i in result.get('Items', [])
    ]
    subtasks.sort(key=lambda x: x['created_at'])
    return response(200, {'subtasks': subtasks})


def create_subtask(event, context):
    user, err = require_auth(event)
    if err:
        return err

    task_id = event['pathParameters']['taskId']
    body = get_body(event)
    title = (body.get('title') or '').strip()
    if not title:
        return error(400, 'Subtask title is required')

    subtask_id = new_id()
    ts = now_iso()
    item = {
        'PK': f'TASK#{task_id}',
        'SK': f'SUBTASK#{subtask_id}',
        'subtaskId': subtask_id,
        'taskId': task_id,
        'title': title,
        'completed': False,
        'created_at': ts,
    }
    get_table().put_item(Item=item)
    return response(201, {
        'subtaskId': subtask_id,
        'taskId': task_id,
        'title': title,
        'completed': False,
        'created_at': ts,
    })


def update_subtask(event, context):
    user, err = require_auth(event)
    if err:
        return err

    task_id = event['pathParameters']['taskId']
    subtask_id = event['pathParameters']['subtaskId']
    body = get_body(event)
    table = get_table()

    set_parts, expr_names, expr_values = [], {}, {}

    if 'title' in body:
        set_parts.append('#ttl = :title')
        expr_names['#ttl'] = 'title'
        expr_values[':title'] = body['title']
    if 'completed' in body:
        set_parts.append('completed = :completed')
        expr_values[':completed'] = bool(body['completed'])

    if not set_parts:
        return error(400, 'No fields to update')

    kwargs = {
        'Key': {'PK': f'TASK#{task_id}', 'SK': f'SUBTASK#{subtask_id}'},
        'UpdateExpression': 'SET ' + ', '.join(set_parts),
        'ExpressionAttributeValues': expr_values,
    }
    if expr_names:
        kwargs['ExpressionAttributeNames'] = expr_names

    table.update_item(**kwargs)
    return response(200, {'message': 'Subtask updated'})


def delete_subtask(event, context):
    user, err = require_auth(event)
    if err:
        return err

    task_id = event['pathParameters']['taskId']
    subtask_id = event['pathParameters']['subtaskId']
    get_table().delete_item(Key={'PK': f'TASK#{task_id}', 'SK': f'SUBTASK#{subtask_id}'})
    return response(200, {'message': 'Subtask deleted'})
