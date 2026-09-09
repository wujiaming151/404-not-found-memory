import { ImageResponse } from 'next/og';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#3e6551',
        color: '#f7f8f6',
        borderRadius: 16,
        fontSize: 40,
      }}
    >
      M
    </div>,
    size,
  );
}
