import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileCard, useLocalState } from '@instinct/files';
import './style.css';
import { PinPad, PatternPad, EmojiPad, failMsg } from './lock';
import { AuthScreen, Profiles } from './auth';
import { Attachment, mediaStore, mediaSupported } from './db';
import { AttachmentView, filesToAttachments, useMediaUrl, useRecorder } from './media';
import w1 from './photos/w-amethyst.jpg'; import w2 from './photos/w-cosmos.jpg';
import w3 from './photos/w-gradient.jpg'; import w4 from './photos/w-nightclouds.jpg';
import w5 from './photos/w-stars.jpg'; import w6 from './photos/w-wave.jpg';
import f1 from './photos/floral1.jpg'; import f2 from './photos/floral2.jpg';
import f3 from './photos/floral3.jpg'; import f4 from './photos/floral4.jpg';
import f5 from './photos/floral5.jpg'; import f6 from './photos/floral6.jpg';
import o1 from './photos/ocean1.jpg'; import o2 from './photos/ocean2.jpg';
import o3 from './photos/ocean3.jpg'; import o4 from './photos/ocean4.jpg'; import o5 from './photos/ocean5.jpg';
import s1 from './photos/sky1.jpg'; import s2 from './photos/sky2.jpg';
import s3 from './photos/sky3.jpg'; import s4 from './photos/sky4.jpg'; import s5 from './photos/sky5.jpg';
import g1 from './photos/grad1.jpg';
import r1 from './photos/rain1.jpg'; import r2 from './photos/rain2.jpg';
import r3 from './photos/rain3.jpg'; import r4 from './photos/rain4.jpg'; import r6 from './photos/rain6.jpg';

const WALLPAPERS: { key: string; src: string; label: string }[] = [
  { key: 'silk', src: w1, label: 'Silk' }, { key: 'nebula', src: w2, label: 'Nebula' },
  { key: 'aura', src: w3, label: 'Aura' }, { key: 'night', src: w4, label: 'Night' },
  { key: 'stars', src: w5, label: 'Stars' }, { key: 'flow', src: w6, label: 'Flow' },
  { key: 'bloom', src: f1, label: 'Bloom' }, { key: 'petal', src: f2, label: 'Petal' },
  { key: 'lilac', src: f3, label: 'Lilac' }, { key: 'roses', src: f4, label: 'Roses' },
  { key: 'ivory', src: f5, label: 'Ivory' }, { key: 'wither', src: f6, label: 'Wither' },
  { key: 'tide', src: o1, label: 'Tide' }, { key: 'foam', src: o2, label: 'Foam' },
  { key: 'surf', src: o3, label: 'Surf' }, { key: 'deep', src: o4, label: 'Deep' },
  { key: 'navy', src: o5, label: 'Navy' }, { key: 'dusk', src: s1, label: 'Dusk' },
  { key: 'haze', src: g1, label: 'Haze' }, { key: 'dream', src: s2, label: 'Dream' },
  { key: 'blush', src: s3, label: 'Blush' }, { key: 'cotton', src: s4, label: 'Cotton' },
  { key: 'dawn', src: s5, label: 'Dawn' }, { key: 'neon', src: r1, label: 'Neon' },
  { key: 'drizzle', src: r2, label: 'Drizzle' }, { key: 'lights', src: r3, label: 'Lights' },
  { key: 'city', src: r4, label: 'City' }, { key: 'bokeh', src: r6, label: 'Bokeh' },
];
const bgSrc = (k: string | null) => WALLPAPERS.find(w => w.key === k)?.src ?? null;
const NOTE_BG = '#1e1f24';

interface ListItem { id: string; text: string; done: boolean }
interface Note {
  id: string; type: 'text' | 'list';
  title: string; body: string; items: ListItem[];
  bg: string | null; locked: boolean; pinned: boolean;
  attachments: Attachment[];
  createdAt: number; updatedAt: number;
}
type LockCfg = { mode: 'pin' | 'pattern' | 'emoji'; salt: string; hash: string };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
async function hashCode(code: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + code));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const newNote = (type: 'text' | 'list'): Note => ({
  id: uid(), type, title: '', body: '',
  items: type === 'list' ? [{ id: uid(), text: '', done: false }] : [],
  bg: null, locked: false, pinned: false, attachments: [],
  createdAt: Date.now(), updatedAt: Date.now(),
});
const hasContent = (n: Note) => n.title.trim() || n.body.trim() || n.items.some(i => i.text.trim()) || (n.attachments?.length ?? 0) > 0;

const IcLock = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
const IcUnlock = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/></svg>;
const IcTrash = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13"/></svg>;
const IcPlus = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>;
const IcPalette = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-.8 2-1.7 0-1.4-1.3-1.7-1.3-3 0-1.2 1-2 2.3-2H17a4.5 4.5 0 0 0 4.5-4.3C21.5 5.7 17.2 3 12 3z"/><circle cx="7.5" cy="11.5" r="1.1" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.1" fill="currentColor"/><circle cx="14.8" cy="7.8" r="1.1" fill="currentColor"/></svg>;
const IcList = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 1 1 2-2M4 15l1 1 2-2"/></svg>;
const IcGrid = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="7" height="10" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="16" width="7" height="4" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>;
const IcRows = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/></svg>;
const IcSearch = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
const IcBack = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>;

function NoteCard({ n, unlocked, onOpen }: { n: Note; unlocked: boolean; onOpen: () => void }) {
  const firstImg = (n.attachments ?? []).find(a => a.kind === 'image');
  const hidden = n.locked && !unlocked;
  const bg = bgSrc(n.bg);
  const style: React.CSSProperties = bg
    ? { backgroundImage: `linear-gradient(rgba(10,10,14,.5), rgba(10,10,14,.68)), url(${bg})` }
    : { background: NOTE_BG };
  const preview = n.type === 'list'
    ? n.items.filter(i => i.text.trim()).slice(0, 5).map(i => i.text).join('\n')
    : n.body;
  return <button className={'card' + (hidden ? ' is-hidden' : '')} style={style} onClick={onOpen}>
    {hidden ? <div className="card-lock"><IcLock /><span>Locked</span></div> : <>
      {n.title && <div className="card-title">{n.title}</div>}
      {preview && <div className="card-body">{preview}</div>}
      {!n.title && !preview && !(n.attachments ?? []).length && <div className="card-body card-empty">Empty note</div>}
      {firstImg && <CardThumb id={firstImg.id} />}
      {((n.attachments ?? []).length > 0 || n.locked) && <div className="card-meta">
        {(n.attachments ?? []).length > 0 && <span className="chip">{(n.attachments ?? []).map(a => a.kind === 'image' ? '📷' : a.kind === 'video' ? '🎬' : '🎙').slice(0, 3).join(' ')}</span>}
        {n.locked && <span className="chip"><IcLock /></span>}
      </div>}
    </>}
  </button>;
}
function CardThumb({ id }: { id: string }) {
  const url = useMediaUrl(id);
  return url ? <img className="card-thumb" src={url} alt="" /> : null;
}

function Editor({ note, onClose, onChange, onDelete, onToggleLock, mediaOk }: {
  note: Note; onClose: () => void; onChange: (n: Note) => void;
  onDelete: (n: Note) => void; onToggleLock: (n: Note) => void; mediaOk: boolean;
}) {
  const n = note;
  const [sheet, setSheet] = useState(false);
  const fileImg = useRef<HTMLInputElement>(null);
  const fileVid = useRef<HTMLInputElement>(null);
  const fileAud = useRef<HTMLInputElement>(null);
  const { rec, start: startRec, stop: stopRec } = useRecorder(a => update({ attachments: [...(n.attachments ?? []), a] }));
  const addFiles = async (fl: FileList | null, kind: Attachment['kind']) => {
    const atts = await filesToAttachments(fl, kind);
    if (atts.length) update({ attachments: [...(n.attachments ?? []), ...atts] });
  };
  const removeAtt = (id: string) => { mediaStore.del(id).catch(() => {}); update({ attachments: (n.attachments ?? []).filter(a => a.id !== id) }); };
  const update = (patch: Partial<Note>) => onChange({ ...n, ...patch, updatedAt: Date.now() });
  const setItem = (id: string, patch: Partial<ListItem>) =>
    update({ items: n.items.map(i => i.id === id ? { ...i, ...patch } : i) });
  const bg = bgSrc(n.bg);
  const editorStyle: React.CSSProperties = bg
    ? { backgroundImage: `linear-gradient(rgba(10,10,14,.5), rgba(10,10,14,.72)), url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: NOTE_BG };

  return <div className="editor" style={editorStyle}>
    <div className="ed-top">
      <button className="ic-btn" onClick={onClose} aria-label="Back"><IcBack /></button>
      <div className="ed-top-right">
        <button className={'ic-btn' + (sheet ? ' active' : '')} onClick={() => setSheet(s => !s)} aria-label="Background"><IcPalette /></button>
        <button className="ic-btn" onClick={() => update({ type: n.type === 'list' ? 'text' : 'list' })} aria-label="Toggle list"><IcList /></button>
        <button className={'ic-btn' + (n.locked ? ' active' : '')} onClick={() => onToggleLock(n)} aria-label="Lock">{n.locked ? <IcLock /> : <IcUnlock />}</button>
        <button className="ic-btn" onClick={() => onDelete(n)} aria-label="Delete"><IcTrash /></button>
      </div>
    </div>

    <input className="ed-title" placeholder="Title" value={n.title}
      onChange={e => update({ title: e.target.value })} />
    {n.type === 'text'
      ? <textarea className="ed-body" placeholder="Start writing..." value={n.body}
          onChange={e => update({ body: e.target.value })} rows={8} />
      : <div className="ed-list">
          {n.items.map((i, idx) => <div key={i.id} className="ed-li">
            <button className={'ed-check' + (i.done ? ' done' : '')} onClick={() => setItem(i.id, { done: !i.done })}>{i.done ? '✓' : ''}</button>
            <input className={'ed-li-text' + (i.done ? ' done' : '')} placeholder="List item" value={i.text}
              onChange={e => setItem(i.id, { text: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const ni = { id: uid(), text: '', done: false }; const items = [...n.items]; items.splice(idx + 1, 0, ni); update({ items }); } }} />
            <button className="ed-li-x" onClick={() => update({ items: n.items.filter(x => x.id !== i.id) })}>×</button>
          </div>)}
          <button className="ed-li-add" onClick={() => update({ items: [...n.items, { id: uid(), text: '', done: false }] })}>+ Add item</button>
        </div>}

    {(n.attachments ?? []).length > 0 && <div className="att-list">
      {(n.attachments ?? []).map(a => <AttachmentView key={a.id} a={a} onRemove={removeAtt} />)}
    </div>}

    {mediaOk && <div className="attach-row">
      <button className="attach-btn" onClick={() => fileImg.current?.click()}>📷 Photo</button>
      <button className="attach-btn" onClick={() => fileVid.current?.click()}>🎬 Video</button>
      <button className="attach-btn" onClick={() => fileAud.current?.click()}>🎵 Audio</button>
      {rec.on
        ? <button className="attach-btn rec" onClick={stopRec}>⏺ {rec.sec}s - stop</button>
        : <button className="attach-btn" onClick={startRec}>🎙 Voice</button>}
      <input ref={fileImg} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'image'); e.target.value = ''; }} />
      <input ref={fileVid} type="file" accept="video/*" hidden onChange={e => { addFiles(e.target.files, 'video'); e.target.value = ''; }} />
      <input ref={fileAud} type="file" accept="audio/*" hidden onChange={e => { addFiles(e.target.files, 'audio'); e.target.value = ''; }} />
    </div>}

    {sheet && <div className="sheet" onClick={() => setSheet(false)}>
      <div className="sheet-in" onClick={e => e.stopPropagation()}>
      <div className="sheet-head">
        <span className="sheet-label">Background</span>
        <div>
        {n.bg && <button className="sheet-clear" onClick={() => update({ bg: null })}>Remove</button>}
        <button className="sheet-clear" onClick={() => setSheet(false)}>Done</button>
        </div>
      </div>
      <div className="wall-grid">{WALLPAPERS.map(w =>
        <button key={w.key} className={'wall' + (n.bg === w.key ? ' sel' : '')}
          style={{ backgroundImage: `url(${w.src})` }} onClick={() => update({ bg: w.key })}
          aria-label={w.label}>{n.bg === w.key ? '✓' : ''}</button>)}</div>
      </div>
    </div>}
  </div>;
}

type LockFlow =
  | { kind: 'setup-choose' }
  | { kind: 'setup-enter'; mode: 'pin' | 'pattern' | 'emoji' }
  | { kind: 'setup-confirm'; mode: 'pin' | 'pattern' | 'emoji'; first: string }
  | { kind: 'unlock'; note: Note };

function LockModal({ flow, onFlow, onClose, onUnlock, cfg, setCfg }: {
  flow: LockFlow; onFlow: (f: LockFlow | null) => void; onClose: () => void;
  onUnlock: (id: string) => void; cfg: LockCfg | null; setCfg: (c: LockCfg) => void;
}) {
  const [fails, setFails] = useState(0);
  const tryCode = async (code: string) => {
    if (flow.kind === 'unlock') {
      if (!cfg) return;
      if (await hashCode(code, cfg.salt) === cfg.hash) { onUnlock(flow.note.id); onClose(); }
      else setFails(x => x + 1);
    } else if (flow.kind === 'setup-enter') {
      setFails(0); onFlow({ kind: 'setup-confirm', mode: flow.mode, first: code });
    } else if (flow.kind === 'setup-confirm') {
      if (code === flow.first) {
        const salt = uid();
        setCfg({ mode: flow.mode, salt, hash: await hashCode(code, salt) });
        onClose();
      } else { setFails(x => x + 1); onFlow({ kind: 'setup-enter', mode: flow.mode }); }
    }
  };
  const mode = flow.kind === 'unlock' ? cfg?.mode ?? 'pin'
    : flow.kind === 'setup-choose' ? 'pin' : flow.mode;
  const fail = fails > 0 && flow.kind === 'unlock' ? failMsg(fails) : null;
  const err = fails > 0 ? (fail ? fail.msg : 'Those didn\u2019t match - try once more.') : null;
  const failBg = fail ? (WALLPAPERS.find(w => w.key === fail.bg)?.src ?? null) : null;
  const title = flow.kind === 'unlock' ? 'Enter your code'
    : flow.kind === 'setup-confirm' ? 'Once more' : 'Create your code';
  return <div className={'modal' + (failBg ? ' has-bg' : '')} onClick={onClose}
    style={failBg ? { backgroundImage: 'linear-gradient(rgba(8,8,10,.35), rgba(8,8,10,.62)), url(' + failBg + ')' } : undefined}>
    <div className="modal-card" key={fails} onClick={e => e.stopPropagation()}>
      {flow.kind === 'setup-choose' ? <div className="lock-box">
        <div className="lock-title">Lock your private notes 🤫</div>
        <div className="lock-sub">Choose how you want to open them. Your code stays only on this phone - if you forget it, locked notes can't be recovered.</div>
        <button className="lock-choice" onClick={() => onFlow({ kind: 'setup-enter', mode: 'pin' })}><span className="lock-choice-e">🔢</span> PIN</button>
        <button className="lock-choice" onClick={() => onFlow({ kind: 'setup-enter', mode: 'pattern' })}><span className="lock-choice-e">✍️</span> Pattern</button>
        <button className="lock-choice" onClick={() => onFlow({ kind: 'setup-enter', mode: 'emoji' })}><span className="lock-choice-e">😌</span> Emoji code</button>
      </div> : mode === 'pin'
        ? <PinPad title={title} error={err} onDone={tryCode} />
        : mode === 'pattern'
        ? <PatternPad title={title} error={err} onDone={tryCode} />
        : <EmojiPad title={title} error={err} onDone={tryCode} />}
    </div>
  </div>;
}

export function App() {
  const [profiles, setProfiles] = useLocalState<Profiles>('profiles.v1', {});
  const [session, setSession] = useLocalState<string | null>('session.v1', null);
  const user = session || '';
  const [notes, setNotes, saved] = useLocalState<Note[]>('notes.v2.' + user, []);
  const [lockCfg, setLockCfg] = useLocalState<LockCfg | null>('lock.v2.' + user, null);
  const [menu, setMenu] = useState(false);
  const [fullWeb, setFullWeb] = useState(false);
  const [installEvt, setInstallEvt] = useState<any>(null);
  useEffect(() => { mediaSupported().then(setFullWeb); }, []);
  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [grid, setGrid] = useState(true);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [flow, setFlow] = useState<LockFlow | null>(null);
  const pendingLock = useRef(false);

  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#131316'; document.head.appendChild(m);
    const a = document.createElement('meta'); a.name = 'apple-mobile-web-app-capable'; a.content = 'yes'; document.head.appendChild(a);
    const mf = { name: "Hiral's Notes", short_name: 'Notes', display: 'standalone', background_color: '#131316', theme_color: '#131316', start_url: '.', icons: [] };
    const l = document.createElement('link'); l.rel = 'manifest';
    l.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(mf));
    document.head.appendChild(l);
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let ns = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (q) ns = ns.filter(n => (n.locked && !unlocked.has(n.id)) ? false :
      (n.title + ' ' + n.body + ' ' + n.items.map(i => i.text).join(' ')).toLowerCase().includes(q));
    return [...ns.filter(n => n.pinned), ...ns.filter(n => !n.pinned)];
  }, [notes, search, unlocked]);

  const openNote_ = notes.find(n => n.id === openId) ?? null;
  const create = (type: 'text' | 'list') => { const n = newNote(type); setNotes([n, ...notes]); setOpenId(n.id); };
  const change = (n: Note) => setNotes(notes.map(x => x.id === n.id ? n : x));
  const del = (n: Note) => {
    (n.attachments ?? []).forEach(a => mediaStore.del(a.id).catch(() => {}));
    setNotes(notes.filter(x => x.id !== n.id)); setOpenId(null);
  };
  const closeEditor = () => {
    if (openNote_ && !hasContent(openNote_)) setNotes(notes.filter(x => x.id !== openNote_.id));
    setOpenId(null);
  };
  const startLock = (n: Note) => {
    if (n.locked) { change({ ...n, locked: false }); return; }
    if (!lockCfg) { pendingLock.current = true; setFlow({ kind: 'setup-choose' }); }
    else change({ ...n, locked: true });
  };
  useEffect(() => {
    if (!flow && lockCfg && openNote_ && !openNote_.locked && pendingLock.current) {
      pendingLock.current = false;
      change({ ...openNote_, locked: true });
    }
  }, [flow, lockCfg, openId]);
  const openNote = (n: Note) => {
    if (n.locked && !unlocked.has(n.id)) {
      if (!lockCfg) return;
      setFlow({ kind: 'unlock', note: n });
    } else setOpenId(n.id);
  };

  if (!session) return <FileCard><div className="app">
    <AuthScreen profiles={profiles} onLogin={u => { setSession(u); }} onSave={p => setProfiles(p)} />
  </div></FileCard>;

  return <FileCard>
    <div className="app">
      {openNote_ ? <Editor note={openNote_} onClose={closeEditor} onChange={change} onDelete={del} onToggleLock={startLock} mediaOk={fullWeb} />
      : <>
        <div className="topbar">
          <div className="search"><IcSearch />
            <input placeholder="Search your notes" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="ic-btn" onClick={() => setGrid(g => !g)} aria-label="Toggle view">{grid ? <IcRows /> : <IcGrid />}</button>
          <button className="avatar" onClick={() => setMenu(m => !m)} aria-label="Account">{user.slice(0, 1).toUpperCase()}</button>
        </div>
        {menu && <div className="menu" onClick={() => setMenu(false)}>
          <div className="menu-in" onClick={e => e.stopPropagation()}>
            <div className="menu-user">@{user}</div>
            {fullWeb && installEvt && <button className="menu-item" style={{ color: 'var(--acc)' }} onClick={async () => { setMenu(false); try { await installEvt.prompt(); } catch {} setInstallEvt(null); }}>⬇️ Install app</button>}
            {fullWeb && !installEvt && isIOS && <button className="menu-item" style={{ color: 'var(--acc)' }} onClick={() => { setMenu(false); alert('In Safari: tap the Share button, then "Add to Home Screen".'); }}>⬇️ Add to Home Screen</button>}
            <button className="menu-item" onClick={() => { setMenu(false); setUnlocked(new Set()); setOpenId(null); setSession(null); }}>Log out / switch account</button>
          </div>
        </div>}
        <div className="create-row">
          <button className="create-btn" onClick={() => create('text')}><IcPlus /> New note</button>
          <button className="create-btn is-soft" onClick={() => create('list')}><IcList /> New list</button>
        </div>
        {visible.length === 0 ? <div className="empty">
            <div className="empty-ic">✨</div>
            <div className="empty-t">{search ? 'Nothing matches' : 'Your notes live here'}</div>
            <div className="empty-s">{search ? 'Try a different search.' : 'Tap New note to write your first one. Pretty backgrounds and a secret lock included.'}</div>
          </div>
        : <div className={grid ? 'masonry' : 'listview'}>
            {visible.map(n => <NoteCard key={n.id} n={n} unlocked={unlocked.has(n.id)} onOpen={() => openNote(n)} />)}
          </div>}
      </>}
      {flow && <LockModal flow={flow} onFlow={setFlow} onClose={() => setFlow(null)}
        onUnlock={id => { setUnlocked(s => new Set(s).add(id)); setOpenId(id); }}
        cfg={lockCfg} setCfg={c => setLockCfg(c)} />}
    </div>
  </FileCard>;
}
