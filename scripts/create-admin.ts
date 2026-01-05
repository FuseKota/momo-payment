import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: npm run create-admin <email> <password>');
    process.exit(1);
  }

  console.log(`Creating admin user: ${email}`);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create auth user:', authError.message);
    process.exit(1);
  }

  console.log('✓ Auth user created:', authData.user.id);

  // Add to admin_users table
  const { error: adminError } = await supabase.from('admin_users').insert({
    user_id: authData.user.id,
    role: 'admin',
  });

  if (adminError) {
    console.error('Failed to add admin role:', adminError.message);
    process.exit(1);
  }

  console.log('✓ Admin role assigned');
  console.log('\nAdmin user created successfully!');
  console.log(`Email: ${email}`);
}

createAdmin().catch(console.error);
