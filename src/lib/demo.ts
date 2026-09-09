export function createDemo(): string {
  const c = document.createElement('canvas');
  c.width = 960;
  c.height = 720;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 960, 720);
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const colors = [
    '#8faaa4',
    '#adc2b5',
    '#d9b991',
    '#c69a83',
    '#80968b',
    '#b8b9cb',
  ];
  for (let i = 0; i < 1800; i++) {
    const t = rand() * Math.PI * 2,
      r = Math.sqrt(rand()),
      px = 480 + Math.cos(t) * r * 340,
      py = 355 + Math.sin(t) * r * 220 + Math.sin(px / 105) * 32;
    x.globalAlpha = 0.2 + rand() * 0.35;
    x.fillStyle = colors[Math.floor(rand() * colors.length)];
    x.beginPath();
    x.ellipse(
      px,
      py,
      5 + rand() * 32,
      3 + rand() * 17,
      rand() * 3,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
  x.globalAlpha = 1;
  return c.toDataURL('image/png');
}
