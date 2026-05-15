from boto3.dynamodb.conditions import Key
from handlers.utils import (
    get_table, response, error, get_body,
    require_auth, now_iso, new_id,
)


def list_comments(event, context):
    user, err = require_auth(event)
    if err:
        return err

    task_id = event['pathParameters']['taskId']
    table = get_table()

    result = table.query(
        KeyConditionExpression=(
            Key('PK').eq(f'TASK#{task_id}') &
            Key('SK').begins_with('COMMENT#')
        ),
    )

    comments = []
    for i in result.get('Items', []):
        author = table.get_item(
            Key={'PK': f'USER#{i["author_id"]}', 'SK': 'PROFILE'}
        ).get('Item', {})
        comments.append({
            'commentId': i['commentId'],
            'taskId': i['taskId'],
            'text': i['text'],
            'author_id': i['author_id'],
            'author_name': author.get('name', 'Unknown'),
            'author_color': author.get('avatar_color', '#7c3aed'),
            'created_at': i['created_at'],
        })

    comments.sort(key=lambda x: x['created_at'])
    return response(200, {'comments': comments})


def create_comment(event, context):
    user, err = require_auth(event)
    if err:
        return err

    task_id = event['pathParameters']['taskId']
    body = get_body(event)
    text = (body.get('text') or '').strip()
    if not text:
        return error(400, 'Comment text is required')

    table = get_table()
    author = table.get_item(
        Key={'PK': f'USER#{user["sub"]}', 'SK': 'PROFILE'}
    ).get('Item', {})

    comment_id = new_id()
    ts = now_iso()
    table.put_item(Item={
        'PK': f'TASK#{task_id}',
        'SK': f'COMMENT#{comment_id}',
        'commentId': comment_id,
        'taskId': task_id,
        'text': text,
        'author_id': user['sub'],
        'created_at': ts,
    })

    return response(201, {
        'commentId': comment_id,
        'taskId': task_id,
        'text': text,
        'author_id': user['sub'],
        'author_name': author.get('name', 'Unknown'),
        'author_color': author.get('avatar_color', '#7c3aed'),
        'created_at': ts,
    })
