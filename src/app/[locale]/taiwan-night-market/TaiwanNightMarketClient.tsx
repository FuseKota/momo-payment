'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Lantern from './components/Lantern';
import TaiwanNightMarketHeader from './components/TaiwanNightMarketHeader';
import TaiwanNightMarketFooter from './components/TaiwanNightMarketFooter';
import { NewsSection } from '@/components/common';
import styles from './taiwan-night-market.module.css';
import type { News } from '@/types/database';

const NIGHT_MARKET_IMAGES: Record<string, string> = {
  'shilin-night-market': 'https://images.unsplash.com/photo-1543088267-85b42d7b51b3?q=80&w=1000&auto=format&fit=crop',
  'raohe-night-market': 'https://images.unsplash.com/photo-1577484462198-d19e917d0f95?q=80&w=1000&auto=format&fit=crop',
  'ningxia-night-market': 'https://images.unsplash.com/photo-1506085183888-29be1900139e?q=80&w=1000&auto=format&fit=crop',
  'fengjia-night-market': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop',
  'liuhe-night-market': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop',
  'ruifeng-night-market': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=1000&auto=format&fit=crop',
};
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1543088267-85b42d7b51b3?q=80&w=1000&auto=format&fit=crop';

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

        {/* ② 日本国内 台湾夜市情報 */}
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
                  <div
                    key={article.id}
                    className={`${styles.card} fade-in-up`}
                    style={{ transitionDelay: `${(index % 3) * 0.1 + 0.1}s` }}
                  >
                    <div
                      className={styles.cardImg}
                      style={{ backgroundImage: `url('${NIGHT_MARKET_IMAGES[article.slug] ?? FALLBACK_IMAGE}')` }}
                    />
                    <div className={styles.cardContent}>
                      <h3 className={styles.cardTitle}>{article.title}</h3>
                      <p className={styles.cardDesc}>{article.excerpt}</p>
                      <Link
                        href={`/news/${article.slug}`}
                        style={{
                          display: 'inline-block',
                          marginTop: '1rem',
                          color: 'var(--tnm-accent-gold, #fbc02d)',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          borderBottom: '1px solid transparent',
                        }}
                      >
                        {t('readMore')} →
                      </Link>
                    </div>
                  </div>
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
