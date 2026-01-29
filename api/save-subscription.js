const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dWphZHlxZWJmeXB5aGZ1d2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk3NDg0MiwiZXhwIjoyMDc4NTUwODQyfQ.iKmCXueeH4wOp6CzR3VgA4uqS3N40svSytRK6a6wYGI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { user_id, endpoint, keys } = req.body;
  if (!endpoint || !keys) {
    res.status(400).json({ error: 'Invalid subscription' });
    return;
  }
  const { error } = await supabase
    .from('web_push_subscriptions')
    .upsert({ user_id, endpoint, keys }, { onConflict: ['endpoint'] });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true });
};