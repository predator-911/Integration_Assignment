# hubspot.py - FIXED VERSION

import json
import secrets
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
import httpx
import asyncio
import base64
import requests
from integrations.integration_item import IntegrationItem

from redis_client import add_key_value_redis, get_value_redis, delete_key_redis

# Replace these with your actual HubSpot app credentials
CLIENT_ID = '0541238c-4c74-4066-b711-212706e87a9f'  # Replace with real client ID
CLIENT_SECRET = '86c6c94d-2982-4f1a-97b6-11d1d050f8fc'  # Replace with real client secret
REDIRECT_URI = 'http://localhost:8000/integrations/hubspot/oauth2callback'

# HubSpot OAuth URLs
AUTHORIZATION_URL = 'https://app.hubspot.com/oauth/authorize'
TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'

# HubSpot API base URL
API_BASE_URL = 'https://api.hubapi.com'

# Required scopes for HubSpot integration
SCOPES = [
    'crm.objects.contacts.read',
    'crm.objects.companies.read', 
    'crm.objects.deals.read',
    'tickets',
    'crm.objects.quotes.read',
    'crm.objects.line_items.read'
]

async def authorize_hubspot(user_id, org_id):
    """Initiate HubSpot OAuth authorization flow"""
    state_data = {
        'state': secrets.token_urlsafe(32),
        'user_id': user_id,
        'org_id': org_id
    }
    encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode('utf-8')).decode('utf-8')
    
    # Store state in Redis with expiration
    await add_key_value_redis(f'hubspot_state:{org_id}:{user_id}', json.dumps(state_data), expire=600)
    
    # Build authorization URL
    scope_string = ' '.join(SCOPES)
    auth_url = (
        f'{AUTHORIZATION_URL}'
        f'?client_id={CLIENT_ID}'
        f'&redirect_uri={REDIRECT_URI}'
        f'&scope={scope_string}'
        f'&state={encoded_state}'
    )
    
    return auth_url

async def oauth2callback_hubspot(request: Request):
    """Handle OAuth callback from HubSpot"""
    if request.query_params.get('error'):
        raise HTTPException(
            status_code=400, 
            detail=request.query_params.get('error_description', 'Authorization failed')
        )
    
    code = request.query_params.get('code')
    encoded_state = request.query_params.get('state')
    
    if not code or not encoded_state:
        raise HTTPException(status_code=400, detail='Missing authorization code or state')
    
    # Decode and validate state
    try:
        state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode('utf-8'))
        original_state = state_data.get('state')
        user_id = state_data.get('user_id')
        org_id = state_data.get('org_id')
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid state parameter')
    
    # Verify state matches what we stored
    saved_state = await get_value_redis(f'hubspot_state:{org_id}:{user_id}')
    if not saved_state or original_state != json.loads(saved_state).get('state'):
        raise HTTPException(status_code=400, detail='State does not match')
    
    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        token_response, _ = await asyncio.gather(
            client.post(
                TOKEN_URL,
                data={
                    'grant_type': 'authorization_code',
                    'client_id': CLIENT_ID,
                    'client_secret': CLIENT_SECRET,
                    'redirect_uri': REDIRECT_URI,
                    'code': code,
                },
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            ),
            delete_key_redis(f'hubspot_state:{org_id}:{user_id}'),
        )
    
    if token_response.status_code != 200:
        print(f"Token exchange failed: {token_response.status_code} - {token_response.text}")
        raise HTTPException(status_code=400, detail='Failed to exchange code for token')
    
    # Store credentials temporarily
    await add_key_value_redis(
        f'hubspot_credentials:{org_id}:{user_id}', 
        json.dumps(token_response.json()), 
        expire=600
    )
    
    # Return JavaScript to close the popup window
    close_window_script = """
    <html>
        <script>
            window.close();
        </script>
    </html>
    """
    return HTMLResponse(content=close_window_script)

async def get_hubspot_credentials(user_id, org_id):
    """Retrieve and return stored HubSpot credentials"""
    credentials = await get_value_redis(f'hubspot_credentials:{org_id}:{user_id}')
    if not credentials:
        raise HTTPException(status_code=400, detail='No credentials found')
    
    credentials = json.loads(credentials)
    await delete_key_redis(f'hubspot_credentials:{org_id}:{user_id}')
    
    return credentials

def create_integration_item_metadata_object(
    response_json: dict, item_type: str, parent_id=None, parent_name=None
) -> IntegrationItem:
    """Create IntegrationItem from HubSpot API response"""
    
    # Extract common properties
    item_id = response_json.get('id')
    properties = response_json.get('properties', {})
    
    # Determine name based on object type
    name = ''
    if item_type == 'Contact':
        firstname = properties.get('firstname', '')
        lastname = properties.get('lastname', '')
        email = properties.get('email', '')
        name = f"{firstname} {lastname}".strip() or email or f"Contact {item_id}"
    elif item_type == 'Company':
        name = properties.get('name', f"Company {item_id}")
    elif item_type == 'Deal':
        name = properties.get('dealname', f"Deal {item_id}")
    elif item_type == 'Ticket':
        name = properties.get('subject', f"Ticket {item_id}")
    elif item_type == 'Quote':
        name = properties.get('hs_title', f"Quote {item_id}")
    elif item_type == 'Product':
        name = properties.get('name', f"Product {item_id}")
    else:
        name = f"{item_type} {item_id}"
    
    # Parse timestamps
    created_at = response_json.get('createdAt')
    updated_at = response_json.get('updatedAt')
    
    integration_item = IntegrationItem(
        id=f"{item_id}_{item_type}",
        name=name,
        type=item_type,
        parent_id=parent_id,
        parent_path_or_name=parent_name,
        creation_time=created_at,
        last_modified_time=updated_at,
    )
    
    return integration_item

def fetch_paginated_data(access_token: str, endpoint: str, object_type: str) -> list:
    """Fetch all data from a paginated HubSpot endpoint"""
    all_items = []
    url = f"{API_BASE_URL}{endpoint}"
    headers = {'Authorization': f'Bearer {access_token}'}
    
    while url:
        try:
            print(f"Fetching {object_type} from: {url}")
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                print(f"Error fetching {object_type}: {response.status_code} - {response.text}")
                break
                
            data = response.json()
            results = data.get('results', [])
            
            print(f"Got {len(results)} {object_type} items in this batch")
            
            for item in results:
                all_items.append(item)
            
            # Check for next page
            paging = data.get('paging', {})
            url = paging.get('next', {}).get('link') if paging.get('next') else None
            
        except Exception as e:
            print(f"Exception while fetching {object_type}: {str(e)}")
            break
    
    return all_items

async def get_items_hubspot(credentials) -> list[IntegrationItem]:
    """Fetch all HubSpot items and return as IntegrationItem objects"""
    print("Starting HubSpot data fetch...")
    
    # Parse credentials
    if isinstance(credentials, str):
        credentials = json.loads(credentials)
    
    access_token = credentials.get('access_token')
    
    if not access_token:
        print("No access token found in credentials")
        raise HTTPException(status_code=400, detail='No access token found in credentials')
    
    print(f"Access token found: {access_token[:20]}...")
    
    integration_items = []
    
    # Define the endpoints and object types to fetch
    endpoints_to_fetch = [
        ('/crm/v3/objects/contacts', 'Contact'),
        ('/crm/v3/objects/companies', 'Company'),
        ('/crm/v3/objects/deals', 'Deal'),
        ('/crm/v3/objects/tickets', 'Ticket'),
        ('/crm/v3/objects/quotes', 'Quote'),
        ('/crm/v3/objects/products', 'Product'),
    ]
    
    for endpoint, object_type in endpoints_to_fetch:
        try:
            print(f"Fetching {object_type} data from HubSpot...")
            items = fetch_paginated_data(access_token, endpoint, object_type)
            
            for item in items:
                integration_item = create_integration_item_metadata_object(item, object_type)
                integration_items.append(integration_item)
            
            print(f"Successfully fetched {len(items)} {object_type} items")
            
        except Exception as e:
            print(f"Error fetching {object_type}: {str(e)}")
            continue
    
    print(f"Total HubSpot integration items: {len(integration_items)}")
    
    # Print summary for each type
    type_counts = {}
    for item in integration_items:
        type_counts[item.type] = type_counts.get(item.type, 0) + 1
    
    print("Summary by type:")
    for item_type, count in type_counts.items():
        print(f"  {item_type}: {count} items")
    
    # CRITICAL FIX: Actually return the integration_items list!
    return integration_items
