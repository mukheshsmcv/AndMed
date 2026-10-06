import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  }
});

async function run() {
  const email = `test+${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  
  console.log(`Attempting to sign up with ${email}`);
  
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    console.error('Signup Error:', {
      message: error.message,
      status: error.status,
      name: error.name
    });
  } else {
    console.log('Signup Success:', data.user ? 'User created' : 'No user returned');
    console.log('Session present?', !!data.session);
  }
}

run();
