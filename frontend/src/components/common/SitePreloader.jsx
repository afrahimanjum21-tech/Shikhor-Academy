import { useCallback, useEffect, useState } from 'react';
import HandwrittenName from './HandwrittenName';
import './SitePreloader.css';

const HOLD_MS = 750;
const SAFETY_MS = 4300;
const EXIT_MS = 550;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const STAFF_PATH = /^\/(admin|student|teacher)(\/|$)/i;

function shouldShowPreloader() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia(REDUCED_MOTION).matches) return false;
  return !STAFF_PATH.test(window.location.pathname);
}

export default function SitePreloader() {
  const [visible, setVisible] = useState(shouldShowPreloader);
  const [complete, setComplete] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Keep the page still while the intro is on screen.
  useEffect(() => {
    if (!visible) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  // The drawing is normally done in about 2.5 seconds. This is a safety net
  // for a browser where SVG path measurement is unavailable.
  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setTimeout(() => setLeaving(true), SAFETY_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const handleComplete = useCallback(() => {
    setComplete(true);
  }, []);

  useEffect(() => {
    if (!complete || leaving) return undefined;
    const timer = window.setTimeout(() => setLeaving(true), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [complete, leaving]);

  // Unmount after the fade-out so the app can receive focus and scrolling.
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(() => setVisible(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useEffect(() => {
    if (!visible) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setLeaving(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  if (!visible) return null;

  const finish = () => {
    if (!leaving) setLeaving(true);
  };

  return (
    <div
      className={`site-preloader${leaving ? ' site-preloader--leaving' : ''}`}
      aria-busy="true"
    >
      <div className="site-preloader__dots" aria-hidden="true" />

      <div className="site-preloader__content">
        <HandwrittenName onComplete={handleComplete} />

        <svg
          className="site-preloader__underline"
          viewBox="0 0 520 18"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M4 12C130 3 390 3 516 10" pathLength="1" />
        </svg>

        <p className="site-preloader__status">Preparing your experience</p>
      </div>

      <button
        type="button"
        className="site-preloader__skip"
        onClick={finish}
        disabled={leaving}
      >
        Skip intro
      </button>

      <span className="site-preloader__sr-only" role="status" aria-live="polite">
        Loading Shikhor Academy
      </span>
    </div>
  );
}
