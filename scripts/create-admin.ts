/**
 * 管理者アカウント作成スクリプト
 * 使用方法: npm run create-admin
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log('=== 管理者アカウント作成 ===\n');

  const email = await question('メールアドレス: ');
  const password = await question('パスワード（8文字以上）: ');

  rl.close();

  // Supabase Auth にユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('❌ ユーザー作成失敗:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;

  // admin_users テーブルに登録
  const { error: adminError } = await supabase
    .from('admin_users')
    .insert({ user_id: userId });

  if (adminError) {
    console.error('❌ admin_users 登録失敗:', adminError.message);
    // 作成したAuthユーザーを削除
    await supabase.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  console.log(`\n✅ 管理者アカウントを作成しました`);
  console.log(`   メールアドレス: ${email}`);
  console.log(`   ユーザーID: ${userId}`);
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
