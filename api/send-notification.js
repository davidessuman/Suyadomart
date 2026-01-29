const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dWphZHlxZWJmeXB5aGZ1d2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk3NDg0MiwiZXhwIjoyMDc4NTUwODQyfQ.iKmCXueeH4wOp6CzR3VgA4uqS3N40svSytRK6a6wYGI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

webpush.setVapidDetails(
  'mailto:your@email.com',
  'BJBZSDczPaVSiRj49xRx35WXIueIqgYInu7mzMP0XBlAog-zfUXvDyYony_yBUwG4RKURnYTcqXWKNtFgR5KTnc',
  '2nvpWk1NYdMrMY1DA88OHDyzE7g88TfjOecy7HRFSeA'
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { user_id, title, body, url } = req.body;
  if (!user_id) {
    res.status(400).json({ error: 'Missing user_id' });
    return;
  }
  const { data, error } = await supabase
    .from('web_push_subscriptions')
    .select('*')
    .eq('user_id', user_id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data || data.length === 0) {
    res.status(404).json({ error: 'No subscription found' });
    return;
  }
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
};