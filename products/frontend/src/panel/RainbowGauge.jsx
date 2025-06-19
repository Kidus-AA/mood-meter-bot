import React, { useMemo, useState } from 'react';

export default function RainbowGauge({
  counts = { pos: 0, neu: 0, neg: 0 },
  radius = 90,
  thickness = 14,
  faded = false,
}) {
  const [hover, setHover] = useState(null); // {x, y, text}

  const { paths } = useMemo(() => {
    const { pos, neu, neg } = counts;
    const total = pos + neu + neg;
    const clampTotal = total || 1;
    const segs = [
      { val: neg, color: '#ff6933', name: 'Negative' },
      { val: neu, color: '#f5d328', name: 'Neutral' },
      { val: pos, color: '#4caf50', name: 'Positive' },
    ];

    let startAngle = Math.PI; // 180° (left)
    const pathEls = [];

    for (const { val, color, name } of segs) {
      const angleSpan = (val / clampTotal) * Math.PI;
      const endAngle = startAngle - angleSpan;

      if (val > 0) {
        const largeArc = angleSpan > Math.PI ? 1 : 0;
        const sweep = 1;

        const sx = radius + radius * Math.cos(startAngle);
        const sy = radius - radius * Math.sin(startAngle);
        const ex = radius + radius * Math.cos(endAngle);
        const ey = radius - radius * Math.sin(endAngle);

        const d = [
          `M ${sx} ${sy}`,
          `A ${radius} ${radius} 0 ${largeArc} ${sweep} ${ex} ${ey}`,
        ].join(' ');

        pathEls.push(
          <path
            key={color}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHover({
                x: rect.left + rect.width / 2,
                y: rect.top,
                text: `${val} ${name}`,
              });
            }}
            onMouseLeave={() => setHover(null)}
          />
        );
      }

      // advance for next segment regardless of drawing
      startAngle = endAngle;
    }

    return { paths: pathEls };
  }, [counts, radius, thickness]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={radius * 2 + thickness}
        height={radius + thickness}
        viewBox={`${-thickness / 2} 0 ${radius * 2 + thickness} ${
          radius + thickness
        }`}
        style={{ opacity: faded ? 0.6 : 1, overflow: 'visible' }}
      >
        {paths}
      </svg>
      {hover && (
        <div
          className="tooltip"
          style={{ left: hover.x, top: hover.y - 8, position: 'fixed' }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}
