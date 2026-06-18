'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Lantern from './components/Lantern';
import TaiwanNightMarketHeader from './components/TaiwanNightMarketHeader';
import TaiwanNightMarketFooter from './components/TaiwanNightMarketFooter';
import IitateCalendar from './components/IitateCalendar';
import { NewsSection } from '@/components/common';
import styles from './taiwan-night-market.module.css';
import type { News } from '@/types/database';
import { getLocalizedNewsTitle, getLocalizedNewsExcerpt } from '@/lib/utils/localize-news';

// 画像は本番 Supabase Storage に配置（wikimedia の thumb はホットリンク制限で400になるため）。
// アップロードは scripts/upload-night-market-images.ts。URL は DB 移行に追従するよう env 基準。
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/night-market`;
const NIGHT_MARKET_IMAGES: Record<string, string> = {
  'shilin-night-market': `${STORAGE_BASE}/shilin-night-market.jpg`,
  'raohe-night-market': `${STORAGE_BASE}/raohe-night-market.jpg`,
  'ningxia-night-market': `${STORAGE_BASE}/ningxia-night-market.jpg`,
  'fengjia-night-market': `${STORAGE_BASE}/fengjia-night-market.jpg`,
  'liuhe-night-market': `${STORAGE_BASE}/liuhe-night-market.jpg`,
  'ruifeng-night-market': `${STORAGE_BASE}/ruifeng-night-market.jpg`,
};
const FALLBACK_IMAGE = `${STORAGE_BASE}/shilin-night-market.jpg`;

const HARDCODED_CARDS = [
  {
    key: 'shilin',
    img: NIGHT_MARKET_IMAGES['shilin-night-market'],
    titleKey: 'shilinTitle' as const,
    descKey: 'shilinDesc' as const,
  },
  {
    key: 'raohe',
    img: NIGHT_MARKET_IMAGES['raohe-night-market'],
    titleKey: 'raoheTitle' as const,
    descKey: 'raoheDesc' as const,
  },
  {
    key: 'ningxia',
    img: NIGHT_MARKET_IMAGES['ningxia-night-market'],
    titleKey: 'ningxiaTitle' as const,
    descKey: 'ningxiaDesc' as const,
  },
];

interface Props {
  momoNews: News[];
  domesticNews: News[];
  taiwanArticles: News[];
}

export default function TaiwanNightMarketClient({ momoNews, domesticNews, taiwanArticles }: Props) {
  const t = useTranslations('taiwanNightMarket');
  const locale = useLocale();

  useEffect(() => {
    // スクロールアニメーション
    const faders = document.querySelectorAll('.fade-in-up');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('appear');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    faders.forEach((el) => observer.observe(el));

    // ヒーロー順番演出: 1.両端ランタン → 2.内側ランタン → 3.門 → 4.テキスト(CSS)
    const timers = [
      setTimeout(() => {
        document.querySelectorAll('[data-hero="outer"]').forEach((el) => el.classList.add('appear'));
      }, 100),
      setTimeout(() => {
        document.querySelectorAll('[data-hero="inner"]').forEach((el) => el.classList.add('appear'));
      }, 600),
      setTimeout(() => {
        document.querySelector('[data-hero="gate"]')?.classList.add('appear');
      }, 1100),
    ];

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      <TaiwanNightMarketHeader />
      <div className={styles.pageWrapper}>
        {/* Hero */}
        <header className={styles.hero}>
          {/* 3. 門（ランタンの後に表示） */}
          <div className={styles.gateLayer} data-hero="gate" />
          <div className={styles.lanternContainer}>
            {/* 1. 両端のランタン */}
            <Lantern size="lg" positionClass={styles.l7} heroGroup="outer" />
            <Lantern size="lg" positionClass={styles.l8} heroGroup="outer" />
            {/* 2. 内側のランタン */}
            <Lantern size="md" positionClass={styles.l1} heroGroup="inner" />
            <Lantern size="sm" positionClass={styles.l6} heroGroup="inner" />
          </div>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{t('guideTitle')}</h1>
            <p className={styles.heroSubtitle}>{t('guideSubtitle')}</p>
          </div>
        </header>

        {/* ① 福島ももむすめ イベント情報 */}
        <NewsSection
          items={momoNews}
          variant="dark"
          title={t('momoEventsTitle')}
          showViewAll={false}
        />

        {/* ② 飯舘村台湾夜市カレンダー */}
        <IitateCalendar />

        {/* ③ 日本国内 台湾夜市情報 */}
        <NewsSection
          items={domesticNews}
          variant="dark"
          title={t('domesticEventsTitle')}
          showViewAll={false}
        />

        {/* ③ 本場台湾の夜市情報 */}
        <section id="popular" className={styles.section}>
          <h2 className={`${styles.sectionTitle} fade-in-up`}>{t('taiwanNightMarketInfoTitle')}</h2>
          <div className={styles.gridContainer}>
            {taiwanArticles.length > 0
              ? taiwanArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/news/${article.slug}`}
                    className={styles.cardLink}
                  >
                    <div
                      className={`${styles.card} fade-in-up`}
                      style={{ transitionDelay: `${(index % 3) * 0.1 + 0.1}s` }}
                    >
                      <div
                        className={styles.cardImg}
                        style={{ backgroundImage: `url('${NIGHT_MARKET_IMAGES[article.slug] ?? FALLBACK_IMAGE}')` }}
                      />
                      <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>{getLocalizedNewsTitle(article, locale)}</h3>
                        <p className={styles.cardDesc}>{getLocalizedNewsExcerpt(article, locale)}</p>
                      </div>
                    </div>
                  </Link>
                ))
              : HARDCODED_CARDS.map((card, index) => (
                  <div
                    key={card.key}
                    className={`${styles.card} fade-in-up`}
                    style={{ transitionDelay: `${index * 0.1 + 0.1}s` }}
                  >
                    <div className={styles.cardImg} style={{ backgroundImage: `url('${card.img}')` }} />
                    <div className={styles.cardContent}>
                      <h3 className={styles.cardTitle}>{t(card.titleKey)}</h3>
                      <p className={styles.cardDesc}>{t(card.descKey)}</p>
                    </div>
                  </div>
                ))}
          </div>
        </section>


      </div>
      <TaiwanNightMarketFooter />
    </>
  );
}
