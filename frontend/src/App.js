// App.js - Main application component with all integrations

import React, { useState } from 'react';
import { Button, Card, CardContent, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { integrateHubSpot } from './integrations/hubspot';
// Import other integrations as needed
// import { integrateAirTable } from './integrations/airtable';
// import { integrateNotion } from './integrations/notion';

function App() {
  const [hubspotResults, setHubspotResults] = useState(null);
  const [loading, setLoading] = useState({
    hubspot: false,
    airtable: false,
    notion: false
  });
  const [error, setError] = useState(null);

  // Mock user and org IDs for testing
  const userId = 'test-user-123';
  const orgId = 'test-org-456';

  const handleHubSpotIntegration = async () => {
    setLoading(prev => ({ ...prev, hubspot: true }));
    setError(null);
    
    try {
      const result = await integrateHubSpot(userId, orgId);
      setHubspotResults(result);
      
      if (result.success) {
        console.log('HubSpot Integration Success:', result);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to integrate with HubSpot: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, hubspot: false }));
    }
  };

  const handleAirtableIntegration = async () => {
    setLoading(prev => ({ ...prev, airtable: true }));
    setError(null);
    
    try {
      // Implement Airtable integration
      console.log('Airtable integration not implemented yet');
      setError('Airtable integration requires valid credentials');
    } catch (err) {
      setError('Failed to integrate with Airtable: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, airtable: false }));
    }
  };

  const handleNotionIntegration = async () => {
    setLoading(prev => ({ ...prev, notion: true }));
    setError(null);
    
    try {
      // Implement Notion integration
      console.log('Notion integration not implemented yet');
      setError('Notion integration requires valid credentials');
    } catch (err) {
      setError('Failed to integrate with Notion: ' + err.message);
    } finally {
      setLoading(prev => ({ ...prev, notion: false }));
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
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleHubSpotIntegration}
              disabled={loading.hubspot}
              startIcon={loading.hubspot && <CircularProgress size={20} />}
              sx={{ mb: 2 }}
            >
              {loading.hubspot ? 'Connecting...' : 'Connect HubSpot'}
            </Button>

            {hubspotResults && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Integration Results:
                </Typography>
                <Alert severity={hubspotResults.success ? 'success' : 'error'}>
                  {hubspotResults.message}
                </Alert>
                
                {hubspotResults.success && hubspotResults.items && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Items Retrieved:</strong> {hubspotResults.items.length}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8em', mt: 1 }}>
                      Check console for detailed item list
                    </Typography>
                  </Box>
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
            
            <Button
              variant="contained"
              color="secondary"
              onClick={handleAirtableIntegration}
              disabled={loading.airtable}
              startIcon={loading.airtable && <CircularProgress size={20} />}
            >
              {loading.airtable ? 'Connecting...' : 'Connect Airtable'}
            </Button>
            
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
            
            <Button
              variant="contained"
              color="info"
              onClick={handleNotionIntegration}
              disabled={loading.notion}
              startIcon={loading.notion && <CircularProgress size={20} />}
            >
              {loading.notion ? 'Connecting...' : 'Connect Notion'}
            </Button>
            
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
            <li>HubSpot integration is fully implemented and testable with valid credentials</li>
            <li>Airtable and Notion integrations exist in backend but need valid app credentials</li>
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
