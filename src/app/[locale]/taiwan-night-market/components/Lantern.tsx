'use client';

import styles from '../taiwan-night-market.module.css';

type LanternSize = 'sm' | 'md' | 'lg';

interface LanternProps {
  size: LanternSize;
  positionClass?: string;
  heroGroup?: string;
}

const sizeConfig: Record<LanternSize, { w: number; animDur: string }> = {
  sm: { w: 100, animDur: '3.8s' },
  md: { w: 160, animDur: '3.2s' },
  lg: { w: 240, animDur: '4.1s' },
};

export default function Lantern({ size, positionClass = '', heroGroup }: LanternProps) {
  const { w, animDur } = sizeConfig[size];

  return (
    <div
      className={`${styles.lanternWrap} ${styles[size]} ${positionClass}`}
      style={{ animationDuration: animDur, width: w }}
      data-hero={heroGroup}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/lantern.png"
        alt="提灯"
        width={w}
        style={{ display: 'block' }}
        draggable={false}
      />
    </div>
  );
}
