import { useEffect, useRef, useState } from 'react';

const SHEET_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_025250_100df7b8-31fd-4614-aa4a-c1b7d5b6b273.png&w=1600&q=85';
const LOOP_SECONDS = 20;
const DOT_COLOR = '#0d0d0d';
const LEVELS = [0, 0.26, 0.52, 0.78, 1] as const;

type TileName = 'LA' | 'RA' | 'LB' | 'RB';
type TileRect = readonly [number, number, number, number];

const SOURCE_RECTS: Record<TileName, TileRect> = {
  LA: [0, 0.06, 0.47, 0.4],
  RA: [0.53, 0.06, 0.47, 0.4],
  LB: [0, 0.55, 0.47, 0.4],
  RB: [0.53, 0.55, 0.47, 0.4],
};

function hash(a: number, b: number) {
  const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function smooth(a: number, b: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function mixAt(time: number, on: number, off: number, duration: number) {
  return smooth(on, on + duration, time) * (1 - smooth(off, off + duration, time));
}

function createTiles(image: HTMLImageElement): Record<TileName, HTMLCanvasElement> | null {
  const tiles = {} as Record<TileName, HTMLCanvasElement>;

  for (const [name, [x, y, width, height]] of Object.entries(SOURCE_RECTS) as [
    TileName,
    TileRect,
  ][]) {
    const sourceX = x * image.naturalWidth;
    const sourceY = y * image.naturalHeight;
    const sourceWidth = width * image.naturalWidth;
    const sourceHeight = height * image.naturalHeight;
    const tile = document.createElement('canvas');
    tile.width = 420;
    tile.height = Math.round((tile.width * sourceHeight) / sourceWidth);

    const context = tile.getContext('2d');
    if (!context) {
      console.error(`Unable to create the ${name} hand tile canvas.`);
      return null;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      tile.width,
      tile.height,
    );
    tiles[name] = tile;
  }

  return tiles;
}

export function HandsDotMatrixHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 767);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      console.error('Unable to create the visible hands canvas.');
      return;
    }

    const fieldA = document.createElement('canvas');
    const fieldB = document.createElement('canvas');
    const contextA = fieldA.getContext('2d', { willReadFrequently: true });
    const contextB = fieldB.getContext('2d', { willReadFrequently: true });
    if (!contextA || !contextB) {
      console.error('Unable to create the hands sampling canvases.');
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';

    let disposed = false;
    let failed = false;
    let frameId = 0;
    let startTime: number | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let step = 5;
    let rowStep = step * 2.05;
    let columns = 0;
    let rows = 0;
    let radius = 0;
    let seeds = new Float32Array(0);
    let tiles: Record<TileName, HTMLCanvasElement> | null = null;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = bounds.width;
      const nextHeight = bounds.height;
      if (nextWidth <= 0 || nextHeight <= 0) return;

      width = nextWidth;
      height = nextHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      step = Math.max(5, width / 205);
      rowStep = step * 2.05;
      columns = Math.ceil(width / step);
      rows = Math.ceil(height / rowStep);
      radius = step * 0.46;

      fieldA.width = columns;
      fieldA.height = rows;
      fieldB.width = columns;
      fieldB.height = rows;

      seeds = new Float32Array(columns * rows);
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < columns; i += 1) {
          seeds[j * columns + i] = 0.55 * hash(i, j) + 0.45 * hash(j * 3.1, 7.7);
        }
      }
    };

    const drawHand = (
      fieldContext: CanvasRenderingContext2D,
      tile: HTMLCanvasElement,
      side: 'left' | 'right',
      phase: number,
      time: number,
      handWidth: number,
      handHeight: number,
      centerY: number,
    ) => {
      const angle = (2 * Math.PI * time) / LOOP_SECONDS;
      const reach =
        (0.035 * Math.sin(angle + phase) + 0.012 * Math.sin(2 * angle + 1.3 + phase)) *
        width;
      const scale = 1 + 0.07 * Math.sin(angle + 0.9 + phase);
      const rotation =
        (side === 'left' ? 1 : -1) * 0.045 * Math.sin(angle + 2.1 + phase);
      const x =
        side === 'left'
          ? reach - width * 0.045
          : width - handWidth + width * 0.045 - reach;
      const pivotX = side === 'left' ? 0 : width;

      fieldContext.save();
      fieldContext.translate(pivotX, centerY);
      fieldContext.rotate(rotation);
      fieldContext.scale(scale, scale);
      fieldContext.translate(-pivotX, -centerY);
      fieldContext.drawImage(tile, x, centerY - handHeight / 2, handWidth, handHeight);
      fieldContext.restore();
    };

    const render = (timeSeconds: number) => {
      if (disposed || failed || !tiles || columns === 0 || rows === 0) return;

      const time = ((timeSeconds % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
      const dotColor = document.documentElement.classList.contains('dark') ? '#ffffff' : DOT_COLOR;
      const isPortrait = height > width;
      const handWidth = isPortrait
        ? width * 0.66
        : Math.min(width * 0.53, height * 0.95);
      const handHeight = handWidth * ((0.4 * 1520) / (0.47 * 2688));
      const centerY = height * (isPortrait ? 0.66 : 0.54);

      const fieldTransformX = columns / width;
      const fieldTransformY = rows / height;
      for (const fieldContext of [contextA, contextB]) {
        fieldContext.setTransform(1, 0, 0, 1, 0, 0);
        fieldContext.fillStyle = '#ffffff';
        fieldContext.fillRect(0, 0, columns, rows);
        fieldContext.imageSmoothingEnabled = true;
        fieldContext.imageSmoothingQuality = 'high';
        fieldContext.setTransform(fieldTransformX, 0, 0, fieldTransformY, 0, 0);
      }

      drawHand(contextA, tiles.LA, 'left', 0, time, handWidth, handHeight, centerY);
      drawHand(contextA, tiles.RA, 'right', Math.PI, time, handWidth, handHeight, centerY);
      drawHand(contextB, tiles.LB, 'left', 0, time, handWidth, handHeight, centerY);
      drawHand(contextB, tiles.RB, 'right', Math.PI, time, handWidth, handHeight, centerY);

      let pixelsA: Uint8ClampedArray;
      let pixelsB: Uint8ClampedArray;
      try {
        pixelsA = contextA.getImageData(0, 0, columns, rows).data;
        pixelsB = contextB.getImageData(0, 0, columns, rows).data;
      } catch (error) {
        failed = true;
        console.error('Unable to read the hands sampling canvases.', error);
        return;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = dotColor;
      context.beginPath();

      const tick = Math.floor(time * 7);
      const mixLeft = mixAt(time, 6.2, 14.6, 1.6);
      const mixRight = mixAt(time, 2.4, 10.4, 1.6);
      const quietCenterY = isPortrait ? 0.33 : 0.385;
      const quietWidth = isPortrait ? 0.44 : 0.2;

      for (let j = 0; j < rows; j += 1) {
        const shift =
          hash(j, tick) > 0.965 ? Math.round((hash(tick, j) - 0.5) * 8) : 0;
        const centerYNormalized = ((j + 0.5) * rowStep) / height;
        const ey = (centerYNormalized - quietCenterY) / 0.085;

        for (let i = 0; i < columns; i += 1) {
          const sampleI = Math.max(0, Math.min(columns - 1, i - shift));
          const pixelIndex = (j * columns + sampleI) * 4;
          const seed = seeds[j * columns + i];
          const mix = i < columns / 2 ? mixLeft : mixRight;
          const pixels = seed < mix ? pixelsB : pixelsA;

          let value = Math.max(0, Math.min(1, (1 - pixels[pixelIndex] / 255 - 0.16) / 0.42));
          if (value === 0) continue;

          value *= 0.86 + 0.14 * Math.sin(time * 3.2 + seed * 40);
          const centerX = Math.abs((i + 0.5) / columns - 0.5);
          value *= smooth(0.035, 0.11, centerX);

          const ex = centerX / quietWidth;
          value *= smooth(0.85, 1.25, Math.hypot(ex, ey));

          if (mix > 0.001 && mix < 0.999 && Math.abs(seed - mix) < 0.12) {
            value *= Math.abs(seed - mix) / 0.12;
            if (hash(i + tick, j) <= 0.4) value *= 0.3;
          }

          let level = 0;
          for (let index = 1; index < LEVELS.length; index += 1) {
            const candidate = LEVELS[index];
            if (value >= candidate - 0.13) level = candidate;
          }
          if (level === 0) continue;

          const dotRadius = radius * (level === 0.26 ? 0.38 : level);
          context.moveTo((i + 0.5) * step + dotRadius, (j + 0.5) * rowStep);
          context.arc(
            (i + 0.5) * step,
            (j + 0.5) * rowStep,
            dotRadius,
            0,
            2 * Math.PI,
          );
        }
      }

      context.fill();
    };

    const animate = (now: number) => {
      if (disposed || failed) return;
      if (startTime === null) startTime = now;
      render((now - startTime) / 1000);
      if (!failed) frameId = window.requestAnimationFrame(animate);
    };

    const onImageLoad = () => {
      if (disposed) return;
      tiles = createTiles(image);
      if (!tiles) {
        failed = true;
        return;
      }

      resize();
      frameId = window.requestAnimationFrame(animate);
    };

    const onImageError = () => {
      failed = true;
    };

    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    image.addEventListener('load', onImageLoad, { once: true });
    image.addEventListener('error', onImageError, { once: true });
    image.src = SHEET_URL;

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      image.removeEventListener('load', onImageLoad);
      image.removeEventListener('error', onImageError);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="hands-dot-matrix-canvas pointer-events-none absolute left-0 top-0 z-0 w-full"
      style={{ height: '100vh' }}
    />
  );
}
