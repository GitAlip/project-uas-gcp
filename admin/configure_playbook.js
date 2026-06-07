const { execSync } = require('child_process');
const https = require('https');

const projectId = 'ebookstore-uas-2026-498209';
const locationId = 'asia-southeast2';
const agentId = '643adfa8-5f92-49fd-bad5-15322e4c9f38';

const toolDisplayName = 'get_books_tool';
const webhookUri = 'https://ebookstore-app-1047421347297.asia-southeast2.run.app/api/books';

let accessToken = '';
try {
  accessToken = execSync('gcloud auth print-access-token').toString().trim();
} catch (err) {
  console.error('Failed to get access token:', err.message);
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
  try {
    const baseAgentPath = `/projects/${projectId}/locations/${locationId}/agents/${agentId}`;
    
    // 1. Create OpenAPI Tool
    console.log(`Checking if tool "${toolDisplayName}" exists...`);
    const toolsRes = await apiRequest('GET', `${baseAgentPath}/tools`);
    let existingTool = (toolsRes.body.tools || []).find(t => t.displayName === toolDisplayName);
    
    const openApiSpecJson = {
      openapi: "3.0.0",
      info: {
        title: "EbookStore API",
        version: "1.0.0",
        description: "API untuk mengakses daftar buku"
      },
      servers: [
        {
          url: "https://ebookstore-app-1047421347297.asia-southeast2.run.app"
        }
      ],
      paths: {
        "/api/books": {
          "get": {
            "summary": "Mengambil semua daftar buku",
            "description": "Fungsi ini mengembalikan daftar seluruh buku yang tersedia di database beserta detail stok, harga, penulis, dan judul.",
            "responses": {
              "200": {
                "description": "Daftar buku berhasil diambil",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "title": { "type": "string" },
                          "author": { "type": "string" },
                          "genre": { "type": "string" },
                          "price": { "type": "integer" },
                          "originalPrice": { "type": "integer" },
                          "stock": { "type": "integer" },
                          "description": { "type": "string" },
                          "imageUrl": { "type": "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    let toolResourceName = '';
    if (existingTool) {
      toolResourceName = existingTool.name;
      console.log(`Tool "${toolDisplayName}" already exists at ${toolResourceName}. Updating spec...`);
      const updateRes = await apiRequest('PATCH', `/${toolResourceName}?updateMask=openApiSpec.textSchema`, {
        openApiSpec: {
          textSchema: JSON.stringify(openApiSpecJson)
        }
      });
      console.log('Tool spec updated status:', updateRes.status);
    } else {
      console.log(`Creating tool "${toolDisplayName}"...`);
      const createRes = await apiRequest('POST', `${baseAgentPath}/tools`, {
        displayName: toolDisplayName,
        description: 'Mengambil daftar buku aktif dari database E-Book Store.',
        openApiSpec: {
          textSchema: JSON.stringify(openApiSpecJson)
        }
      });
      console.log('Tool creation status:', createRes.status, JSON.stringify(createRes.body));
      toolResourceName = createRes.body.name;
    }

    // 2. Configure Default Generative Playbook
    const playbookPath = `${baseAgentPath}/playbooks/00000000-0000-0000-0000-000000000000`;
    console.log('\nFetching Playbook...');
    const playbookRes = await apiRequest('GET', playbookPath);
    console.log('Playbook fetch status:', playbookRes.status);
    
    const playbook = playbookRes.body;
    playbook.referencedTools = playbook.referencedTools || [];
    if (!playbook.referencedTools.includes(toolResourceName)) {
      playbook.referencedTools.push(toolResourceName);
    }
    
    playbook.goal = 'Membantu pengguna dengan informasi buku, harga, stok, dan rekomendasi buku.';
    playbook.instruction = {
      steps: [
        { text: 'Anda adalah asisten virtual E-Book Store.' },
        { text: 'Jika pengguna menanyakan jumlah buku yang tersedia, daftar buku, katalog buku, harga, atau stok, Anda wajib memanggil tool `${TOOL:' + toolDisplayName + '}` untuk mendapatkan data terkini.' },
        { text: 'Hitunglah jumlah buku secara dinamis berdasarkan data JSON yang dikembalikan oleh tool tersebut.' },
        { text: 'Jawablah dengan ramah dan profesional dalam Bahasa Indonesia.' }
      ]
    };

    console.log('Updating Playbook...');
    const updatePlaybookRes = await apiRequest('PATCH', `${playbookPath}?updateMask=referencedTools,goal,instruction`, playbook);
    console.log('Playbook update status:', updatePlaybookRes.status);
    if (updatePlaybookRes.status !== 200) {
      console.error('Failed to update playbook:', JSON.stringify(updatePlaybookRes.body));
    } else {
      console.log('Playbook updated successfully!');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
