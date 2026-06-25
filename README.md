# momo-payment

「もも娘」オンライン注文システム。冷凍食品・グッズをオンライン決済（Stripe）で配送する EC サイト。

## 主な機能

- **配送EC（SHIPPING）**: 冷凍食品・グッズを Stripe オンライン決済で配送
- **ニュース**: お知らせ一覧・詳細（Markdown）
- **マイページ**: 注文履歴・配送先住所管理
- **管理画面**: 商品・在庫・注文・ニュース・売上ダッシュボード・監査ログ
- **多言語対応**: 日本語 / 繁体字中文 / 英語（next-intl）

## 技術スタック

- Next.js 15 (App Router) / TypeScript
- MUI (Material UI v7) + Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Stripe SDK v20（決済）/ Resend（メール通知）
- next-intl v4（i18n / ja・zh-tw・en）
- Vitest（テスト）
- ホスティング: Netlify

## セットアップ

```bash
npm install
cp .env.example .env.local   # 各種キーを設定（詳細は .env.example 参照）
npm run dev                  # http://localhost:3000
```

## よく使うコマンド

```bash
npm run dev           # 開発サーバー起動
npm run build         # 本番ビルド
npm run start         # 本番サーバー起動
npm run lint          # ESLint
npm run test          # テスト（Vitest）
npm run create-admin  # 管理者アカウント作成
```

### Stripe ローカルテスト

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## ドキュメント

詳細は `docs/` を参照してください。

| ファイル | 内容 |
|---------|------|
| `docs/REQUIREMENTS.md` | 要件定義（API・画面遷移・DB スキーマ） |
| `docs/SYSTEM_ARCHITECTURE.md` | システム構成 |
| `docs/DATABASE_DESIGN.md` | データベース設計 |
| `docs/TECHNICAL.md` | 技術詳細 |
| `docs/SCREEN_DESIGN.md` | 画面設計 |
| `docs/FEATURE_LIST.md` | 機能一覧 |
| `docs/DEPLOYMENT_SELF_HOSTED.md` | デプロイ手順 |
| `docs/OPERATIONS_MANUAL.md` | 運用マニュアル |
