from boto3.dynamodb.conditions import Key
from handlers.utils import (
    get_table, response, error, get_body,
    require_auth, now_iso, new_id,
)

VALID_STATUSES = {'todo', 'in_progress', 'done'}
VALID_PRIORITIES = {'low', 'medium', 'high'}


def _fmt(item: dict) -> dict:
    return {
        'taskId': item['taskId'],
        'projectId': item['projectId'],
        'title': item['title'],
        'description': item.get('description', ''),
        'status': item.get('status', 'todo'),
        'priority': item.get('priority', 'medium'),
        'due_date': item.get('due_date'),
        'assignee_id': item.get('assignee_id'),
        'created_by': item.get('created_by'),
        'created_at': item['created_at'],
        'updated_at': item.get('updated_at'),
    }


def list_tasks(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    result = get_table().query(
        KeyConditionExpression=(
            Key('PK').eq(f'PROJECT#{project_id}') &
            Key('SK').begins_with('TASK#')
        ),
    )
    return response(200, {'tasks': [_fmt(i) for i in result.get('Items', [])]})


def create_task(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    body = get_body(event)
    title = (body.get('title') or '').strip()
    if not title:
        return error(400, 'Task title is required')

    task_id = new_id()
    status = body.get('status', 'todo')
    priority = body.get('priority', 'medium')
    if status not in VALID_STATUSES:
        status = 'todo'
    if priority not in VALID_PRIORITIES:
        priority = 'medium'

    ts = now_iso()
    item = {
        'PK': f'PROJECT#{project_id}',
        'SK': f'TASK#{task_id}',
        'taskId': task_id,
        'projectId': project_id,
        'title': title,
        'description': body.get('description', ''),
        'status': status,
        'priority': priority,
        'due_date': body.get('due_date'),
        'assignee_id': body.get('assignee_id'),
        'created_by': user['sub'],
        'created_at': ts,
        'updated_at': ts,
    }
    get_table().put_item(Item=item)
    return response(201, _fmt(item))


def get_task(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    task_id = event['pathParameters']['taskId']
    res = get_table().get_item(Key={'PK': f'PROJECT#{project_id}', 'SK': f'TASK#{task_id}'})
    item = res.get('Item')
    if not item:
        return error(404, 'Task not found')
    return response(200, _fmt(item))


def update_task(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    task_id = event['pathParameters']['taskId']
    body = get_body(event)
    table = get_table()

    set_parts = ['updated_at = :ts']
    expr_names = {}
    expr_values = {':ts': now_iso()}

    if 'title' in body:
        set_parts.append('#ttl = :title')
        expr_names['#ttl'] = 'title'
        expr_values[':title'] = body['title']
    if 'description' in body:
        set_parts.append('description = :desc')
        expr_values[':desc'] = body['description']
    if 'status' in body and body['status'] in VALID_STATUSES:
        set_parts.append('#st = :status')
        expr_names['#st'] = 'status'
        expr_values[':status'] = body['status']
    if 'priority' in body and body['priority'] in VALID_PRIORITIES:
        set_parts.append('priority = :priority')
        expr_values[':priority'] = body['priority']
    if 'due_date' in body:
        set_parts.append('due_date = :due_date')
        expr_values[':due_date'] = body['due_date']
    if 'assignee_id' in body:
        set_parts.append('assignee_id = :assignee')
        expr_values[':assignee'] = body['assignee_id']

    kwargs = {
        'Key': {'PK': f'PROJECT#{project_id}', 'SK': f'TASK#{task_id}'},
        'UpdateExpression': 'SET ' + ', '.join(set_parts),
        'ExpressionAttributeValues': expr_values,
        'ReturnValues': 'ALL_NEW',
    }
    if expr_names:
        kwargs['ExpressionAttributeNames'] = expr_names

    result = table.update_item(**kwargs)
    return response(200, _fmt(result.get('Attributes', {})))


def delete_task(event, context):
    user, err = require_auth(event)
    if err:
        return err

    project_id = event['pathParameters']['projectId']
    task_id = event['pathParameters']['taskId']
    get_table().delete_item(Key={'PK': f'PROJECT#{project_id}', 'SK': f'TASK#{task_id}'})
    return response(200, {'message': 'Task deleted'})
