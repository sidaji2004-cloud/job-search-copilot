'use client';
import { useEffect, useRef } from 'react';

export default function StarBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const makeRng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };

    const draw = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      cv.width = W;
      cv.height = H;

      // Jittered grid — one star per cell, eliminates clustering
      const cellW = 102, cellH = 98;
      const cols = Math.ceil(W / cellW) + 1;
      const rows = Math.ceil(H / cellH) + 1;
      const rand = makeRng(54321);

      const stars: { x: number; y: number; sz: number; a: number }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          stars.push({
            x: c * cellW + rand() * cellW,
            y: r * cellH + rand() * cellH,
            sz: rand() * 1.05 + 0.28,
            a: rand() * 0.20 + 0.07,
          });
        }
      }

      // Connection lines — very faint, only between nearby stars
      const maxDist = 152;
      const maxDist2 = maxDist * maxDist;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxDist2) {
            const alpha = (1 - Math.sqrt(d2) / maxDist) * 0.065;
            ctx.strokeStyle = `rgba(148,165,244,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      // Stars — soft glow + crisp core
      stars.forEach(s => {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.sz * 5.5);
        g.addColorStop(0, `rgba(182,194,255,${s.a * 0.35})`);
        g.addColorStop(1, 'rgba(94,106,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.sz * 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(224,230,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.sz, 0, Math.PI * 2);
        ctx.fill();
      });

      // 8 feature stars — fixed fractional positions so they're always spread
      const features: [number, number][] = [
        [0.07, 0.09], [0.91, 0.07], [0.22, 0.53],
        [0.78, 0.47], [0.44, 0.21], [0.56, 0.79],
        [0.14, 0.83], [0.85, 0.68],
      ];
      features.forEach(([fx, fy]) => {
        const x = fx * W, y = fy * H;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 15);
        g.addColorStop(0, 'rgba(210,220,255,0.22)');
        g.addColorStop(1, 'rgba(94,106,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(238,243,255,0.42)';
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
