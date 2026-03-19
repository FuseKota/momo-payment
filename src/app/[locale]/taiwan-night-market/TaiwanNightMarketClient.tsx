'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Lantern from './components/Lantern';
import TaiwanNightMarketHeader from './components/TaiwanNightMarketHeader';
import TaiwanNightMarketFooter from './components/TaiwanNightMarketFooter';
import { NewsSection } from '@/components/common';
import styles from './taiwan-night-market.module.css';
import type { News } from '@/types/database';

interface Props {
  news: News[];
}

export default function TaiwanNightMarketClient({ news }: Props) {
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

        {/* News Section */}
        <NewsSection items={news} variant="dark" />

        {/* 赤べこセクション */}
        <section className={styles.akabekoSection}>
          <div className={`${styles.akabekoWrapper} fade-in-up`}>
            <Image
              src="/images/akabeko.gif"
              alt="赤べこ"
              width={240}
              height={200}
              unoptimized
            />
            <p className={styles.akabekoLabel}>AKABEKO</p>
          </div>
        </section>

        {/* 人気夜市 */}
        <section id="popular" className={styles.section}>
          <h2 className={`${styles.sectionTitle} fade-in-up`}>{t('popularTitle')}</h2>
          <div className={styles.gridContainer}>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.1s' }}>
              <div
                className={styles.cardImg}
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543088267-85b42d7b51b3?q=80&w=1000&auto=format&fit=crop')" }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('shilinTitle')}</h3>
                <p className={styles.cardDesc}>{t('shilinDesc')}</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.2s' }}>
              <div
                className={styles.cardImg}
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577484462198-d19e917d0f95?q=80&w=1000&auto=format&fit=crop')" }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('raoheTitle')}</h3>
                <p className={styles.cardDesc}>{t('raoheDesc')}</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.3s' }}>
              <div
                className={styles.cardImg}
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506085183888-29be1900139e?q=80&w=1000&auto=format&fit=crop')" }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('ningxiaTitle')}</h3>
                <p className={styles.cardDesc}>{t('ningxiaDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 必食グルメ */}
        <section id="gourmet" className={`${styles.section} ${styles.sectionDark}`}>
          <h2 className={`${styles.sectionTitle} fade-in-up`}>{t('gourmetTitle')}</h2>
          <div className={styles.gridContainer}>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.1s' }}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('dajipaiTitle')}</h3>
                <p className={styles.cardDesc}>{t('dajipaiDesc')}</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.2s' }}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('xiaolongbaoTitle')}</h3>
                <p className={styles.cardDesc}>{t('xiaolongbaoDesc')}</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.3s' }}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('stinkyTofuTitle')}</h3>
                <p className={styles.cardDesc}>{t('stinkyTofuDesc')}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <TaiwanNightMarketFooter />
    </>
  );
}
