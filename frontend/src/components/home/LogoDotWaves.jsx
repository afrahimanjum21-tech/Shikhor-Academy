import { useEffect, useRef } from "react";

const SPACING = 9;
const DOT_RADIUS = 1.7;
const TAU = Math.PI * 2;
const MAX_RIPPLES = 8;
const SHADOW_COLOR = "rgba(14,35,56,0.15)";
const DOT_COLOR = "rgba(255,255,255,0.98)";

/**
 * Living white-dot field for the hero logo card.
 * The dots are white pearls with a tiny navy shadow so they stay visible on
 * the paper-white card, and they ride the same kind of ambient sine waves and
 * pointer/touch ripples as the navy hero background behind them.
 */
export default function LogoDotWaves() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !card || !ctx) return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ripples = [];
    const pointer = { x: -9999, y: -9999, active: false };
    const lastRipple = { x: 0, y: 0, time: 0 };

    let dots = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let resizeFrame = 0;

    const rebuild = () => {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          dots.push({ x, y, phase: (x * 0.021 + y * 0.017) % TAU });
        }
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      const shadows = new Path2D();
      const pearls = new Path2D();

      for (let i = 0; i < dots.length; i += 1) {
        const { x, y } = dots[i];
        shadows.moveTo(x + DOT_RADIUS, y + 1);
        shadows.arc(x, y + 1, DOT_RADIUS, 0, TAU);
        pearls.moveTo(x + DOT_RADIUS, y);
        pearls.arc(x, y, DOT_RADIUS, 0, TAU);
      }

      ctx.fillStyle = SHADOW_COLOR;
      ctx.fill(shadows);
      ctx.fillStyle = DOT_COLOR;
      ctx.fill(pearls);
    };

    const toLocal = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width ? width / rect.width : 1;
      const scaleY = rect.height ? height / rect.height : 1;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const spawnRipple = (x, y, amplitude) => {
      ripples.push({ x, y, born: performance.now() / 1000, amplitude });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    };

    const onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      const point = toLocal(event.clientX, event.clientY);
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.active = true;

      const now = performance.now() / 1000;
      const moved = Math.hypot(point.x - lastRipple.x, point.y - lastRipple.y);
      if (moved > 16 && now - lastRipple.time > 0.06) {
        spawnRipple(point.x, point.y, Math.min(9, 4 + moved * 0.12));
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
      spawnRipple(point.x, point.y, 11);
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
        if (!spawned && moved > 18 && now - lastRipple.time > 0.08) {
          spawnRipple(point.x, point.y, 9);
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

      const shadows = new Path2D();
      const pearls = new Path2D();

      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        const { x, y } = dot;

        let dx = Math.cos(y * 0.028 + t * 1.0 + dot.phase) * 1.2;
        let dy =
          Math.sin(x * 0.032 + t * 1.05 + dot.phase * 0.6) * 1.9 +
          Math.sin(y * 0.038 - t * 0.9) * 1.4 +
          Math.sin((x + y) * 0.022 + t * 1.4) * 1.1;

        for (let r = 0; r < ripples.length; r += 1) {
          const ripple = ripples[r];
          const age = t - ripple.born;
          if (age < 0 || age > 2.2) continue;

          const rx = x - ripple.x;
          const ry = y - ripple.y;
          const dist = Math.sqrt(rx * rx + ry * ry);
          const front = dist - age * 230;
          const sigma = 16 + age * 18;
          const envelope =
            Math.exp(-(front * front) / (2 * sigma * sigma)) * Math.exp(-age * 1.0);

          if (envelope < 0.004) continue;

          const push = envelope * ripple.amplitude * Math.cos(front * 0.08);
          if (dist > 0.001) {
            dx += (rx / dist) * push;
            dy += (ry / dist) * push;
          }
        }

        if (pointer.active) {
          const mx = x - pointer.x;
          const my = y - pointer.y;
          const distSq = mx * mx + my * my;
          const radius = 72;

          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq) || 1;
            const falloff = 1 - dist / radius;
            const push = falloff * falloff * 3.4;
            dx += (mx / dist) * push;
            dy += (my / dist) * push;
          }
        }

        const px = x + dx;
        const py = y + dy;
        shadows.moveTo(px + DOT_RADIUS, py + 1);
        shadows.arc(px, py + 1, DOT_RADIUS, 0, TAU);
        pearls.moveTo(px + DOT_RADIUS, py);
        pearls.arc(px, py, DOT_RADIUS, 0, TAU);
      }

      ctx.fillStyle = SHADOW_COLOR;
      ctx.fill(shadows);
      ctx.fillStyle = DOT_COLOR;
      ctx.fill(pearls);

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        if (t - ripples[i].born > 2.2) ripples.splice(i, 1);
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
      if (resizeObserver) resizeObserver.observe(card);
      return () => {
        cancelAnimationFrame(resizeFrame);
        if (resizeObserver) resizeObserver.disconnect();
      };
    }

    card.addEventListener("pointermove", onPointerMove, { passive: true });
    card.addEventListener("pointerdown", onPointerDown, { passive: true });
    card.addEventListener("pointerleave", onPointerLeave, { passive: true });
    card.addEventListener("touchmove", onTouchMove, { passive: true });
    card.addEventListener("touchend", onTouchEnd, { passive: true });
    card.addEventListener("touchcancel", onTouchEnd, { passive: true });

    let intersectionObserver = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0 }
      );
      intersectionObserver.observe(card);
    }

    if (resizeObserver) resizeObserver.observe(card);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerdown", onPointerDown);
      card.removeEventListener("pointerleave", onPointerLeave);
      card.removeEventListener("touchmove", onTouchMove);
      card.removeEventListener("touchend", onTouchEnd);
      card.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
