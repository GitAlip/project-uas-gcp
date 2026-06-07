const { execSync } = require('child_process');
const https = require('https');

// Config
const projectId = 'ebookstore-uas-2026-498209';
const locationId = 'asia-southeast2';
const agentId = '643adfa8-5f92-49fd-bad5-15322e4c9f38';

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
          // Resolve with error info instead of throwing to inspect
          resolve({ error: true, status: res.statusCode, message: data });
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
    
    // 1. Get Agent details
    console.log('Fetching agent info...');
    const agent = await apiRequest('GET', baseAgentPath);
    console.log('Agent structure:', JSON.stringify(agent, null, 2));

    // 2. Fetch playbooks (in case of Generative agent)
    console.log('\nFetching playbooks...');
    const playbooks = await apiRequest('GET', `${baseAgentPath}/playbooks`);
    console.log('Playbooks:', JSON.stringify(playbooks, null, 2));

    // 3. Fetch webhooks
    console.log('\nFetching webhooks...');
    const webhooks = await apiRequest('GET', `${baseAgentPath}/webhooks`);
    console.log('Webhooks:', JSON.stringify(webhooks, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

run();
