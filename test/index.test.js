const assert = require('assert');
const app = require('../src/index');
const http = require('http');

// Helper: make HTTP request with cookie jar
function makeRequest(base, method, path, body, cookies) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {},
    };
    if (cookies) options.headers['Cookie'] = cookies;
    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'] || [];
        const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}'), cookies: cookieStr });
        } catch {
          resolve({ status: res.statusCode, body: data, cookies: cookieStr });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const base = `http://localhost:${port}`;
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try { await fn(); passed++; }
    catch (err) { failed++; console.error(`FAIL: ${name} — ${err.message}`); }
  }

  await test('GET /health returns 200', async () => {
    const res = await makeRequest(base, 'GET', '/health');
    assert.strictEqual(res.status, 200);
  });

  await test('GET /api/dashboard without auth returns 401', async () => {
    const res = await makeRequest(base, 'GET', '/api/dashboard');
    assert.strictEqual(res.status, 401);
  });

  await test('POST /auth/login with valid credentials', async () => {
    const res = await makeRequest(base, 'POST', '/auth/login', { username: 'admin', password: 'admin123' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.username, 'admin');
    // Save cookies for next test
    global._testCookies = res.cookies;
  });

  await test('GET /auth/me with session cookie', async () => {
    const res = await makeRequest(base, 'GET', '/auth/me', null, global._testCookies);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.username, 'admin');
  });

  await test('GET /api/dashboard with session', async () => {
    const res = await makeRequest(base, 'GET', '/api/dashboard', null, global._testCookies);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('Welcome'));
  });

  await test('GET /api/admin with admin role', async () => {
    const res = await makeRequest(base, 'GET', '/api/admin', null, global._testCookies);
    assert.strictEqual(res.status, 200);
  });

  await test('POST /auth/logout', async () => {
    const res = await makeRequest(base, 'POST', '/auth/logout', null, global._testCookies);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Logged out');
  });

  await test('POST /auth/login with bad password returns 401', async () => {
    const res = await makeRequest(base, 'POST', '/auth/login', { username: 'admin', password: 'wrong' });
    assert.strictEqual(res.status, 401);
  });

  // Login as regular user
  await test('Regular user cannot access admin', async () => {
    const loginRes = await makeRequest(base, 'POST', '/auth/login', { username: 'user', password: 'user123' });
    assert.strictEqual(loginRes.status, 200);
    const adminRes = await makeRequest(base, 'GET', '/api/admin', null, loginRes.cookies);
    assert.strictEqual(adminRes.status, 403);
  });

  server.close();
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error(err); process.exit(1); });
