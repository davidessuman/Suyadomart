// Test script for Vercel serverless API endpoints
const fetch = require('node-fetch');

async function testSaveSubscription() {
  const response = await fetch('http://localhost:3000/api/save-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'test-user-id',
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
    })
  });
  const data = await response.json();
  console.log('save-subscription:', response.status, data);
}

async function testSendNotification() {
  const response = await fetch('http://localhost:3000/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'test-user-id',
      title: 'Test Notification',
      body: 'This is a test notification.',
      url: 'https://www.suyadomart.com/'
    })
  });
  const data = await response.json();
  console.log('send-notification:', response.status, data);
}

(async () => {
  await testSaveSubscription();
  await testSendNotification();
})();
