console.log('Script started');
// Run this script to test sending a push notification to a user_id
const fetch = require('node-fetch');

const USER_ID = '04ffa00d-9631-4298-ac1a-2edd9993e59a';

console.log('Sending test notification to user:', USER_ID);
fetch('http://localhost:4000/api/send-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: USER_ID,
    title: 'Test Notification',
    body: 'This is a test push notification!',
    url: 'https://your-app-url.com/'
  })
})
  .then(async res => {
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data:', data);
    return data;
  })
  .catch(err => {
    console.error('Error sending notification:', err);
  });
