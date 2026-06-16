# 本番公開 残タスク（LAUNCH TODO）

最終更新: 2026-06-10

dev/prod分離・セキュリティ対応の過程で出た、本番公開までの未了タスク。
凡例: ☐ 未了 / ☑ 完了 ／ 担当: **[開発]** **[社長/ドメイン管理]** **[業務判断]**

> 接続情報の実値（プロジェクトref・APIキー・管理者メール等）は `.env.local` を参照。
> このファイルを公開リポジトリにコミットする場合は、秘密情報・個人情報を書かないこと。

---

## A. メール送信（Resend + 独自ドメイン）★社長の作業待ち

送信元を `info@sakura-sisters.com` にする。コード側は `EMAIL_FROM` 駆動で対応済み。
現状の送信元 `onboarding@resend.dev` は Resend登録者本人にしか届かない＝**本番では注文確認/会員登録メールが未達**。

- ☐ **[社長]** Resend → Domains → Add Domain `sakura-sisters.com` → 提示DNSレコードを取得
- ☐ **[社長]** Xserver「DNSレコード設定」にResendのレコードを追加（SPFは1ドメイン1本にマージ）→ **Verified**
- ☐ **[社長→開発]** 認証したResendアカウントの **APIキー（`re_...`）** を共有
- ☐ **[開発]** Netlify env: `EMAIL_FROM=info@sakura-sisters.com` ＋ `RESEND_API_KEY=<上記>`
- ☐ **[開発]** ローカル `.env.local` も同様に更新
- ☐ **[開発]** Supabase カスタムSMTP（Auth → SMTP）: sender=`info@sakura-sisters.com` / host=`smtp.resend.com` / port=`465` / user=`resend` / pass=APIキー
- ☐ **[開発]** Auth → Rate Limits の「sending emails」上限を引き上げ
- ☐ **[開発]** 外部アドレスへテスト送信（会員登録確認＋注文確認が届くか）
- ☑ **[開発]** コード: 送信元ハードコード無し・`EMAIL_FROM` 駆動を確認、stale fallback修正（`resend.ts`）
- ⚠ 要確認: 現 `.env.local` の `RESEND_API_KEY` が社長アカウントと同一か（同一なら手戻り減）

## B. Supabase Auth Attack Protection（新本番）[開発・ダッシュボード]

Pro化済みで利用可。login直送のブルートフォース対策。

- ☑ 漏洩パスワード保護ON ＋ 最小パスワード長8（2026-06-10完了）。アプリ側も最小8＋`passwordWeak`メッセージに対応済（`login/page.tsx`・ja/zh-tw・202テスト通過）
- ☑ Auth → Rate Limits の「sign-ups and sign-ins」確認（30/5分のまま）
- ☐ (任意) CAPTCHA：**有効化前にフロント実装が必須**（hCaptcha/Turnstile + `captchaToken`）。未実装でONにすると本番のログイン/新規登録が全停止

## C. サイト用ドメイン `momomusume.com`（未登録）[開発/業務]

メール用 `sakura-sisters.com` とは別。サイトURL系に使う。

- ☐ レジストラで取得（Netlify直 / Cloudflare / お名前.com 等）＋ Whois代行ON
- ☐ DNSをNetlifyに接続
- ☐ 反映: `NEXT_PUBLIC_APP_URL` / Supabase Auth の Site URL・Redirect URLs / Stripe Webhook / SEO(robots/sitemap)

## D. 本番カットオーバー（dev/prod分離の仕上げ）[開発]

- ☐ 新本番に管理者作成: `scripts/create-admin-on-new.ts`（`.env.local` に `SETUP_ADMIN_EMAIL`/`SETUP_ADMIN_PASSWORD` を一時設定→実行→2行削除）
- ☐ Netlify env を新本番Supabaseに切替（`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`）→ **Clear cache & deploy**
- ☐ Stripe Webhook を本番エンドポイントに登録（`whsec_` 更新、events: `checkout.session.completed` / `checkout.session.expired`）
- ☐ 切替後の動作確認（商品表示 / 画像 / 管理ログイン / テスト注文）
- ☑ 新本番へスキーマ＋コンテンツ＋画像を移行（migration `00001`〜`00020` 適用済）

## E. セキュリティ残（任意 / 業務判断）

- ☐ **[業務判断]** 在庫の売り越し対策（PICKUP注文の在庫チェック / `products.stock_qty` 減算が全経路で欠落）
- ☐ (任意) gitleaks を GitHub Actions CI に追加（秘密コミットの再発防止）
- ☑ Vercelトークン revoke（git履歴の漏洩・2026-06-10対応、gitleaksで全履歴クリーン確認）
- ☑ Next.js 15.5.19 昇格・PII Cache-Control・variant `is_active`・DB advisor 固定 等（A/B/C・202テスト通過）

---

### 依存関係メモ
- **A（メール）** は社長のResend/Xserver作業が前提 → それ待ち。
- **C（momomusume.com）** はサイトURL系（Auth Site URL・Stripe Webhook）の前提 → カットオーバー前に決めると手戻りが少ない。
- **D（カットオーバー）** は B・C を済ませてから実施するのが理想（空き本番への切替・URL不一致を避ける）。
