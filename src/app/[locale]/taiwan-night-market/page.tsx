'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Lantern from './components/Lantern';
import TaiwanNightMarketHeader from './components/TaiwanNightMarketHeader';
import TaiwanNightMarketFooter from './components/TaiwanNightMarketFooter';
import styles from './taiwan-night-market.module.css';

export default function TaiwanNightMarketPage() {
  const t = useTranslations('taiwanNightMarket');

  useEffect(() => {
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
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <TaiwanNightMarketHeader />
      <div className={styles.pageWrapper}>
        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.lanternContainer}>
            <Lantern size="sm" positionClass={styles.l6} />
            <Lantern size="md" positionClass={styles.l1} />
            <Lantern size="lg" positionClass={styles.l7} />
            <Lantern size="lg" positionClass={styles.l8} />
          </div>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{t('guideTitle')}</h1>
            <p className={styles.heroSubtitle}>{t('guideSubtitle')}</p>
          </div>
        </header>

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
