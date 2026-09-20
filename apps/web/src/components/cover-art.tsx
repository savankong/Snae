/**
 * Generated cover art.
 *
 * The repo ships no photographs. design/v2/README is explicit about why:
 * stock-photo licences carry sensitive-use clauses, and depicting an
 * identifiable person as an adult-services creator is exactly the case those
 * clauses exist to prevent. Launch imagery has to come from verified creators
 * under a model release covering this specific use.
 *
 * So rather than flat placeholder blocks, this generates layered abstract
 * artwork — mesh blooms, an accent form, and film grain — deterministically
 * from a seed. Every creator and every post gets its own, stable across
 * renders, in the product's own palette.
 *
 * ─── Swapping in real photographs ─────────────────────────────────────────
 * Pass `src` and the generated art is replaced by the image, with the art kept
 * underneath as the loading state. That is the only change needed: no layout,
 * no component, no call-site edits.
 */

const PALETTE = [
  { h: 332, name: 'live' },      // hot pink
  { h: 268, name: 'violet' },
  { h: 300, name: 'magenta' },
  { h: 244, name: 'indigo' },
  { h: 200, name: 'cyan' },
  { h: 158, name: 'jade' },
  { h: 22,  name: 'ember' },
] as const;

/** FNV-1a. Small, fast, and good enough to decorrelate nearby seeds. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic PRNG so a seed always produces the same artwork. */
function rng(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;  state >>>= 0;
    return state / 0xffffffff;
  };
}

export interface CoverArtProps {
  seed: string;
  /** Optional real photograph. When set, the art becomes its backdrop. */
  src?: string | null;
  alt?: string;
  className?: string;
  /** Blur and dim the art, for locked items. */
  locked?: boolean;
  /** Bias the palette — a creator's cards read as a set. */
  hue?: number;
  rounded?: boolean;
}

export function CoverArt({ seed, src, alt = '', className, locked, hue, rounded = true }: CoverArtProps) {
  const h = hash(seed);
  const rand = rng(h);

  const baseHue = hue ?? PALETTE[h % PALETTE.length]!.h;
  const accentHue = (baseHue + (rand() > 0.5 ? 58 : -48) + 360) % 360;
  const thirdHue = (baseHue + 150) % 360;

  // Three blooms, placed away from dead centre so the composition has movement.
  const blooms = [
    { x: 18 + rand() * 30, y: 16 + rand() * 26, r: 42 + rand() * 26, hue: baseHue, a: 0.82 },
    { x: 54 + rand() * 34, y: 48 + rand() * 38, r: 34 + rand() * 30, hue: accentHue, a: 0.68 },
    { x: 26 + rand() * 50, y: 62 + rand() * 30, r: 26 + rand() * 22, hue: thirdHue, a: 0.4 },
  ];

  const form = Math.floor(rand() * 4);
  const rotation = Math.floor(rand() * 360);
  const gid = `ca${h.toString(36)}`;

  return (
    <div
      className={`relative overflow-hidden bg-ground ${rounded ? 'rounded-[16px]' : ''} ${className ?? ''}`}
      aria-hidden={alt === '' ? true : undefined}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          {blooms.map((b, i) => (
            <radialGradient key={i} id={`${gid}b${i}`}>
              <stop offset="0%" stopColor={`hsl(${b.hue} 92% 62%)`} stopOpacity={b.a} />
              <stop offset="55%" stopColor={`hsl(${b.hue} 84% 42%)`} stopOpacity={b.a * 0.45} />
              <stop offset="100%" stopColor={`hsl(${b.hue} 70% 20%)`} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id={`${gid}base`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`hsl(${baseHue} 40% 9%)`} />
            <stop offset="100%" stopColor="#08070C" />
          </linearGradient>
          {/* Film grain. Without it the gradients read as flat CSS. */}
          <filter id={`${gid}grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed={h % 100} />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer><feFuncA type="linear" slope="0.13" /></feComponentTransfer>
          </filter>
          <radialGradient id={`${gid}vig`}>
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill={`url(#${gid}base)`} />
        {blooms.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#${gid}b${i})`} />
        ))}

        {/* One accent form, so cards do not all read as the same soft blur. */}
        <g transform={`rotate(${rotation} 50 50)`} opacity="0.5">
          {form === 0 && (
            <circle cx="50" cy="50" r="30" fill="none" stroke={`hsl(${accentHue} 90% 70%)`} strokeWidth="0.6" opacity="0.7" />
          )}
          {form === 1 && (
            <path d="M-10 62 Q 50 30 110 62" fill="none" stroke={`hsl(${baseHue} 95% 72%)`} strokeWidth="0.8" opacity="0.6" />
          )}
          {form === 2 && (
            <>
              <line x1="-10" y1="38" x2="110" y2="38" stroke={`hsl(${accentHue} 90% 68%)`} strokeWidth="0.4" opacity="0.5" />
              <line x1="-10" y1="46" x2="110" y2="46" stroke={`hsl(${accentHue} 90% 68%)`} strokeWidth="0.4" opacity="0.3" />
            </>
          )}
          {form === 3 && (
            <ellipse cx="50" cy="50" rx="42" ry="18" fill="none" stroke={`hsl(${thirdHue} 92% 70%)`} strokeWidth="0.5" opacity="0.6" />
          )}
        </g>

        <rect width="100" height="100" fill={`url(#${gid}vig)`} />
        <rect width="100" height="100" filter={`url(#${gid}grain)`} opacity="0.55" />
      </svg>

      {/* A real photograph sits on top once one exists. */}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {locked && <div className="absolute inset-0 backdrop-blur-xl bg-ground/45" />}
    </div>
  );
}

/** Stable hue for a creator, so all her cards read as one set. */
export function hueForSeed(seed: string): number {
  return PALETTE[hash(seed) % PALETTE.length]!.h;
}
