// hubspot.js - HubSpot integration frontend functions

const HUBSPOT_BASE_URL = 'http://localhost:8000/integrations/hubspot';

/**
 * Initiate HubSpot OAuth authorization
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<string>} Authorization URL
 */
export const authorizeHubSpot = async (userId, orgId) => {
  try {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('org_id', orgId);

    const response = await fetch(`${HUBSPOT_BASE_URL}/authorize`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Authorization failed: ${response.statusText}`);
    }

    const authUrl = await response.text();
    return authUrl;
  } catch (error) {
    console.error('Error authorizing HubSpot:', error);
    throw error;
  }
};

/**
 * Get HubSpot credentials after OAuth callback
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} Credentials object
 */
export const getHubSpotCredentials = async (userId, orgId) => {
  try {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('org_id', orgId);

    const response = await fetch(`${HUBSPOT_BASE_URL}/credentials`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to get credentials: ${response.statusText}`);
    }

    const credentials = await response.json();
    return credentials;
  } catch (error) {
    console.error('Error getting HubSpot credentials:', error);
    throw error;
  }
};

/**
 * Load HubSpot items using credentials
 * @param {Object} credentials - OAuth credentials
 * @returns {Promise<Array>} Array of integration items
 */
export const loadHubSpotItems = async (credentials) => {
  try {
    const formData = new FormData();
    formData.append('credentials', JSON.stringify(credentials));

    const response = await fetch(`${HUBSPOT_BASE_URL}/load`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to load items: ${response.statusText}`);
    }

    const items = await response.json();
    return items;
  } catch (error) {
    console.error('Error loading HubSpot items:', error);
    throw error;
  }
};

/**
 * Complete HubSpot integration flow
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export const integrateHubSpot = async (userId, orgId, onSuccess, onError) => {
  try {
    // Step 1: Get authorization URL
    const authUrl = await authorizeHubSpot(userId, orgId);
    
    // Step 2: Open OAuth popup
    const popup = window.open(
      authUrl,
      'hubspot-oauth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    // Step 3: Poll for popup closure
    const pollTimer = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(pollTimer);
          
          // Step 4: Get credentials
          const credentials = await getHubSpotCredentials(userId, orgId);
          
          // Step 5: Load items
          const items = await loadHubSpotItems(credentials);
          
          // Step 6: Call success callback
          if (onSuccess) {
            onSuccess(items);
          }
        }
      } catch (error) {
        clearInterval(pollTimer);
        if (onError) {
          onError(error);
        }
      }
    }, 1000);

    // Handle popup blocked or closed immediately
    if (!popup || popup.closed) {
      clearInterval(pollTimer);
      throw new Error('Popup blocked or closed');
    }

  } catch (error) {
    console.error('HubSpot integration error:', error);
    if (onError) {
      onError(error);
    }
  }
};

/**
 * HubSpot integration configuration
 */
export const hubspotConfig = {
  name: 'HubSpot',
  description: 'Connect to HubSpot CRM',
  icon: '🔗', // You can replace with actual icon
  color: '#ff7a00',
  authorize: authorizeHubSpot,
  getCredentials: getHubSpotCredentials,
  loadItems: loadHubSpotItems,
  integrate: integrateHubSpot,
};
