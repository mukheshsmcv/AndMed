import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test_admin_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  
  console.log(`Attempting to sign up with ${email} using admin API`);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  
  if (error) {
    console.error('Admin Signup Error:', {
      message: error.message,
      status: error.status,
      name: error.name
    });
  } else {
    console.log('Signup Success:', data.user ? 'User created' : 'No user returned');
    
    // Now try to fetch the profile to see if it was created
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (profileError) {
         console.error('Profile fetch error:', profileError);
      } else {
         console.log('Profile created successfully:', profile);
      }
    }
  }
}

run();
