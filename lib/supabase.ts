
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project values
const supabaseUrl = 'https://qwujadyqebfypyhfuwfl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dWphZHlxZWJmeXB5aGZ1d2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzQ4NDIsImV4cCI6MjA3ODU1MDg0Mn0.-sl9REpef-rLHSODobHnFNSqW53w9Y3h6gWY3b5m1K0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);