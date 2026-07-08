import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import { AppText } from '@/components/ui';
import { getScoreLevel } from '@/features/products/scoreLevel';

interface RiskScoreProps {
  /** Risk level: 1 = low, 2 = moderate, 3 = high. `null` = unknown. */
  riskScore: number | null;
  size?: 'lg' | 'sm';
}

// ─── Geometry helpers (pure) ────────────────────────────────────────────────
// Semicircular gauge: LEFT = low risk (green) → RIGHT = high risk (red).
// `frac` 0 = far left, 1 = far right, sweeping over the top.
function polar(cx: number, cy: number, r: number, frac: number) {
  const theta = Math.PI * (1 - frac);
  return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
}

function arcPath(cx: number, cy: number, r: number, f0: number, f1: number): string {
  const steps = Math.max(2, Math.round((f1 - f0) * 48));
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const p = polar(cx, cy, r, f0 + ((f1 - f0) * i) / steps);
    d += `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  }
  return d.trim();
}

const RISK_COLORS = { green: '#67c04c', amber: '#f5a623', red: '#e0353b', grey: '#d1d5db' };

// ─── Component ──────────────────────────────────────────────────────────────
export function RiskScore({ riskScore, size = 'lg' }: RiskScoreProps) {
  const level = getScoreLevel(riskScore); // { label: 'Low'|'Moderate'|'High'|'Unknown', color, bg }
  const rated = riskScore !== null;

  if (size === 'sm') {
    return (
      <View
        className="self-start rounded-full px-2.5 py-0.5"
        style={{ backgroundColor: level.bg }}
        accessibilityLabel={rated ? `${level.label} risk` : 'Risk unknown'}
      >
        <AppText variant="caption" style={{ color: level.color, fontWeight: '700' }}>
          {level.label}
        </AppText>
      </View>
    );
  }

  // ── Large gauge (prototype + a leading "?" unknown segment) ──
  const W = 240;
  const cx = W / 2;
  const cy = 124;
  const R = 92;               // outer edge of the colored band
  const STROKE = 34;          // band thickness
  const Rc = R - STROKE / 2;  // stroke centerline
  const Rlabel = 107;         // curved-label radius (outside the band)
  const Rring = 62;           // thin white inner ring
  const needleLen = 84;
  const tailLen = 24;
  const baseY = cy + 6;
  const baseH = 52;
  const svgH = 190;

  // Four segments left→right: "?" (unknown) then LOW / MODERATE / HIGH.
  // "?" is ~1/3 the width of a risk bar. The active segment grows ×1.2 and the
  // others shrink proportionally (so same-type peers stay equal); the gauge
  // stays a half-circle. Labels + needle track the active segment's center.
  const SEGMENTS = [
    { color: RISK_COLORS.grey,  label: '?',        base: 1 },
    { color: RISK_COLORS.green, label: 'LOW',      base: 3 },
    { color: RISK_COLORS.amber, label: 'MODERATE', base: 3 },
    { color: RISK_COLORS.red,   label: 'HIGH',     base: 3 },
  ];
  const activeIndex = rated ? Math.min(3, Math.max(1, Math.round(Number(riskScore)))) : 0;
  const weights = SEGMENTS.map((s, i) => s.base * (i === activeIndex ? 1.2 : 1));
  const totalW = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const segs = SEGMENTS.map((s, i) => {
    const start = acc;
    acc += weights[i] / totalW;
    return { ...s, start, end: acc, center: (start + acc) / 2 };
  });
  const frac = segs[activeIndex].center;

  // Needle geometry (tapered pointer + counterweight tail), pointing at the
  // active segment's center.
  const theta = Math.PI * (1 - frac);
  const dx = Math.cos(theta);
  const dy = -Math.sin(theta);
  const px = -dy; // perpendicular
  const py = dx;
  const half = 7;
  const needlePts = [
    [cx + dx * needleLen, cy + dy * needleLen], // tip
    [cx + px * half, cy + py * half],           // base side
    [cx - dx * tailLen, cy - dy * tailLen],     // tail (counterweight)
    [cx - px * half, cy - py * half],           // base side
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  return (
    <View className="items-center" accessibilityLabel={rated ? `${level.label} risk` : 'Risk unknown'}>
      <Svg width={W} height={svgH}>
        <Defs>
          <Path id="riskLabelArc" d={arcPath(cx, cy, Rlabel, 0, 1)} fill="none" />
          <ClipPath id="riskBaseClip">
            <Rect x={cx - 72} y={baseY} width={144} height={baseH} rx={26} ry={26} />
          </ClipPath>
        </Defs>

        {/* Dark two-tone base pill (drawn first so the needle tail sits on top) */}
        <G clipPath="url(#riskBaseClip)">
          <Rect x={cx - 72} y={baseY} width={72} height={baseH} fill="#4b4f54" />
          <Rect x={cx} y={baseY} width={72} height={baseH} fill="#2c2f33" />
        </G>

        {/* Colored band — 4 segments */}
        {segs.map((s, i) => (
          <Path
            key={i}
            d={arcPath(cx, cy, Rc, s.start, s.end)}
            stroke={s.color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="butt"
          />
        ))}

        {/* Thin white inner ring */}
        <Path d={arcPath(cx, cy, Rring, 0, 1)} stroke="#ffffff" strokeWidth={2.5} fill="none" opacity={0.9} />

        {/* Curved labels, each centered over its (resized) segment */}
        {segs.map((s, i) => (
          <SvgText key={i} fill="#3f3f46" fontSize={i === 0 ? 13 : 14} fontWeight="bold" textAnchor="middle">
            <TextPath href="#riskLabelArc" startOffset={`${(s.center * 100).toFixed(2)}%`}>{s.label}</TextPath>
          </SvgText>
        ))}

        {/* Needle + hub */}
        <Polygon points={needlePts} fill="#2c2f33" />
        <Circle cx={cx} cy={cy} r={12} fill="#2c2f33" />
        <Circle cx={cx} cy={cy} r={7} fill="#ffffff" />

        {/* "RISK" label on the base pill */}
        <SvgText x={cx} y={baseY + baseH / 2 + 9} fill="#ffffff" fontSize={27} fontWeight="bold" textAnchor="middle">
          RISK
        </SvgText>
      </Svg>
    </View>
  );
}
