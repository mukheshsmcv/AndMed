import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function run() {
  const testEmail = 'test_dev_ande@example.com';
  const testPassword = 'TestPassword123!';

  // 1. Check if user exists using admin API
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('Failed to list users:', listError);
    return;
  }

  let user = users.users.find(u => u.email === testEmail);

  if (!user) {
    console.log(`Test user ${testEmail} does not exist. Creating via admin API to bypass rate limits...`);
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true // bypasses email sending and confirmation
    });

    if (createError) {
      console.error('Failed to create test user via admin:', createError);
      return;
    }
    user = createData.user;
    console.log('Test user created successfully via Admin API.');
  } else {
    console.log(`Test user ${testEmail} already exists.`);
  }

  // 2. Test login via ANON key (simulating mobile app)
  console.log(`Attempting to sign in with ${testEmail} via ANON API...`);
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (loginError) {
    console.error('Login failed:', {
      message: loginError.message,
      status: loginError.status,
      name: loginError.name
    });
  } else {
    console.log('Login Success! Session retrieved:', !!loginData.session);
    console.log('Access token starts with:', loginData.session?.access_token.substring(0, 15) + '...');
  }
}

run();
