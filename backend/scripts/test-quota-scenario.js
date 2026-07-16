/**
 * Integration test for daily user + device story quota.
 * Run: node scripts/test-quota-scenario.js
 * Requires backend on PORT (default 3000) with STORY_PROVIDER=mock.
 */

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const DEVICE_ID = 'dev_test_quota_' + Date.now();

const STORY_PAYLOAD = {
  age: 4,
  interest: 'خرگوش',
  goal: 'sleep',
  mood: 'calm',
  durationMinutes: 2,
  deviceId: DEVICE_ID,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { raw: await response.text() };
  }
  return { response, data };
}

async function registerUser(suffix) {
  const email = `quota-test-${suffix}-${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const { response, data } = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: 'Quota Test',
    }),
  });
  assert(response.ok, `Register failed: ${JSON.stringify(data)}`);
  return { email, password, token: data.token, userId: data.user.id };
}

async function generateStory(token) {
  return request('/api/stories/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(STORY_PAYLOAD),
  });
}

async function getQuota(token) {
  return request(`/api/stories/quota?deviceId=${encodeURIComponent(DEVICE_ID)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function run() {
  console.log('Quota scenario test');
  console.log('Base URL:', BASE);
  console.log('Device ID:', DEVICE_ID);

  const health = await fetch(`${BASE}/health`);
  assert(health.ok, `Server not reachable at ${BASE}/health`);

  const user1 = await registerUser('user1');
  console.log('User 1 registered:', user1.userId);

  for (let i = 1; i <= 2; i += 1) {
    const { response, data } = await generateStory(user1.token);
    assert(response.status === 201, `Story ${i} should succeed, got ${response.status}: ${JSON.stringify(data)}`);
    console.log(`Story ${i}/2 created (user 1)`);
  }

  const blockedUser = await generateStory(user1.token);
  assert(
    blockedUser.response.status === 429,
    `Third story should be blocked (429), got ${blockedUser.response.status}`,
  );
  assert(
    blockedUser.data.code === 'QUOTA_DAILY_EXCEEDED',
    `Expected QUOTA_DAILY_EXCEEDED, got ${blockedUser.data.code}`,
  );
  console.log('Step 3 OK: user quota blocked on 3rd attempt');

  const user2 = await registerUser('user2');
  console.log('User 2 registered on same device:', user2.userId);

  const blockedDevice = await generateStory(user2.token);
  assert(
    blockedDevice.response.status === 429,
    `New user on same device should be blocked (429), got ${blockedDevice.response.status}`,
  );
  assert(
    blockedDevice.data.code === 'DEVICE_DAILY_LIMIT_EXCEEDED',
    `Expected DEVICE_DAILY_LIMIT_EXCEEDED, got ${blockedDevice.data.code}`,
  );
  console.log('Step 6-7 OK: device quota blocks new account');

  const quotaRes = await getQuota(user2.token);
  assert(quotaRes.response.ok, 'Quota endpoint failed');
  assert(quotaRes.data.quota.deviceUsedToday >= 2, 'Device should show 2 used today');
  assert(quotaRes.data.quota.deviceExceeded === true, 'Device should be exceeded');
  console.log('Quota status:', quotaRes.data.quota);

  console.log('\nAll quota scenario checks passed.');
}

run().catch((err) => {
  console.error('\nQuota scenario FAILED:', err.message);
  process.exit(1);
});
