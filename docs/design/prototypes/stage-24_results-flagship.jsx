/* global React */
const { useState, useEffect } = React;

// =============================================================
//  TOKENS — $10M SaaS portal, no gradients, polished and rich
// =============================================================
const T = {
  // Surfaces
  bg:        '#FAF8FF',   // app background — barely-tinted lavender white
  surface:   '#FFFFFF',
  surfaceAlt:'#F5F3FF',   // brand-50 for soft chips / hover wash
  // Ink
  ink:       '#1E1B4B',   // brand-900 / slate-900
  inkSoft:   '#3B3566',   // slate-700
  mute:      '#7C7399',   // slate-500
  faint:     '#A8A0C0',   // slate-400
  border:    '#E9E5F5',   // slate-100
  borderSoft:'#F0EDF8',
  // Royal purple
  brand50:   '#F5F3FF',
  brand100:  '#EDE9FE',
  brand300:  '#C4B5FD',
  brand500:  '#5925A8',
  brand600:  '#4A1D96',
  brand700:  '#3B1584',
  // Accents / status
  orange:    '#E26A2C',
  orangeSoft:'#FFF1E6',
  orangeBorder:'#F8D5B8',
  green600:  '#16A34A',
  green50:   '#F0FDF4',
  greenBorder:'#BBF7D0',
  red600:    '#DC2626',
  red50:     '#FEF2F2',
  redBorder: '#FECACA',
  amber600:  '#D97706',
  amber50:   '#FFFBEB',
  amberBorder:'#FEF3C7',
};

const FONT_SANS = 'Roboto, system-ui, sans-serif';
const FONT_SERIF = '"DM Serif Display", Georgia, serif';

// =============================================================
//  Brand mark
// =============================================================
const BrandMark = () => (
  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2"  y="2"  width="11" height="11" rx="2.5" fill={T.brand500} />
      <rect x="15" y="2"  width="6"  height="11" rx="2"   fill={T.brand300} />
      <rect x="23" y="2"  width="3"  height="6"  rx="1"   fill={T.orange} />
      <rect x="2"  y="15" width="6"  height="6"  rx="1.5" fill={T.brand300} />
      <rect x="10" y="15" width="11" height="11" rx="2.5" fill={T.brand500} />
      <rect x="23" y="10" width="3"  height="11" rx="1"   fill={T.brand500} opacity="0.6" />
      <rect x="2"  y="23" width="6"  height="3"  rx="1"   fill={T.orange} opacity="0.85" />
      <rect x="23" y="23" width="3"  height="3"  rx="1"   fill={T.brand300} />
    </svg>
    <span style={{
      fontFamily: FONT_SANS,
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: '-0.01em',
      color: T.ink,
    }}>
      MindMosaic
    </span>
  </a>
);

// =============================================================
//  Top nav
// =============================================================
const TopNav = ({ width }) => {
  const isMobile = width < 900;
  const NavLink = ({ children, active }) => (
    <a href="#" style={{
      fontFamily: FONT_SANS,
      fontSize: 14,
      fontWeight: 500,
      color: active ? T.brand500 : T.mute,
      background: active ? T.brand50 : 'transparent',
      padding: '6px 12px',
      borderRadius: 6,
      textDecoration: 'none',
    }}>{children}</a>
  );
  return (
    <header style={{
      width: '100%',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${T.border}`,
      padding: isMobile ? '0 24px' : '0 40px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <BrandMark />
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavLink>Dashboard</NavLink>
            <NavLink>Learn</NavLink>
            <NavLink>Practice</NavLink>
            <NavLink>Assignments</NavLink>
            <NavLink active>Results</NavLink>
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Bell */}
        <button aria-label="Notifications" style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', color: T.inkSoft,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: T.orange, boxShadow: '0 0 0 2px white' }} />
        </button>
        <div style={{ width: 1, height: 20, background: T.border }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: T.brand100, color: T.brand600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_SANS, fontWeight: 600, fontSize: 13,
          }}>S</div>
          {!isMobile && (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: T.ink }}>Sarah</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.faint, marginTop: 1 }}>Year 5</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// =============================================================
//  Card
// =============================================================
const Card = ({ children, style, padding = 24 }) => (
  <div style={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(30, 27, 75, 0.04), 0 1px 2px rgba(30, 27, 75, 0.02)',
    padding,
    ...style,
  }}>
    {children}
  </div>
);

// =============================================================
//  Hero — score ring + verdict
// =============================================================
const HeroRing = ({ value, color }) => {
  const size = 132;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 1200;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setProgress(eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const offset = c * (1 - (value / 100) * progress);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: FONT_SERIF,
          fontSize: 38,
          color: color,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}>
          {Math.round(value * progress)}<span style={{ fontSize: 22 }}>%</span>
        </div>
        <div style={{
          fontFamily: FONT_SANS,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: T.faint,
          marginTop: 6,
        }}>
          Mastery
        </div>
      </div>
    </div>
  );
};

const Pill = ({ children, tone = 'neutral' }) => {
  const styles = {
    neutral: { bg: T.bg, color: T.inkSoft, border: T.border },
    brand:   { bg: T.brand50, color: T.brand600, border: T.brand100 },
    green:   { bg: T.green50, color: T.green600, border: T.greenBorder },
    red:     { bg: T.red50,   color: T.red600,   border: T.redBorder },
    amber:   { bg: T.amber50, color: T.amber600, border: T.amberBorder },
    orange:  { bg: T.orangeSoft, color: T.orange, border: T.orangeBorder },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: styles.bg,
      color: styles.color,
      border: `1px solid ${styles.border}`,
      fontFamily: FONT_SANS,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.4,
    }}>
      {children}
    </span>
  );
};

const Hero = ({ width }) => {
  const isMobile = width < 900;
  return (
    <section style={{ paddingTop: 32, paddingBottom: 8 }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'center' : 'center',
        gap: isMobile ? 24 : 36,
        textAlign: isMobile ? 'center' : 'left',
      }}>
        <HeroRing value={84} color={T.brand500} />

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: FONT_SANS,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: T.faint,
            marginBottom: 8,
          }}>
            Mock Exam · 06 May 2026
          </div>
          <h1 style={{
            fontFamily: FONT_SERIF,
            fontSize: isMobile ? 30 : 36,
            fontWeight: 400,
            color: T.ink,
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
            marginBottom: 6,
          }}>
            Excellent result, Sarah.
          </h1>
          <p style={{
            fontFamily: FONT_SANS,
            fontSize: 15,
            color: T.mute,
            lineHeight: 1.55,
            maxWidth: 560,
            marginBottom: 16,
          }}>
            You have demonstrated strong understanding across this exam, with one focused area to lock in.
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            <Pill tone="brand">NAPLAN Y5 Numeracy</Pill>
            <Pill>32m of 40m</Pill>
            <Pill>Attempt 2</Pill>
            <Pill tone="green">↑ 12% vs last attempt</Pill>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================================
//  Snapshot stat cards
// =============================================================
const StatCard = ({ label, value, sub, valueColor }) => (
  <Card padding={18}>
    <div style={{
      fontFamily: FONT_SANS,
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: T.faint,
      marginBottom: 6,
    }}>{label}</div>
    <div style={{
      fontFamily: FONT_SANS,
      fontSize: 26,
      fontWeight: 700,
      color: valueColor || T.ink,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.01em',
      lineHeight: 1.05,
    }}>{value}</div>
    {sub && (
      <div style={{
        fontFamily: FONT_SANS, fontSize: 11, color: T.faint, marginTop: 4,
      }}>{sub}</div>
    )}
  </Card>
);

const Snapshot = ({ width }) => {
  const cols = width < 700 ? 2 : width < 1100 ? 3 : 6;
  return (
    <section style={{ paddingTop: 24, paddingBottom: 8 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
      }}>
        <StatCard label="Correct"    value="24" sub="of 30" valueColor={T.green600} />
        <StatCard label="Incorrect"  value="4"  sub="of 30" valueColor={T.red600} />
        <StatCard label="Unanswered" value="2"  sub="marks lost" valueColor={T.amber600} />
        <StatCard label="Accuracy"   value="84%" sub="overall"   valueColor={T.brand500} />
        <StatCard label="Time used"  value="32m" sub="of 40m" />
        <StatCard label="vs Previous" value="+12%" sub="improvement" valueColor={T.green600} />
      </div>
    </section>
  );
};

// =============================================================
//  Card header (reusable)
// =============================================================
const CardHeader = ({ title, subtitle, right }) => (
  <div style={{
    padding: '20px 24px 16px',
    borderBottom: `1px solid ${T.borderSoft}`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  }}>
    <div>
      <h3 style={{
        fontFamily: FONT_SANS,
        fontSize: 15,
        fontWeight: 600,
        color: T.ink,
        letterSpacing: '-0.005em',
        marginBottom: subtitle ? 2 : 0,
      }}>{title}</h3>
      {subtitle && (
        <p style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.faint }}>{subtitle}</p>
      )}
    </div>
    {right}
  </div>
);

// =============================================================
//  Topic breakdown
// =============================================================
const TOPICS = [
  { name: 'Fractions',           pct: 92, correct: 11, total: 12, skills: [{ n: 'Equivalents', x: '4/4' }, { n: 'Mixed numbers', x: '3/4' }, { n: 'Word problems', x: '4/4' }] },
  { name: 'Multi-step problems', pct: 88, correct: 7,  total: 8,  skills: [{ n: 'Two-step',    x: '4/4' }, { n: 'Three-step',    x: '3/4' }] },
  { name: 'Decimals',            pct: 85, correct: 5,  total: 6,  skills: [{ n: 'Addition',    x: '3/3' }, { n: 'Conversion',    x: '2/3' }] },
  { name: 'Measurement',         pct: 78, correct: 7,  total: 9,  skills: [{ n: 'Length',      x: '3/3' }, { n: 'Volume',        x: '2/3' }, { n: 'Area',          x: '2/3' }] },
  { name: 'Geometry',            pct: 71, correct: 5,  total: 7,  skills: [{ n: 'Angles',      x: '3/4' }, { n: 'Shapes',        x: '2/3' }] },
];

const pctTone = (p) => p >= 85 ? 'green' : p >= 70 ? 'brand' : p >= 50 ? 'amber' : 'red';
const pctColor = (p) => ({
  green: T.green600, brand: T.brand500, amber: T.amber600, red: T.red600,
}[pctTone(p)]);

const TopicRow = ({ topic }) => {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(topic.pct), 240); return () => clearTimeout(t); }, [topic.pct]);
  const color = pctColor(topic.pct);
  return (
    <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.borderSoft}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, color: T.ink }}>{topic.name}</span>
          <Pill tone={pctTone(topic.pct)}>{topic.pct}%</Pill>
        </div>
        <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.faint, fontVariantNumeric: 'tabular-nums' }}>
          {topic.correct}/{topic.total} correct
        </span>
      </div>
      <div style={{
        height: 6, background: T.border, borderRadius: 100, overflow: 'hidden', marginBottom: 12,
      }}>
        <div style={{
          width: `${w}%`,
          height: '100%',
          background: color,
          borderRadius: 100,
          transition: 'width 900ms cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {topic.skills.map(s => (
          <span key={s.n} style={{
            fontFamily: FONT_SANS, fontSize: 11, fontWeight: 500,
            padding: '3px 8px', borderRadius: 4,
            background: T.surfaceAlt, color: T.brand600,
          }}>
            {s.n} {s.x}
          </span>
        ))}
      </div>
    </div>
  );
};

const TopicBreakdown = () => (
  <Card padding={0}>
    <CardHeader title="Topic Breakdown" subtitle="Performance by curriculum strand" />
    <div>
      {TOPICS.map((t, i) => <TopicRow key={t.name} topic={t} />)}
    </div>
  </Card>
);

// =============================================================
//  Strengths & gaps
// =============================================================
const SkillList = ({ icon, iconBg, iconColor, title, items, mode }) => (
  <Card padding={20}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <h4 style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: T.ink }}>{title}</h4>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((s, i) => mode === 'progress' ? (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: T.inkSoft }}>{s.name}</span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, color: pctColor(s.pct), fontVariantNumeric: 'tabular-nums' }}>{s.pct}%</span>
          </div>
          <div style={{ height: 5, background: T.border, borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ width: `${s.pct}%`, height: '100%', background: pctColor(s.pct), borderRadius: 100 }} />
          </div>
        </div>
      ) : (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green600} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          <span style={{ fontFamily: FONT_SANS, fontSize: 13, color: T.inkSoft, flex: 1 }}>{s.name}</span>
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: T.green600 }}>{s.x}</span>
        </div>
      ))}
    </div>
  </Card>
);

// =============================================================
//  Performance insights
// =============================================================
const Insights = () => (
  <Card padding={24}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: T.brand50, color: T.brand500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      </div>
      <h3 style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: T.ink }}>Performance Insights</h3>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT_SANS, fontSize: 14, color: T.inkSoft, lineHeight: 1.6 }}>
      <p>You scored <span style={{ fontWeight: 600, color: T.brand500 }}>84%</span> with 24 correct out of 30 questions, leaving <span style={{ fontWeight: 600, color: T.amber600 }}>2 unanswered</span>.</p>
      <p>Your strongest strand was <span style={{ fontWeight: 600, color: T.green600 }}>Fractions</span> at 92% — particularly in equivalents and word problems.</p>
      <p>The biggest area for improvement is <span style={{ fontWeight: 600, color: T.red600 }}>Geometry</span> at 71%. Within this strand, <span style={{ fontWeight: 500 }}>Shapes</span> had the lowest accuracy (67%).</p>
      <p>Compared to your previous attempt, you improved by <span style={{ fontWeight: 600, color: T.green600 }}>12 percentage points</span>.</p>
    </div>
  </Card>
);

// =============================================================
//  Next best action — flat purple, no gradient
// =============================================================
const NextAction = () => {
  const [hover, setHover] = useState(false);
  return (
    <div style={{
      background: T.brand500,
      borderRadius: 12,
      padding: 24,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${T.brand600}`,
    }}>
      {/* faint geometric tile mark */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180,
        opacity: 0.08,
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 100 100" fill="white">
          <rect x="10" y="10" width="35" height="35" rx="6"/>
          <rect x="55" y="10" width="20" height="35" rx="4"/>
          <rect x="10" y="55" width="20" height="20" rx="3"/>
          <rect x="40" y="55" width="35" height="35" rx="6"/>
        </svg>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{
          fontFamily: FONT_SANS,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.65)',
          marginBottom: 10,
        }}>
          Recommended Next Step
        </div>
        <h3 style={{
          fontFamily: FONT_SERIF,
          fontWeight: 400,
          fontSize: 22,
          color: 'white',
          marginBottom: 8,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
        }}>
          Practice Mixed-Number Conversions
        </h3>
        <p style={{
          fontFamily: FONT_SANS,
          fontSize: 13.5,
          color: 'rgba(255,255,255,0.78)',
          lineHeight: 1.55,
          marginBottom: 18,
        }}>
          This was your weakest skill — a focused 10-minute practice can target exactly this gap.
        </p>
        <button
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            background: hover ? T.brand50 : 'white',
            color: T.brand600,
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            transition: 'background 150ms ease',
            letterSpacing: '0.005em',
          }}>
          Start Practice
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
};

// =============================================================
//  Quick actions list
// =============================================================
const QuickAction = ({ icon, iconBg, iconColor, title, sub }) => {
  const [hover, setHover] = useState(false);
  return (
    <a href="#"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        borderRadius: 8,
        textDecoration: 'none',
        background: hover ? T.bg : 'transparent',
        transition: 'background 150ms ease',
      }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 500, color: T.ink }}>{title}</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: T.faint, marginTop: 1 }}>{sub}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hover ? T.mute : T.faint} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
    </a>
  );
};

const QuickActions = () => (
  <Card padding={20}>
    <h4 style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 8 }}>More Actions</h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <QuickAction
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>}
        iconBg={T.brand50} iconColor={T.brand500}
        title="Retake Full Exam" sub="Try all 30 questions again"
      />
      <QuickAction
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
        iconBg={T.red50} iconColor={T.red600}
        title="Retry Incorrect Only" sub="6 questions to redo"
      />
      <QuickAction
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        iconBg={T.bg} iconColor={T.mute}
        title="Back to Learning Hub" sub="View your updated plan"
      />
    </div>
  </Card>
);

// =============================================================
//  Question review
// =============================================================
const QUESTIONS = [
  { id: 1, status: 'incorrect', topic: 'Number & Algebra', skill: 'Fractions',
    text: 'Convert 5/3 to a mixed number.',
    options: ['5/3', '1⅔', '2½', '3⅕'],
    yours: 0, correct: 1,
    explanation: '5 ÷ 3 = 1 remainder 2, so 5/3 = 1⅔.',
    tip: 'Divide numerator by denominator and write the remainder over the divisor.' },
  { id: 2, status: 'correct', topic: 'Number & Algebra', skill: 'Fractions',
    text: 'A pizza is cut into 8 equal slices. What fraction does 3 slices represent?' },
  { id: 3, status: 'correct', topic: 'Number & Algebra', skill: 'Decimals',
    text: 'Which of these is equivalent to 0.75?' },
  { id: 4, status: 'incorrect', topic: 'Number & Algebra', skill: 'Fractions',
    text: 'Express 11/4 as a mixed number.',
    options: ['11/4', '2¾', '3¼', '4¾'],
    yours: 0, correct: 1,
    explanation: '11 ÷ 4 = 2 remainder 3, so 11/4 = 2¾.',
    tip: 'Same pattern as Q1 — practice converting improper fractions into mixed numbers.' },
  { id: 5, status: 'unanswered', topic: 'Measurement & Geometry', skill: 'Angles',
    text: 'A triangle has angles in the ratio 2:3:4. What is the largest angle?' },
];

const StatusIcon = ({ status }) => {
  if (status === 'correct') {
    return (
      <div style={{ width: 28, height: 28, borderRadius: 8, background: T.green50, border: `1px solid ${T.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green600} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
    );
  }
  if (status === 'incorrect') {
    return (
      <div style={{ width: 28, height: 28, borderRadius: 8, background: T.red50, border: `1px solid ${T.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.red600} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
    );
  }
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
  );
};

const TabButton = ({ children, active, count, onClick }) => (
  <button onClick={onClick} style={{
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '10px 14px',
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 500,
    color: active ? T.brand500 : T.mute,
    borderBottom: active ? `2px solid ${T.brand500}` : '2px solid transparent',
    marginBottom: -1,
    display: 'inline-flex', alignItems: 'center', gap: 8,
  }}>
    {children}
    <span style={{
      fontFamily: FONT_SANS,
      fontSize: 11, fontWeight: 600,
      padding: '1px 7px', borderRadius: 999,
      background: active ? T.brand100 : T.borderSoft,
      color: active ? T.brand600 : T.mute,
    }}>{count}</span>
  </button>
);

const LETTERS = ['A', 'B', 'C', 'D'];

const QuestionRow = ({ q, expanded, onToggle }) => {
  const isExpandable = !!q.options;
  return (
    <div style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
      <button
        onClick={isExpandable ? onToggle : undefined}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          padding: '16px 24px',
          cursor: isExpandable ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
        <StatusIcon status={q.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: T.faint }}>Q{q.id}</span>
            <span style={{ color: T.faint, fontSize: 11 }}>·</span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.faint }}>{q.topic}</span>
            <span style={{ color: T.faint, fontSize: 11 }}>·</span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: T.faint }}>{q.skill}</span>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 14, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {q.text}
          </div>
        </div>
        <Pill tone={q.status === 'correct' ? 'green' : q.status === 'incorrect' ? 'red' : 'amber'}>
          {q.status === 'correct' ? 'Correct' : q.status === 'incorrect' ? 'Incorrect' : 'Unanswered'}
        </Pill>
        {isExpandable && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2"
            style={{ transition: 'transform 200ms ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        )}
      </button>
      {isExpandable && (
        <div style={{
          maxHeight: expanded ? 600 : 0,
          overflow: 'hidden',
          transition: 'max-height 320ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div style={{ padding: '4px 24px 22px 66px' }}>
            <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
              {q.text}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correct;
                const isYours = i === q.yours;
                const wrong = isYours && !isCorrect;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isCorrect ? T.greenBorder : wrong ? T.redBorder : T.border}`,
                    background: isCorrect ? T.green50 : wrong ? T.red50 : 'white',
                    color: isCorrect ? T.green600 : wrong ? T.red600 : T.mute,
                    fontFamily: FONT_SANS,
                    fontSize: 13,
                    textDecoration: wrong ? 'line-through' : 'none',
                  }}>
                    <span style={{ fontWeight: 600, width: 16 }}>{LETTERS[i]}</span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {isCorrect && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.green600} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                    {wrong && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.red600} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{
              padding: '12px 14px',
              background: T.brand50,
              borderRadius: 8,
              borderLeft: `3px solid ${T.brand500}`,
              marginBottom: 8,
            }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: T.brand600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Explanation</div>
              <p style={{ fontFamily: FONT_SANS, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55 }}>{q.explanation}</p>
            </div>
            {q.tip && (
              <div style={{
                padding: '10px 14px',
                background: T.orangeSoft,
                borderRadius: 8,
                borderLeft: `3px solid ${T.orange}`,
              }}>
                <div style={{ fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: T.orange, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Tip</div>
                <p style={{ fontFamily: FONT_SANS, fontSize: 13, color: T.inkSoft, lineHeight: 1.55 }}>{q.tip}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionReview = () => {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(1);
  const filtered = QUESTIONS.filter(q => filter === 'all' || q.status === filter);
  return (
    <Card padding={0}>
      <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: T.ink }}>Question Review</h3>
          <span style={{ fontFamily: FONT_SANS, fontSize: 12, color: T.faint }}>30 questions</span>
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 14, marginBottom: -1 }}>
          <TabButton active={filter === 'all'}        count={30} onClick={() => setFilter('all')}>All</TabButton>
          <TabButton active={filter === 'incorrect'}  count={4}  onClick={() => setFilter('incorrect')}>Incorrect</TabButton>
          <TabButton active={filter === 'unanswered'} count={2}  onClick={() => setFilter('unanswered')}>Unanswered</TabButton>
          <TabButton active={filter === 'correct'}    count={24} onClick={() => setFilter('correct')}>Correct</TabButton>
        </div>
      </div>
      <div>
        {filtered.map(q => (
          <QuestionRow key={q.id} q={q}
            expanded={expanded === q.id}
            onToggle={() => setExpanded(expanded === q.id ? null : q.id)} />
        ))}
      </div>
    </Card>
  );
};

// =============================================================
//  Full screen
// =============================================================
const ResultsScreen = ({ width }) => {
  const isMobile = width < 900;
  const padX = isMobile ? 24 : 40;

  const weakSkills = [
    { name: 'Mixed-number conversions', pct: 50 },
    { name: 'Geometry – Shapes',         pct: 67 },
    { name: 'Measurement – Volume',      pct: 67 },
    { name: 'Decimals – Conversion',     pct: 67 },
  ];
  const strongSkills = [
    { name: 'Fractions – Equivalents', x: '4/4' },
    { name: 'Two-step problems',       x: '4/4' },
    { name: 'Decimals – Addition',     x: '3/3' },
    { name: 'Measurement – Length',    x: '3/3' },
  ];

  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      background: T.bg,
      color: T.ink,
      fontFamily: FONT_SANS,
    }}>
      <TopNav width={width} />

      <main style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: `0 ${padX}px 80px`,
      }}>
        <Hero width={width} />
        <Snapshot width={width} />

        {/* Main grid */}
        <section style={{ paddingTop: 16 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 3fr) minmax(0, 2fr)',
            gap: 24,
          }}>
            {/* Left col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <TopicBreakdown />
              <div style={{
                display: 'grid',
                gridTemplateColumns: width < 700 ? '1fr' : '1fr 1fr',
                gap: 16,
              }}>
                <SkillList
                  title="Skills to Improve"
                  iconBg={T.red50} iconColor={T.red600}
                  icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 7l-5 5-5-5"/></svg>}
                  items={weakSkills}
                  mode="progress"
                />
                <SkillList
                  title="Strengths"
                  iconBg={T.green50} iconColor={T.green600}
                  icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17l5-5 5 5"/></svg>}
                  items={strongSkills}
                  mode="check"
                />
              </div>
            </div>
            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <Insights />
              <NextAction />
              <QuickActions />
            </div>
          </div>
        </section>

        {/* Question review */}
        <section style={{ paddingTop: 32 }}>
          <QuestionReview />
        </section>
      </main>
    </div>
  );
};

window.ResultsScreen = ResultsScreen;
