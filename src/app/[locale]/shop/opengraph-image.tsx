import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'もも娘 オンラインショップ - 台湾料理の通販';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #FFF0F3 0%, #FFD6DE 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: 60,
        }}
      >
        <div
          style={{
            fontSize: 36,
            color: '#999',
            marginBottom: 16,
            fontWeight: 500,
          }}
        >
          momomusume
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#FF4466',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Online Shop
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#CC3355',
            textAlign: 'center',
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Lu Rou Fan &amp; Taiwan Frozen Foods
        </div>
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 12,
          }}
        >
          {['🍚 Lu Rou Fan', '🥟 Taiwan Dumplings', '🎁 Goods'].map((item) => (
            <div
              key={item}
              style={{
                background: 'rgba(255,255,255,0.8)',
                borderRadius: 12,
                padding: '8px 20px',
                fontSize: 24,
                color: '#FF6680',
                fontWeight: 600,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
