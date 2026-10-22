import { useEffect, useRef } from "react";

const SPACING = 22;
const DOT_RADIUS = 1.15;
const TAU = Math.PI * 2;
const BUCKET_ALPHAS = [0.04, 0.055, 0.07, 0.085, 0.1, 0.115, 0.13, 0.145];

/**
 * Decorative interactive dot field for the home hero.
 * Dots ride slow ambient sine waves; moving the mouse/finger through the hero
 * sends soft ripple rings across the grid. Canvas keeps it smooth and the
 * interaction is passive, so scrolling and links keep working normally.
 */
export default function HeroDotWaves() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.closest("section");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !section || !ctx) return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ripples = [];
    const buckets = BUCKET_ALPHAS.map(() => []);
    const pointer = { x: -9999, y: -9999, active: false };
    const lastRipple = { x: 0, y: 0, time: 0 };

    let dots = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let resizeFrame = 0;

    const rebuild = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          dots.push({ x, y, phase: (x * 0.013 + y * 0.019) % TAU });
        }
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        ctx.moveTo(dot.x + DOT_RADIUS, dot.y);
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, TAU);
      }
      ctx.fill();
    };

    const toLocal = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const spawnRipple = (x, y, amplitude) => {
      ripples.push({ x, y, born: performance.now() / 1000, amplitude });
      if (ripples.length > 9) ripples.shift();
    };

    const onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      const point = toLocal(event.clientX, event.clientY);
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.active = true;

      const now = performance.now() / 1000;
      const moved = Math.hypot(point.x - lastRipple.x, point.y - lastRipple.y);
      if (moved > 20 && now - lastRipple.time > 0.055) {
        spawnRipple(point.x, point.y, Math.min(13, 5 + moved * 0.14));
        lastRipple.x = point.x;
        lastRipple.y = point.y;
        lastRipple.time = now;
      }
    };

    const onPointerDown = (event) => {
      const point = toLocal(event.clientX, event.clientY);
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.active = true;
      spawnRipple(point.x, point.y, 15);
      lastRipple.x = point.x;
      lastRipple.y = point.y;
      lastRipple.time = performance.now() / 1000;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onTouchMove = (event) => {
      const now = performance.now() / 1000;
      let spawned = false;

      for (let i = 0; i < event.touches.length; i += 1) {
        const point = toLocal(event.touches[i].clientX, event.touches[i].clientY);
        pointer.x = point.x;
        pointer.y = point.y;
        pointer.active = true;

        const moved = Math.hypot(point.x - lastRipple.x, point.y - lastRipple.y);
        if (!spawned && moved > 24 && now - lastRipple.time > 0.08) {
          spawnRipple(point.x, point.y, 12);
          lastRipple.x = point.x;
          lastRipple.y = point.y;
          lastRipple.time = now;
          spawned = true;
        }
      }
    };

    const onTouchEnd = () => {
      pointer.active = false;
    };

    const render = (nowMs) => {
      raf = requestAnimationFrame(render);
      if (!visible) return;

      const t = nowMs / 1000;
      ctx.clearRect(0, 0, width, height);
      for (let b = 0; b < buckets.length; b += 1) buckets[b].length = 0;

      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        const { x, y } = dot;

        let dx = Math.cos(y * 0.016 + t * 0.95 + dot.phase) * 2.2;
        let dy =
          Math.sin(x * 0.018 + t * 1.1 + dot.phase * 0.6) * 3.6 +
          Math.sin(y * 0.021 - t * 0.85) * 2.8 +
          Math.sin((x + y) * 0.01 + t * 1.5) * 2.2;

        let glow = 0;

        for (let r = 0; r < ripples.length; r += 1) {
          const ripple = ripples[r];
          const age = t - ripple.born;
          if (age < 0 || age > 2.8) continue;

          const rx = x - ripple.x;
          const ry = y - ripple.y;
          const dist = Math.sqrt(rx * rx + ry * ry);
          const front = dist - age * 290;
          const sigma = 30 + age * 26;
          const envelope =
            Math.exp(-(front * front) / (2 * sigma * sigma)) * Math.exp(-age * 0.9);

          if (envelope < 0.003) continue;

          const push = envelope * ripple.amplitude * Math.cos(front * 0.05);
          if (dist > 0.001) {
            dx += (rx / dist) * push;
            dy += (ry / dist) * push;
          }
          glow += envelope * 0.05;
        }

        if (pointer.active) {
          const mx = x - pointer.x;
          const my = y - pointer.y;
          const distSq = mx * mx + my * my;
          const radius = 130;

          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq) || 1;
            const falloff = 1 - dist / radius;
            const push = falloff * falloff * 6;
            dx += (mx / dist) * push;
            dy += (my / dist) * push;
            glow += falloff * falloff * 0.04;
          }
        }

        let alpha = 0.062 + Math.min(0.042, Math.abs(dy) * 0.007) + Math.min(0.05, glow);
        alpha = Math.max(0.038, Math.min(0.15, alpha));

        const bucket = Math.max(
          0,
          Math.min(buckets.length - 1, Math.round((alpha - 0.04) / 0.015))
        );

        buckets[bucket].push(x + dx, y + dy);
      }

      for (let b = 0; b < buckets.length; b += 1) {
        const points = buckets[b];
        if (!points.length) continue;

        ctx.fillStyle = `rgba(255,255,255,${BUCKET_ALPHAS[b]})`;
        ctx.beginPath();
        for (let i = 0; i < points.length; i += 2) {
          ctx.moveTo(points[i] + DOT_RADIUS, points[i + 1]);
          ctx.arc(points[i], points[i + 1], DOT_RADIUS, 0, TAU);
        }
        ctx.fill();
      }

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        if (t - ripples[i].born > 2.8) ripples.splice(i, 1);
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => {
              rebuild();
              if (motionQuery.matches) drawStatic();
            });
          })
        : null;

    rebuild();

    if (motionQuery.matches) {
      drawStatic();
      if (resizeObserver) resizeObserver.observe(section);
      return () => {
        cancelAnimationFrame(resizeFrame);
        if (resizeObserver) resizeObserver.disconnect();
      };
    }

    section.addEventListener("pointermove", onPointerMove, { passive: true });
    section.addEventListener("pointerdown", onPointerDown, { passive: true });
    section.addEventListener("pointerleave", onPointerLeave, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: true });
    section.addEventListener("touchend", onTouchEnd, { passive: true });
    section.addEventListener("touchcancel", onTouchEnd, { passive: true });

    let intersectionObserver = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? true;
          if (!visible) {
            for (let i = 0; i < buckets.length; i += 1) buckets[i].length = 0;
          }
        },
        { threshold: 0 }
      );
      intersectionObserver.observe(canvas);
    }

    if (resizeObserver) resizeObserver.observe(section);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerdown", onPointerDown);
      section.removeEventListener("pointerleave", onPointerLeave);
      section.removeEventListener("touchmove", onTouchMove);
      section.removeEventListener("touchend", onTouchEnd);
      section.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
