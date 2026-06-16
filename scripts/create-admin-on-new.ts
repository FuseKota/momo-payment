/**
 * 新本番(momomusume-main)に管理者アカウントを作成する使い捨て・冪等スクリプト。
 *
 * .env.local から以下を読む:
 *   NEW_SUPABASE_URL        … 新プロジェクトのURL（書き込み先）
 *   NEW_SERVICE_ROLE_KEY    … 新プロジェクトの service_role キー
 *   SETUP_ADMIN_EMAIL       … 作成する管理者メール（一時的に追記）
 *   SETUP_ADMIN_PASSWORD    … 同パスワード（8文字以上・一時的に追記）
 *
 * 使い方:
 *   npx tsx scripts/create-admin-on-new.ts
 *
 * 作成後は SETUP_ADMIN_EMAIL / SETUP_ADMIN_PASSWORD の2行を .env.local から削除すること。
 * 既に同じメールのユーザーが存在する場合は、その user_id に admin 権限だけ付与する（冪等）。
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dstUrl = process.env.NEW_SUPABASE_URL;
const dstKey = process.env.NEW_SERVICE_ROLE_KEY;
const email = process.env.SETUP_ADMIN_EMAIL;
const password = process.env.SETUP_ADMIN_PASSWORD;

if (!dstUrl || !dstKey) {
  console.error('❌ NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY が .env.local にありません');
  process.exit(1);
}
if (!email || !password) {
  console.error('❌ SETUP_ADMIN_EMAIL / SETUP_ADMIN_PASSWORD を .env.local に一時追記してください');
  process.exit(1);
}
if (password.length < 8) {
  console.error('❌ パスワードは8文字以上にしてください');
  process.exit(1);
}

const supabase = createClient(dstUrl, dstKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** メールから既存ユーザーの id を探す（admin API をページングして照合） */
async function findUserIdByEmail(target: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main(): Promise<void> {
  const ref = new URL(dstUrl!).hostname.split('.')[0];
  console.log(`書き込み先(新/本番): ${ref}`);
  console.log(`管理者メール        : ${email}\n`);

  let userId: string | null = null;

  const { data, error } = await supabase.auth.admin.createUser({
    email: email!,
    password: password!,
    email_confirm: true,
  });

  if (error) {
    // 既存ユーザーなら権限付与だけ行う
    if (/already.*registered|already.*exists|email.*exists/i.test(error.message)) {
      console.log('ℹ️ 同じメールのユーザーが既に存在 → 権限付与のみ行います');
      userId = await findUserIdByEmail(email!);
      if (!userId) {
        console.error('❌ 既存ユーザーの id を特定できませんでした');
        process.exit(1);
      }
    } else {
      console.error('❌ ユーザー作成失敗:', error.message);
      process.exit(1);
    }
  } else {
    userId = data.user.id;
  }

  const { error: adminErr } = await supabase
    .from('admin_users')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });

  if (adminErr) {
    console.error('❌ admin_users 登録失敗:', adminErr.message);
    process.exit(1);
  }

  console.log(`\n✅ 管理者を作成/設定しました  user_id=${userId}`);
  console.log('   .env.local の SETUP_ADMIN_EMAIL / SETUP_ADMIN_PASSWORD は削除してください。');
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
