import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanup() {
  await supabase.from('questions').delete().eq('import_id', 'Q-TEST-E2E-001');
  const { data } = await supabase.auth.admin.listUsers();
  const user = data?.users?.find(u => u.email === 'e2e-test-user@ande-med.local');
  if (user) await supabase.auth.admin.deleteUser(user.id);
  console.log('Cleanup done');
}

cleanup();
