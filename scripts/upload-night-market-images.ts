/**
 * 台湾夜市カードの画像を wikimedia から取得し、リサイズして
 * 本番 Supabase Storage (product-images/night-market/) に配置する使い捨てスクリプト。
 *
 * wikimedia の thumb URL はホットリンク制限で 400 になるため、元画像(200)を取得して
 * 自前 Storage に持つ。これで TaiwanNightMarketClient のカード画像を安定配信する。
 *
 * 使い方:
 *   npx tsx scripts/upload-night-market-images.ts
 *   （.env.local の NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY を使用）
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DST_URL = process.env.NEW_SUPABASE_URL;
const DST_KEY = process.env.NEW_SERVICE_ROLE_KEY;

if (!DST_URL || !DST_KEY) {
  console.error('❌ NEW_SUPABASE_URL / NEW_SERVICE_ROLE_KEY が .env.local にありません');
  process.exit(1);
}

const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = 'product-images';
const PREFIX = 'night-market';

// wikimedia 元画像URL（thumb ではなく /commons/<hash>/<file>。これは 200 が返る）
const IMAGES: Record<string, string> = {
  'shilin-night-market': 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Shilin_night_market_alley_2.jpg',
  'raohe-night-market': 'https://upload.wikimedia.org/wikipedia/commons/9/97/East_Entrance_of_Raohe_Street_Night_Market_20060118_night.jpg',
  'ningxia-night-market': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Ningxia_Night_Market_20250520.jpg',
  'fengjia-night-market': 'https://upload.wikimedia.org/wikipedia/commons/8/80/1_fengjia_night_market_2019.jpg',
  'liuhe-night-market': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Liouho-Night-Market-Kaohsiung.jpg',
  'ruifeng-night-market': 'https://upload.wikimedia.org/wikipedia/commons/1/19/%E9%AB%98%E9%9B%84%E5%B8%82%E7%91%9E%E8%B1%90%E5%A4%9C%E5%B8%82%E8%88%87%E8%A3%95%E8%AA%A0%E8%B7%AF.jpg',
};

async function main(): Promise<void> {
  const ref = new URL(DST_URL!).hostname.split('.')[0];
  console.log(`書き込み先(本番): ${ref} / bucket=${BUCKET}/${PREFIX}\n`);

  for (const [slug, url] of Object.entries(IMAGES)) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'momo-payment/1.0 (https://taiwanyoichi-momomusume.com)' } });
      if (!res.ok) {
        console.error(`✗ ${slug}: ダウンロード失敗 HTTP ${res.status}`);
        continue;
      }
      const input = Buffer.from(await res.arrayBuffer());
      // カード用に 1200x800 (3:2) でカバー、JPEG 品質82
      const out = await sharp(input)
        .resize(1200, 800, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      const dstPath = `${PREFIX}/${slug}.jpg`;
      const { error } = await dst.storage.from(BUCKET).upload(dstPath, out, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '31536000',
      });
      if (error) {
        console.error(`✗ ${slug}: アップロード失敗 ${error.message}`);
        continue;
      }
      console.log(`✓ ${slug}: ${(input.length / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB  ${DST_URL}/storage/v1/object/public/${BUCKET}/${dstPath}`);
    } catch (e) {
      console.error(`✗ ${slug}: 例外`, e instanceof Error ? e.message : e);
    }
  }
  console.log('\n✅ 完了');
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
