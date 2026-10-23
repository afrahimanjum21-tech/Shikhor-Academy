import { useEffect, useLayoutEffect, useRef } from 'react';
import { NAME_PATHS, NAME_VIEWBOX } from './siteNamePaths';

const DRAW_MS = 2000;
const GAP_MS = 32;
const MIN_SEGMENT_MS = 32;

export default function HandwrittenName({ onComplete }) {
  const svgRef = useRef(null);
  const penRef = useRef(null);
  const pathRefs = useRef([]);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    const paths = pathRefs.current.filter(Boolean);
    if (!paths.length) {
      onCompleteRef.current?.();
      return undefined;
    }

    // These paths use pathLength="1", so an offset of 1 is completely hidden.
    paths.forEach((path) => {
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';
    });

    let lengths;
    try {
      lengths = paths.map((path) => path.getTotalLength());
    } catch {
      paths.forEach((path) => {
        path.style.strokeDashoffset = '0';
      });
      onCompleteRef.current?.();
      return undefined;
    }

    const inkLength = lengths.reduce((sum, length) => sum + length, 0);
    if (!Number.isFinite(inkLength) || inkLength <= 0) {
      paths.forEach((path) => {
        path.style.strokeDashoffset = '0';
      });
      onCompleteRef.current?.();
      return undefined;
    }

    // Let each stroke take time proportional to its length, with a small
    // minimum so dots and very short connective strokes remain visible.
    const rawDurations = lengths.map((length) => Math.max(MIN_SEGMENT_MS, (length / inkLength) * DRAW_MS));
    const rawTotal = rawDurations.reduce((sum, duration) => sum + duration, 0);
    const durationScale = DRAW_MS / rawTotal;
    let cursor = 0;
    const segments = rawDurations.map((rawDuration, index) => {
      const duration = rawDuration * durationScale;
      const segment = {
        path: paths[index],
        length: lengths[index],
        start: cursor,
        end: cursor + duration,
      };
      cursor += duration + GAP_MS;
      return segment;
    });
    const totalDuration = cursor - GAP_MS;
    const startAt = performance.now() + 90;
    let frameId = 0;
    let finished = false;
    let cancelled = false;

    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      paths.forEach((path) => {
        path.style.strokeDashoffset = '0';
      });
      if (penRef.current) penRef.current.style.opacity = '0';
      onCompleteRef.current?.();
    };

    const paintPen = (segment, progress) => {
      const pen = penRef.current;
      const svg = svgRef.current;
      if (!pen || !svg) return;
      const matrix = segment.path.getScreenCTM();
      if (!matrix) {
        pen.style.opacity = '0';
        return;
      }
      const point = segment.path.getPointAtLength(segment.length * progress);
      const screenPoint = point.matrixTransform(matrix);
      const svgRect = svg.getBoundingClientRect();
      pen.style.left = `${screenPoint.x - svgRect.left}px`;
      pen.style.top = `${screenPoint.y - svgRect.top}px`;
      pen.style.opacity = '1';
    };

    const frame = (now) => {
      if (cancelled) return;
      if (now < startAt) {
        frameId = window.requestAnimationFrame(frame);
        return;
      }

      const elapsed = now - startAt;
      if (elapsed >= totalDuration) {
        finish();
        return;
      }

      let active = null;
      let activeProgress = 0;
      for (const segment of segments) {
        if (elapsed >= segment.end) {
          segment.path.style.strokeDashoffset = '0';
        } else if (elapsed < segment.start) {
          segment.path.style.strokeDashoffset = '1';
        } else {
          active = segment;
          activeProgress = (elapsed - segment.start) / (segment.end - segment.start);
          segment.path.style.strokeDashoffset = String(1 - activeProgress);
        }
      }

      if (active) {
        paintPen(active, activeProgress);
      } else if (penRef.current) {
        penRef.current.style.opacity = '0';
      }

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="site-preloader__writing">
      <svg
        ref={svgRef}
        className="site-preloader__name"
        viewBox={`0 0 ${NAME_VIEWBOX.width} ${NAME_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {NAME_PATHS.map((path, index) => (
          <path
            key={`${path.letter}-${index}`}
            ref={(node) => {
              pathRefs.current[index] = node;
            }}
            d={path.d}
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset="1"
            className="site-preloader__ink"
          />
        ))}
      </svg>
      <svg
        ref={penRef}
        className="site-preloader__pen"
        viewBox="0 0 34 74"
        aria-hidden="true"
      >
        <path d="M17 2 31 26 23 58 17 72 11 58 3 26Z" fill="#C8A14A" />
        <path
          d="M17 4v38"
          fill="none"
          stroke="#0E2338"
          strokeWidth="1.3"
          strokeOpacity="0.55"
        />
        <path d="M11 58 17 72l6-14Z" fill="#0E2338" fillOpacity="0.8" />
        <circle cx="17" cy="47" r="2.2" fill="#0E2338" fillOpacity="0.8" />
      </svg>
    </div>
  );
}
