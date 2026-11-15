import {
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
} from 'react';
import { motion, useAnimate, stagger } from 'motion/react';
import { Moon, Sun } from 'lucide-react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const SLATS = 6;
const DEFAULT_SIZE = 54;
const THEME_STORAGE_KEY = 'paroquia_theme';

export function getInitialThemeIsDark(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // ignore storage errors
  }
  return document.documentElement.classList.contains('dark');
}

export function applyThemeClass(isDark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    // ignore storage errors
  }
}

interface BlindPullToggleProps {
  className?: string;
}

export function BlindPullToggle({ className = '' }: BlindPullToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(() => getInitialThemeIsDark());
  const [animating, setAnimating] = useState(false);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const sizeRef = useRef(DEFAULT_SIZE);
  const [scope, animate] = useAnimate();

  useIsomorphicLayoutEffect(() => {
    const check = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const update = () => {
      const s = window.innerWidth < 640 ? 48 : 54;
      sizeRef.current = s;
      setSize(s);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const iconSize = Math.round(size * 0.42);
  const radius = Math.round(size * 0.28);
  const cordRestH = Math.round(size * 0.32);
  const dotSize = Math.max(8, Math.round(size * 0.16));

  const buttonBg = isDark
    ? 'linear-gradient(145deg, #2C2C30, #1A1A1D)'
    : 'linear-gradient(145deg, #FFFFFF, #ECECEF)';
  const buttonBorder = isDark
    ? '1.5px solid rgba(255,255,255,0.14)'
    : '1.5px solid rgba(0,0,0,0.10)';
  const buttonShadow = isDark
    ? '0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)'
    : '0 8px 22px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)';
  const iconColor = isDark ? '#F5F5F7' : '#1D1D1F';
  const cordTop = isDark ? 'rgba(255,255,255,0.34)' : 'rgba(29,29,31,0.28)';
  const cordBottom = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(29,29,31,0.08)';
  const dotBg = isDark ? 'rgba(255,255,255,0.78)' : 'rgba(29,29,31,0.55)';
  const dotShadow = isDark
    ? '0 2px 8px rgba(0,0,0,0.65)'
    : '0 2px 6px rgba(0,0,0,0.18)';

  const handleToggle = useCallback(async () => {
    if (animating) return;
    setAnimating(true);

    const pullH = Math.round(sizeRef.current * 0.65);
    const restH = Math.round(sizeRef.current * 0.32);

    await animate(
      '.cord-line',
      { height: pullH },
      { duration: 0.1, ease: [0.4, 0, 1, 1] },
    );
    animate(
      '.cord-line',
      { height: restH },
      { type: 'spring', stiffness: 300, damping: 18 },
    );
    await animate(
      '.slat',
      { scaleY: 0 },
      { delay: stagger(0.04), duration: 0.1, ease: 'easeIn' },
    );

    const nextDark = !document.documentElement.classList.contains('dark');
    applyThemeClass(nextDark);
    setIsDark(nextDark);

    await animate(
      '.slat',
      { scaleY: 1 },
      { delay: stagger(0.04), duration: 0.13, ease: 'easeOut' },
    );

    setAnimating(false);
  }, [animating, animate]);

  return (
    <div ref={scope} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex select-none flex-col items-center"
      >
        <motion.button
          type="button"
          onClick={handleToggle}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo noturno'}
          aria-pressed={isDark}
          title={isDark ? 'Mudar para modo claro' : 'Mudar para modo noturno'}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            border: buttonBorder,
            boxShadow: buttonShadow,
            cursor: 'pointer',
            position: 'relative',
            background: 'transparent',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: radius - 1,
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: SLATS }).map((_, i) => {
              const topPx = Math.round((i / SLATS) * size);
              const nextTopPx =
                i === SLATS - 1 ? size : Math.round(((i + 1) / SLATS) * size);
              const heightPx = nextTopPx - topPx;

              return (
                <div
                  key={i}
                  className="slat"
                  style={{
                    position: 'absolute',
                    top: topPx,
                    left: 0,
                    width: '100%',
                    height: heightPx,
                    overflow: 'hidden',
                    transformOrigin: '50% 50%',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -topPx,
                      left: 0,
                      width: size,
                      height: size,
                      background: buttonBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: iconColor,
                    }}
                  >
                    {isDark ? (
                      <Moon size={iconSize} strokeWidth={2} />
                    ) : (
                      <Sun size={iconSize} strokeWidth={2} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.button>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={isDark ? 'Puxar cordinha para modo claro' : 'Puxar cordinha para modo noturno'}
          className="flex cursor-pointer flex-col items-center bg-transparent border-0 p-0 focus:outline-none"
        >
          <div
            className="cord-line"
            style={{
              width: 2,
              height: cordRestH,
              background: `linear-gradient(to bottom, ${cordTop}, ${cordBottom})`,
              borderRadius: 1,
            }}
          />
          <div
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              background: dotBg,
              boxShadow: dotShadow,
            }}
          />
        </button>
      </motion.div>
    </div>
  );
}
