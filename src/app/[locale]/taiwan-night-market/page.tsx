'use client';

import { useEffect } from 'react';
import { Layout } from '@/components/common';
import Lantern from './components/Lantern';
import styles from './taiwan-night-market.module.css';

export default function TaiwanNightMarketPage() {
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
    <Layout>
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
            <h1 className={styles.heroTitle}>台湾夜市ガイド</h1>
            <p className={styles.heroSubtitle}>圧倒的な活気と美食の世界へ</p>
          </div>
        </header>

        {/* 人気夜市 */}
        <section id="popular" className={styles.section}>
          <h2 className={`${styles.sectionTitle} fade-in-up`}>人気夜市</h2>
          <div className={styles.gridContainer}>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.1s' }}>
              <div
                className={styles.cardImg}
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543088267-85b42d7b51b3?q=80&w=1000&auto=format&fit=crop')" }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>士林夜市 (シーリン)</h3>
                <p className={styles.cardDesc}>台北最大規模を誇る夜市。B級グルメからファッション、ゲームまで何でも揃う定番スポットです。</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.2s' }}>
              <div
                className={styles.cardImg}
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577484462198-d19e917d0f95?q=80&w=1000&auto=format&fit=crop')" }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>饒河街観光夜市 (ラオホー)</h3>
                <p className={styles.cardDesc}>一本道の分かりやすい構造。胡椒餅の行列は必見。ノスタルジックな雰囲気が魅力です。</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.3s' }}>
              <div
                className={styles.cardImg}
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506085183888-29be1900139e?q=80&w=1000&auto=format&fit=crop')" }}
              />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>寧夏夜市 (ニンシャー)</h3>
                <p className={styles.cardDesc}>「胃袋の夜市」と呼ばれるほどグルメに特化。地元民にも愛される美味しい屋台が密集しています。</p>
              </div>
            </div>
          </div>
        </section>

        {/* 必食グルメ */}
        <section id="gourmet" className={`${styles.section} ${styles.sectionDark}`}>
          <h2 className={`${styles.sectionTitle} fade-in-up`}>必食グルメ</h2>
          <div className={styles.gridContainer}>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.1s' }}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>大鶏排 (ダージーパイ)</h3>
                <p className={styles.cardDesc}>顔の大きさほどある巨大なフライドチキン。サクサクの衣と五香粉のスパイシーな香りが食欲をそそります。</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.2s' }}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>小籠包 (ショウロンポウ)</h3>
                <p className={styles.cardDesc}>薄い皮の中に熱々の肉汁がたっぷり。夜市の屋台でも本格的な味わいが楽しめます。</p>
              </div>
            </div>
            <div className={`${styles.card} fade-in-up`} style={{ transitionDelay: '0.3s' }}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>臭豆腐 (チョウドウフ)</h3>
                <p className={styles.cardDesc}>独特の香りが特徴ですが、食べるとやみつきになる美味しさ。揚げたものが初心者にはおすすめです。</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
