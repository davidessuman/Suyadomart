

// This is a simple Express.js server to receive and store push subscriptions in Supabase
// and to send push notifications using web-push.

const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Root route for friendly message
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.send('Push Notification Server is running!');
});

// Set your Supabase credentials
const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dWphZHlxZWJmeXB5aGZ1d2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk3NDg0MiwiZXhwIjoyMDc4NTUwODQyfQ.iKmCXueeH4wOp6CzR3VgA4uqS3N40svSytRK6a6wYGI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Set your VAPID keys
webpush.setVapidDetails(
  'mailto:your@email.com',
  'BJBZSDczPaVSiRj49xRx35WXIueIqgYInu7mzMP0XBlAog-zfUXvDyYony_yBUwG4RKURnYTcqXWKNtFgR5KTnc',
  '2nvpWk1NYdMrMY1DA88OHDyzE7g88TfjOecy7HRFSeA'
);

// Endpoint to save subscription
app.post('/api/save-subscription', async (req, res) => {
  const { user_id, endpoint, keys } = req.body;
  if (!endpoint || !keys) return res.status(400).json({ error: 'Invalid subscription' });
  // Upsert subscription for user
  const { error } = await supabase
    .from('web_push_subscriptions')
    .upsert({ user_id, endpoint, keys }, { onConflict: ['endpoint'] });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Endpoint to send notification to a user
app.post('/api/send-notification', async (req, res) => {
  const { user_id, title, body, url } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  const { data, error } = await supabase
    .from('web_push_subscriptions')
    .select('*')
    .eq('user_id', user_id);
  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: 'No subscription found' });
  const payload = JSON.stringify({ title, body, url });
  const results = [];
  for (const sub of data) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
      results.push({ endpoint: sub.endpoint, success: true });
    } catch (err) {
      results.push({ endpoint: sub.endpoint, success: false, error: err.message });
    }
  }
  res.json({ results });
});

const PORT = process.env.PORT || 4000;
console.log('About to start server...');
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
