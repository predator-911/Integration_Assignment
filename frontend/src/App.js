// App.js - Main application component with all integrations

import React, { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { HubSpotIntegration } from './integrations/hubspot';
import { AirtableIntegration } from './integrations/airtable';
import { NotionIntegration } from './integrations/notion';
import { loadHubSpotItems } from './integrations/hubspot';

function App() {
  const [integrations, setIntegrations] = useState({
    hubspot: { credentials: null, type: null },
    airtable: { credentials: null, type: null },
    notion: { credentials: null, type: null }
  });
  
  const [loadedItems, setLoadedItems] = useState({
    hubspot: null,
    airtable: null,
    notion: null
  });
  
  const [loading, setLoading] = useState({
    hubspot: false,
    airtable: false,
    notion: false
  });
  
  const [error, setError] = useState(null);

  // Mock user and org IDs for testing
  const userId = 'test-user-123';
  const orgId = 'test-org-456';

  // Function to load items after connection
  const handleLoadItems = async (integrationType) => {
    const integration = integrations[integrationType];
    
    if (!integration.credentials) {
      setError(`${integrationType} not connected yet`);
      return;
    }

    setLoading(prev => ({ ...prev, [integrationType]: true }));
    setError(null);
    
    try {
      let items;
      
      switch (integrationType) {
        case 'hubspot':
          items = await loadHubSpotItems(integration.credentials);
          break;
        case 'airtable':
          // TODO: Implement loadAirtableItems
          setError('Airtable item loading not implemented yet');
          return;
        case 'notion':
          // TODO: Implement loadNotionItems
          setError('Notion item loading not implemented yet');
          return;
        default:
          setError('Unknown integration type');
          return;
      }
      
      setLoadedItems(prev => ({ ...prev, [integrationType]: items }));
      console.log(`${integrationType} items loaded:`, items);
      
    } catch (err) {
      setError(`Failed to load ${integrationType} items: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [integrationType]: false }));
    }
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Integration Dashboard
      </Typography>
      
      <Typography variant="h6" component="h2" gutterBottom align="center" color="textSecondary">
        Connect your favorite tools and services
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* HubSpot Integration */}
        <Card>
          <CardContent>
            <Typography variant="h5" component="h3" gutterBottom>
              HubSpot Integration
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Connect to your HubSpot account to access contacts, companies, deals, tickets, quotes, and products.
            </Typography>
            
            <HubSpotIntegration 
              user={userId}
              org={orgId}
              integrationParams={integrations.hubspot}
              setIntegrationParams={(params) => 
                setIntegrations(prev => ({ ...prev, hubspot: typeof params === 'function' ? params(prev.hubspot) : params }))
              }
            />

            {integrations.hubspot.credentials && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => handleLoadItems('hubspot')}
                  disabled={loading.hubspot}
                  startIcon={loading.hubspot && <CircularProgress size={20} />}
                >
                  {loading.hubspot ? 'Loading Items...' : 'Load HubSpot Items'}
                </Button>
                
                {loadedItems.hubspot && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Successfully loaded {loadedItems.hubspot.length} HubSpot items. Check console for details.
                  </Alert>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Airtable Integration */}
        <Card>
          <CardContent>
            <Typography variant="h5" component="h3" gutterBottom>
              Airtable Integration
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Connect to your Airtable bases and tables.
            </Typography>
            
            <AirtableIntegration 
              user={userId}
              org={orgId}
              integrationParams={integrations.airtable}
              setIntegrationParams={(params) => 
                setIntegrations(prev => ({ ...prev, airtable: typeof params === 'function' ? params(prev.airtable) : params }))
              }
            />
            
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'orange' }}>
              Note: Requires valid Airtable app credentials
            </Typography>
          </CardContent>
        </Card>

        {/* Notion Integration */}
        <Card>
          <CardContent>
            <Typography variant="h5" component="h3" gutterBottom>
              Notion Integration
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Connect to your Notion workspace and pages.
            </Typography>
            
            <NotionIntegration 
              user={userId}
              org={orgId}
              integrationParams={integrations.notion}
              setIntegrationParams={(params) => 
                setIntegrations(prev => ({ ...prev, notion: typeof params === 'function' ? params(prev.notion) : params }))
              }
            />
            
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'orange' }}>
              Note: Requires valid Notion app credentials
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Development Info */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Development Notes:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>All integrations follow consistent OAuth patterns</li>
            <li>HubSpot integration includes item loading functionality</li>
            <li>Airtable and Notion integrations need valid app credentials</li>
            <li>User ID: {userId}</li>
            <li>Org ID: {orgId}</li>
            <li>Backend running on: http://localhost:8000</li>
          </ul>
        </Typography>
      </Box>
    </Box>
  );
}

export default App;
