import React, { useEffect, useRef, useState } from 'react';

export type FailMsg = { msg: string; bg: string };
const FAILS: FailMsg[] = [
  { msg: 'Access denied, bestie 💅', bg: 'silk' },
  { msg: 'Wrong code, right confidence 😭', bg: 'neon' },
  { msg: 'Private vibes only 🔒', bg: 'night' },
  { msg: 'Curiosity looks good on nobody 👀', bg: 'city' },
  { msg: 'Not your lore, sorry \U0001faf6', bg: 'dream' },
  { msg: 'Nice try, Sherlock 🕵️', bg: 'deep' },
  { msg: 'This tea stays here ☕', bg: 'dawn' },
  { msg: 'Girl, respect the boundaries 💀', bg: 'wither' },
  { msg: "Main character's private diary 🎀", bg: 'blush' },
  { msg: 'Cute attempt, still no 🙃', bg: 'bokeh' },
  { msg: 'Mind the digital business 🚪', bg: 'dusk' },
  { msg: 'Your curiosity is showing 👁️', bg: 'nebula' },
  { msg: "Plot twist: it's locked 🔐", bg: 'lights' },
  { msg: 'Personal space, but digital ✨', bg: 'aura' },
  { msg: "Bestie, that's classified 🤫", bg: 'stars' },
];
export function failMsg(_attempt: number): FailMsg { return FAILS[Math.floor(Math.random() * FAILS.length)]; }

export function PinPad({ onDone, title, subtitle, error }: {
  onDone: (pin: string) => void; title: string; subtitle?: string; error?: string | null;
}) {
  const [pin, setPin] = useState('');
  useEffect(() => { if (pin.length === 4) { const p = pin; setPin(''); onDone(p); } }, [pin]);
  const key = (k: string) => {
    if (k === 'back') setPin(p => p.slice(0, -1));
    else if (pin.length < 4) setPin(p => p + k);
  };
  return <div className="lock-box">
    <div className="lock-title">{title}</div>
    {subtitle && <div className="lock-sub">{subtitle}</div>}
    <div className="pin-dots">{[0, 1, 2, 3].map(i => <span key={i} className={'pin-dot' + (pin.length > i ? ' on' : '')} />)}</div>
    {error && <div className="lock-err">{error}</div>}
    <div className="pin-pad">
      {['1','2','3','4','5','6','7','8','9','','0','back'].map((k, i) =>
        k === '' ? <span key={i} /> :
        <button key={i} className="pin-key" onClick={() => key(k)} aria-label={k === 'back' ? 'Delete' : k}>
          {k === 'back' ? '⌫' : k}
        </button>)}
    </div>
  </div>;
}

const DOTS = [0,1,2,3,4,5,6,7,8];
export function PatternPad({ onDone, title, subtitle, error }: {
  onDone: (pat: string) => void; title: string; subtitle?: string; error?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [cur, setCur] = useState<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const pt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };
  const dotAt = (x: number, y: number, w: number, h: number) => {
    for (let i = 0; i < 9; i++) {
      const cx = (i % 3 + 0.5) * w / 3, cy = (Math.floor(i / 3) + 0.5) * h / 3;
      if (Math.hypot(x - cx, y - cy) < w / 8) return i;
    }
    return -1;
  };
  const center = (i: number, w: number, h: number) => ({ x: (i % 3 + 0.5) * w / 3, y: (Math.floor(i / 3) + 0.5) * h / 3 });
  const down = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    drawing.current = true; setSel([]);
    const p = pt(e); const d = dotAt(p.x, p.y, p.w, p.h);
    if (d >= 0) setSel([d]);
    setCur({ x: p.x, y: p.y });
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = pt(e); setCur({ x: p.x, y: p.y });
    const d = dotAt(p.x, p.y, p.w, p.h);
    if (d >= 0) setSel(s => s.includes(d) ? s : [...s, d]);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false; setCur(null);
    setSel(s => { if (s.length >= 2) { const pat = s.join('-'); setTimeout(() => onDone(pat), 150); } return s; });
    setTimeout(() => setSel([]), 400);
  };
  const W = 300, H = 300;
  return <div className="lock-box">
    <div className="lock-title">{title}</div>
    {subtitle && <div className="lock-sub">{subtitle}</div>}
    {error && <div className="lock-err">{error}</div>}
    <div ref={ref} className="pattern-pad" style={{ width: 'min(78vw, 300px)', height: 'min(78vw, 300px)' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <svg viewBox={`0 0 ${W} ${H}`} className="pattern-lines">
        {sel.slice(1).map((d, i) => {
          const a = center(sel[i], W, H), b = center(d, W, H);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {sel.length > 0 && cur && (() => { const a = center(sel[sel.length - 1], W, H); return <line x1={a.x} y1={a.y} x2={cur.x} y2={cur.y} className="live" />; })()}
      </svg>
      {DOTS.map(i => {
        const c = center(i, W, H);
        return <span key={i} className={'pattern-dot' + (sel.includes(i) ? ' on' : '')}
          style={{ left: (c.x / W * 100) + '%', top: (c.y / H * 100) + '%' }} />;
      })}
    </div>
  </div>;
}

const EMOJIS = ['😌','🙃','🌙','✨','🦋','🌸','🍉','☕️','🎧','📚','💜','🔥'];
export function EmojiPad({ onDone, title, subtitle, error }: {
  onDone: (seq: string) => void; title: string; subtitle?: string; error?: string | null;
}) {
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => { if (sel.length === 4) { const s = sel.join('|'); setSel([]); onDone(s); } }, [sel]);
  return <div className="lock-box">
    <div className="lock-title">{title}</div>
    {subtitle && <div className="lock-sub">{subtitle}</div>}
    <div className="pin-dots">{[0, 1, 2, 3].map(i => <span key={i} className={'pin-dot' + (sel.length > i ? ' on' : '')} />)}</div>
    {error && <div className="lock-err">{error}</div>}
    <div className="emoji-pad">
      {EMOJIS.map(e => <button key={e} className="emoji-key" onClick={() => sel.length < 4 && setSel(s => [...s, e])}>{e}</button>)}
    </div>
    {sel.length > 0 && <button className="lock-backspace" onClick={() => setSel(s => s.slice(0, -1))}>⌫ undo</button>}
  </div>;
}
