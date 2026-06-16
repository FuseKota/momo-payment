/**
 * コンテンツ移行スクリプト（使い捨て・冪等）
 * 旧プロジェクト(momomusume / 開発DB)から新本番(momomusume-main)へ
 * コンテンツ（商品・バリアント・ニュース・台湾夜市カレンダー）と
 * 商品画像（Storage）を移行する。注文・決済・顧客などのデータは移行しない。
 *
 * 使い方:
 *   NEW_SUPABASE_URL=https://vlxwkjhdstwrrhyvxxth.supabase.co \
 *   NEW_SERVICE_ROLE_KEY=eyJ...（新プロジェクトの service_role キー） \
 *   npx tsx scripts/migrate-content-to-prod.ts
 *
 * 読み取り元（旧/開発DB）は .env.local の
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を使用する。
 * id で upsert し、画像も upsert アップロードするため、何度実行しても安全。
 * 移行が完了したらこのファイルは削除してよい。
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SRC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DST_URL = process.env.NEW_SUPABASE_URL;
const DST_KEY = process.env.NEW_SERVICE_ROLE_KEY;

if (!SRC_URL || !SRC_KEY) {
  console.error('❌ 読み取り元（.env.local の NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）が未設定');
  process.exit(1);
}
if (!DST_URL || !DST_KEY) {
  console.error('❌ 書き込み先（環境変数 NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY）が未設定');
  process.exit(1);
}
if (SRC_URL === DST_URL) {
  console.error('❌ 読み取り元と書き込み先が同一プロジェクトです。中断します。');
  process.exit(1);
}

const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const BUCKET = 'product-images';
const srcRef = new URL(SRC_URL).hostname.split('.')[0];
const dstRef = new URL(DST_URL).hostname.split('.')[0];
const srcHost = `${srcRef}.supabase.co`;

/** テーブルを丸ごと upsert でコピー（id で衝突解決） */
async function copyTable(table: string): Promise<void> {
  const { data, error } = await src.from(table).select('*');
  if (error) throw new Error(`read ${table}: ${error.message}`);
  if (!data || data.length === 0) {
    console.log(`- ${table}: 0件（skip）`);
    return;
  }
  const { error: upErr } = await dst.from(table).upsert(data, { onConflict: 'id' });
  if (upErr) throw new Error(`write ${table}: ${upErr.message}`);
  console.log(`✓ ${table}: ${data.length}件 upsert`);
}

/** 公開URLから object path（<slug>/<file>）を取り出す */
function extractPath(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/** 旧バケット（公開URL）から取得して新バケットへ同じパスでアップロード */
async function copyObject(objectPath: string): Promise<boolean> {
  const downloadUrl = `${SRC_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    console.warn(`  ! 画像取得失敗 ${objectPath}: HTTP ${res.status}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const { error } = await dst.storage.from(BUCKET).upload(objectPath, buf, { contentType, upsert: true });
  if (error) {
    console.warn(`  ! アップロード失敗 ${objectPath}: ${error.message}`);
    return false;
  }
  console.log(`  ↳ image copied: ${objectPath}`);
  return true;
}

/** 新DBの products を走査し、旧Storage URL の画像をコピー & URL を新ドメインに書き換え */
async function copyStorageAndRewrite(): Promise<void> {
  const { data: products, error } = await dst.from('products').select('id, slug, image_url, images');
  if (error) throw new Error(`read dst products: ${error.message}`);

  for (const p of products ?? []) {
    let changed = false;
    let newImageUrl: string | null = p.image_url ?? null;
    const newImages: string[] = Array.isArray(p.images) ? [...p.images] : [];

    if (typeof p.image_url === 'string' && p.image_url.includes(srcHost)) {
      const objectPath = extractPath(p.image_url);
      if (objectPath) {
        await copyObject(objectPath);
        newImageUrl = p.image_url.replaceAll(srcRef, dstRef);
        changed = true;
      }
    }

    for (let i = 0; i < newImages.length; i++) {
      const u = newImages[i];
      if (typeof u === 'string' && u.includes(srcHost)) {
        const objectPath = extractPath(u);
        if (objectPath) {
          await copyObject(objectPath);
          newImages[i] = u.replaceAll(srcRef, dstRef);
          changed = true;
        }
      }
    }

    if (changed) {
      const { error: uErr } = await dst
        .from('products')
        .update({ image_url: newImageUrl, images: newImages })
        .eq('id', p.id);
      if (uErr) throw new Error(`update product ${p.slug}: ${uErr.message}`);
      console.log(`✓ URL書き換え: ${p.slug}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`SRC（旧/開発）: ${srcRef}`);
  console.log(`DST（新/本番）: ${dstRef}\n`);

  // FK 順守のため products → product_variants の順
  await copyTable('products');
  await copyTable('product_variants');
  await copyTable('news');
  await copyTable('iitate_calendar_events');
  await copyTable('iitate_calendar_month_notes');

  console.log('\n画像コピー & URL書き換え...');
  await copyStorageAndRewrite();

  console.log('\n✅ コンテンツ移行が完了しました');
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
