const { execSync } = require('child_process');
const https = require('https');

// Config
const projectId = 'ebookstore-uas-2026-498209';
const locationId = 'asia-southeast2';
const agentId = '643adfa8-5f92-49fd-bad5-15322e4c9f38';
const webhookName = 'get-database-books';
const webhookId = '92e24a03-826a-4682-a555-2012e7b0056d'; // From previous output
const intentDisplayName = 'ask_books';

// Get Access Token
let accessToken = '';
try {
  accessToken = execSync('gcloud auth print-access-token').toString().trim();
} catch (err) {
  console.error('Failed to get access token:', err.message);
  process.exit(1);
}

// Request Helper
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${locationId}-dialogflow.googleapis.com`,
      port: 443,
      path: `/v3${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-goog-user-project': projectId
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  try {
    const baseAgentPath = `/projects/${projectId}/locations/${locationId}/agents/${agentId}`;
    
    // 1. Create or retrieve Intent
    console.log(`Checking if intent "${intentDisplayName}" exists...`);
    const intentsResponse = await apiRequest('GET', `${baseAgentPath}/intents`);
    let targetIntent = (intentsResponse.intents || []).find(i => i.displayName === intentDisplayName);
    
    if (targetIntent) {
      console.log(`Intent "${intentDisplayName}" already exists at ${targetIntent.name}`);
    } else {
      console.log(`Creating intent "${intentDisplayName}"...`);
      targetIntent = await apiRequest('POST', `${baseAgentPath}/intents`, {
        displayName: intentDisplayName,
        trainingPhrases: [
          { parts: [{ text: 'ada berapa buku saat ini' }], repeatCount: 1 },
          { parts: [{ text: 'berapa banyak buku' }], repeatCount: 1 },
          { parts: [{ text: 'tampilkan koleksi buku' }], repeatCount: 1 },
          { parts: [{ text: 'katalog buku' }], repeatCount: 1 },
          { parts: [{ text: 'jumlah buku' }], repeatCount: 1 },
          { parts: [{ text: 'daftar buku' }], repeatCount: 1 },
          { parts: [{ text: 'buku apa saja yang ada' }], repeatCount: 1 },
          { parts: [{ text: 'rekomendasi buku' }], repeatCount: 1 }
        ]
      });
      console.log(`Intent created successfully at ${targetIntent.name}`);
    }

    // 2. Fetch the Default Start Flow
    const flowPath = `${baseAgentPath}/flows/00000000-0000-0000-0000-000000000000`;
    console.log('Fetching Default Start Flow...');
    const flow = await apiRequest('GET', flowPath);
    
    // Check if the route is already registered
    const routes = flow.transitionRoutes || [];
    const routeExists = routes.some(r => r.intent === targetIntent.name);
    
    if (routeExists) {
      console.log('Transition route for this intent already exists in flow.');
    } else {
      console.log('Adding transition route to flow...');
      const newRoute = {
        intent: targetIntent.name,
        triggerFulfillment: {
          webhook: `projects/${projectId}/locations/${locationId}/agents/${agentId}/webhooks/${webhookId}`,
          tag: 'get-books'
        }
      };
      
      routes.push(newRoute);
      
      console.log('Updating Flow with new transition route...');
      // UpdateMask specifies which fields to update
      await apiRequest('PATCH', `${flowPath}?updateMask=transitionRoutes`, {
        transitionRoutes: routes
      });
      console.log('Flow updated successfully! The Webhook is now enabled for the ask_books intent.');
    }

  } catch (error) {
    console.error('Error in script execution:', error.message);
  }
}

run();
