from boto3.dynamodb.conditions import Attr
from handlers.utils import get_table, response, require_auth


def list_users(event, context):
    user, err = require_auth(event)
    if err:
        return err

    table = get_table()
    result = table.scan(
        FilterExpression=Attr('SK').eq('PROFILE'),
        ProjectionExpression='userId, #nm, email, avatar_color',
        ExpressionAttributeNames={'#nm': 'name'},
    )

    users = [
        {
            'userId': i['userId'],
            'name': i['name'],
            'email': i['email'],
            'avatar_color': i.get('avatar_color', '#7c3aed'),
        }
        for i in result.get('Items', [])
    ]
    return response(200, {'users': users})
