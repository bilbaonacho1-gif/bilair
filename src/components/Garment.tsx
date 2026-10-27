import { useId } from 'react';
import type { GarmentKind } from '../data/types';

/**
 * Ilustraciones vectoriales de prendas (vista frontal, plana).
 * Son ilustrativas: se usan mientras no haya fotografías reales de producto.
 */

interface Props {
  kind: GarmentKind;
  color: string;
  ink: string;
  className?: string;
  /** Muestra el logo estampado */
  print?: boolean;
  title?: string;
}

export const garmentBox: Record<GarmentKind, { w: number; h: number; hangY: number }> = {
  tee: { w: 200, h: 220, hangY: 12 },
  crew: { w: 200, h: 220, hangY: 14 },
  hoodie: { w: 200, h: 230, hangY: 18 },
  pants: { w: 200, h: 270, hangY: 8 },
  cap: { w: 200, h: 140, hangY: 24 },
  bag: { w: 200, h: 170, hangY: 10 },
};

function Print({ x, y, w, ink, globe = true }: { x: number; y: number; w: number; ink: string; globe?: boolean }) {
  return (
    <g fill={ink} stroke={ink}>
      <text x={x} y={y} textAnchor="middle" fontFamily="'Permanent Marker', cursive" fontSize={w * 0.22} stroke="none" transform={`rotate(-6 ${x} ${y})`}>
        BILAIR
      </text>
      {globe && (
        <g fill="none" strokeWidth={0.9} transform={`translate(${x} ${y + w * 0.2})`}>
          <circle r={w * 0.11} />
          <ellipse rx={w * 0.05} ry={w * 0.11} />
          <path d={`M${-w * 0.11} 0H${w * 0.11}M${-w * 0.095} ${-w * 0.05}H${w * 0.095}M${-w * 0.095} ${w * 0.05}H${w * 0.095}`} />
        </g>
      )}
    </g>
  );
}

export function Garment({ kind, color, ink, className = '', print = true, title }: Props) {
  const uid = useId().replace(/:/g, '');
  const shade = `shade-${uid}`;
  const box = garmentBox[kind];
  const fold = 'rgba(0,0,0,0.16)';
  const hi = 'rgba(255,255,255,0.10)';

  return (
    <svg className={`garment ${className}`} viewBox={`0 0 ${box.w} ${box.h}`} role="img" aria-label={title ?? kind}>
      <defs>
        <linearGradient id={shade} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {kind === 'tee' && (
        <g>
          <path d="M70 12 C80 24 120 24 130 12 L170 27 L197 76 L165 92 L158 80 L159 210 C130 214 70 214 41 210 L42 80 L35 92 L3 76 L30 27 Z" fill={color} />
          <path
            d="M70 12 C80 24 120 24 130 12 L170 27 L197 76 L165 92 L158 80 L159 210 C130 214 70 214 41 210 L42 80 L35 92 L3 76 L30 27 Z"
            fill={`url(#${shade})`}
          />
          <path d="M70 12 C80 27 120 27 130 12" fill="none" stroke={fold} strokeWidth="5" />
          <path
            d="M42 80 L48 120 M158 80 L152 118 M70 205 C76 180 74 160 80 140 M132 206 C126 186 128 168 122 150"
            fill="none"
            stroke={fold}
            strokeWidth="1.2"
          />
          <path d="M165 92 L158 80 M35 92 L42 80" stroke={fold} strokeWidth="1.5" />
          {print && <Print x={100} y={82} w={150} ink={ink} />}
        </g>
      )}

      {kind === 'crew' && (
        <g>
          <path
            d="M72 14 C82 26 118 26 128 14 L166 28 C180 60 190 120 194 196 L172 200 L162 120 L160 202 C130 208 70 208 40 202 L38 120 L28 200 L6 196 C10 120 20 60 34 28 Z"
            fill={color}
          />
          <path
            d="M72 14 C82 26 118 26 128 14 L166 28 C180 60 190 120 194 196 L172 200 L162 120 L160 202 C130 208 70 208 40 202 L38 120 L28 200 L6 196 C10 120 20 60 34 28 Z"
            fill={`url(#${shade})`}
          />
          <path d="M72 14 C82 30 118 30 128 14" fill="none" stroke={fold} strokeWidth="6" />
          <path d="M41 192 C80 197 120 197 159 192 M7 186 L27 189 M173 189 L193 186" stroke={fold} strokeWidth="5" fill="none" />
          <path d="M38 120 L40 70 M162 120 L160 70" stroke={fold} strokeWidth="1.2" />
          {print && <Print x={100} y={78} w={120} ink={ink} globe={false} />}
        </g>
      )}

      {kind === 'hoodie' && (
        <g>
          <path d="M64 24 C62 4 138 4 136 24 C128 44 72 44 64 24 Z" fill={color} />
          <path d="M64 24 C62 4 138 4 136 24 C128 44 72 44 64 24 Z" fill="rgba(0,0,0,0.25)" />
          <path
            d="M64 24 L32 36 C18 70 10 130 8 196 L32 200 L40 128 L44 96 L42 214 C80 220 120 220 158 214 L156 96 L160 128 L168 200 L192 196 C190 130 182 70 168 36 L136 24 C128 46 72 46 64 24 Z"
            fill={color}
          />
          <path
            d="M64 24 L32 36 C18 70 10 130 8 196 L32 200 L40 128 L44 96 L42 214 C80 220 120 220 158 214 L156 96 L160 128 L168 200 L192 196 C190 130 182 70 168 36 L136 24 C128 46 72 46 64 24 Z"
            fill={`url(#${shade})`}
          />
          <path d="M66 26 C76 50 124 50 134 26" fill="none" stroke={fold} strokeWidth="3" />
          <path d="M88 44 L86 92 M112 44 L114 92" stroke={ink} strokeOpacity="0.7" strokeWidth="1.6" />
          <circle cx="86" cy="94" r="2" fill={ink} fillOpacity="0.7" />
          <circle cx="114" cy="94" r="2" fill={ink} fillOpacity="0.7" />
          <path d="M64 154 L136 154 L148 192 L52 192 Z" fill="none" stroke={fold} strokeWidth="1.6" />
          <path d="M43 205 C80 211 120 211 157 205 M9 188 L31 192 M169 192 L191 188" stroke={fold} strokeWidth="6" fill="none" />
          {print && <Print x={100} y={120} w={110} ink={ink} globe={false} />}
        </g>
      )}

      {kind === 'pants' && (
        <g>
          <path d="M50 8 L150 8 L157 44 C164 110 168 190 170 262 L116 264 L101 74 L99 74 L84 264 L30 262 C32 190 36 110 43 44 Z" fill={color} />
          <path d="M50 8 L150 8 L157 44 C164 110 168 190 170 262 L116 264 L101 74 L99 74 L84 264 L30 262 C32 190 36 110 43 44 Z" fill={`url(#${shade})`} />
          <path d="M50 8 L150 8 L151 20 L49 20 Z" fill="rgba(0,0,0,0.18)" />
          <path d="M100 20 L100 70 M58 22 C60 36 72 42 84 42 M142 22 C140 36 128 42 116 42" fill="none" stroke={fold} strokeWidth="1.6" />
          <path d="M60 120 C62 160 58 200 56 250 M140 120 C138 160 142 200 144 250" stroke={hi} strokeWidth="9" fill="none" />
          <path d="M70 70 C74 110 70 150 74 190 M130 70 C126 110 130 150 126 190" stroke={fold} strokeWidth="1" fill="none" />
          <rect x="96" y="10" width="8" height="8" fill={ink} fillOpacity="0.5" />
        </g>
      )}

      {kind === 'cap' && (
        <g>
          <path d="M34 104 C30 46 70 22 100 22 C130 22 170 46 166 104 Z" fill={color} />
          <path d="M34 104 C30 46 70 22 100 22 C130 22 170 46 166 104 Z" fill={`url(#${shade})`} />
          <path d="M100 22 L100 104 M66 30 C58 50 56 80 58 104 M134 30 C142 50 144 80 142 104" stroke={fold} strokeWidth="1.2" fill="none" />
          <circle cx="100" cy="23" r="4" fill={color} stroke={fold} />
          <path d="M26 104 Q100 92 184 106 Q192 124 150 126 Q100 118 30 118 Q16 114 26 104 Z" fill={color} />
          <path d="M26 104 Q100 92 184 106 Q192 124 150 126 Q100 118 30 118 Q16 114 26 104 Z" fill="rgba(0,0,0,0.22)" />
          {print && (
            <text x="100" y="80" textAnchor="middle" fontFamily="'Permanent Marker', cursive" fontSize="34" fill={ink}>
              B.
            </text>
          )}
        </g>
      )}

      {kind === 'bag' && (
        <g>
          <path d="M66 52 C66 14 134 14 134 52" fill="none" stroke={color} strokeWidth="8" />
          <path d="M66 52 C66 14 134 14 134 52" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="8" />
          <rect x="14" y="50" width="172" height="112" rx="26" fill={color} />
          <rect x="14" y="50" width="172" height="112" rx="26" fill={`url(#${shade})`} />
          <path d="M30 70 L170 70" stroke={fold} strokeWidth="2" strokeDasharray="4 4" />
          <rect x="150" y="62" width="10" height="16" rx="2" fill={ink} fillOpacity="0.6" />
          {print && (
            <text x="100" y="124" textAnchor="middle" fontFamily="var(--f-mono)" fontSize="15" letterSpacing="4" fill={ink}>
              BILAIR
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
