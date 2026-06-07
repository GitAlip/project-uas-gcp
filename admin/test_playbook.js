const { execSync } = require('child_process');
const https = require('https');

const projectId = 'ebookstore-uas-2026-498209';
const locationId = 'asia-southeast2';
const agentId = '643adfa8-5f92-49fd-bad5-15322e4c9f38';

let accessToken = '';
try {
  accessToken = execSync('gcloud auth print-access-token').toString().trim();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

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
        resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const baseAgentPath = `/projects/${projectId}/locations/${locationId}/agents/${agentId}`;
  
  console.log('Listing tools...');
  const toolsRes = await apiRequest('GET', `${baseAgentPath}/tools`);
  console.log('Tools Response Status:', toolsRes.status);
  console.log('Tools:', JSON.stringify(toolsRes.body, null, 2));
}

run();
