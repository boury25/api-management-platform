import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Browser-tab favicon — a lightning bolt on the brand indigo square.
 * Next.js serves this automatically as /icon.png and links it in <head>.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#4f46e5', // brand-600
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Zap / lightning-bolt — matches the Sidebar logo icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="white"
          stroke="none"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
