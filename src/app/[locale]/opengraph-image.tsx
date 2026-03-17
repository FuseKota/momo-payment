import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'もも娘 - 福島の本格台湾料理';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #FFF0F3 0%, #FFCCD5 50%, #FFB3C1 100%)',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF859A 0%, #FF6680 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              marginRight: 20,
            }}
          >
            🍑
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#FF4466',
              letterSpacing: '-2px',
            }}
          >
            momomusume
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#CC3355',
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Fukushima Taiwan Cuisine
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#888',
            textAlign: 'center',
          }}
        >
          Lu Rou Fan &amp; Taiwan Street Food
        </div>
      </div>
    ),
    { ...size }
  );
}
