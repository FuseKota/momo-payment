-- 00027_add_news_image.sql
-- ニュース記事にメイン画像URLを追加（管理画面からアップロードした画像を表示）。

alter table public.news add column if not exists image_url text;
