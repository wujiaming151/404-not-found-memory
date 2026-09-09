/** Procedural sample artwork, not a reconstruction of any third-party brand asset. */
export function createConstellation() {
  const c = document.createElement('canvas');
  c.width = 960;
  c.height = 720;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 960, 720);
  let seed = 214;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const colors = [
    '#8052ff',
    '#ffb829',
    '#23ad96',
    '#df69b3',
    '#697df1',
    '#ed9464',
  ];
  // Folded, asymmetrical memory cloud. Fine gaps survive pixel sampling.
  for (let i = 0; i < 9500; i++) {
    const angle = random() * Math.PI * 2,
      radius = Math.sqrt(random());
    const ripple = 1 + 0.12 * Math.sin(angle * 3) + 0.07 * Math.cos(angle * 5);
    const px = 490 + Math.cos(angle) * 290 * radius * ripple;
    const py = 345 + Math.sin(angle) * 220 * radius + Math.sin(px * 0.016) * 35;
    if (Math.abs(px - 495) < 10 && random() > 0.25) continue;
    const color =
      colors[
        Math.floor((angle / (Math.PI * 2)) * 3 + random() * 3) % colors.length
      ];
    x.fillStyle = color;
    x.globalAlpha = 1;
    const size = 1.7 + random() * 3.5;
    x.beginPath();
    x.moveTo(px, py - size);
    x.lineTo(px + size * 0.86, py + size * 0.5);
    x.lineTo(px - size * 0.86, py + size * 0.5);
    x.closePath();
    x.fill();
  }
  return c.toDataURL('image/png');
}
