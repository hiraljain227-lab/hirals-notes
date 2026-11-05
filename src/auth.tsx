import React, { useState } from 'react';

export type Profile = { p: string; q: string; a: string };
export type Profiles = Record<string, Profile>;

const QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What is your mother\u2019s maiden name?',
  'What was your childhood nickname?',
  'What is your favorite food?',
];

async function sha(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }
}
const salt = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const hashNew = async (secret: string) => { const s = salt(); return s + ':' + await sha(s + '|' + secret); };
export const hashCheck = async (stored: string, secret: string) => {
  const s = stored.split(':')[0];
  return (await sha(s + '|' + secret)) === stored.split(':')[1];
};
const norm = (s: string) => s.trim().toLowerCase();

export function AuthScreen({ profiles, onLogin, onSave }: {
  profiles: Profiles;
  onLogin: (u: string) => void;
  onSave: (p: Profiles) => void;
}) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [u, setU] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [q, setQ] = useState(QUESTIONS[0]); const [ans, setAns] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const uname = norm(u);

  const go = async () => {
    setErr('');
    if (!/^[a-z0-9_.]{3,20}$/.test(uname)) return setErr('Username: 3-20 letters, numbers, dots or underscores.');
    if (mode === 'login') {
      const p = profiles[uname];
      if (!p) return setErr('No account with that username on this device.');
      setBusy(true);
      const ok = await hashCheck(p.p, pw);
      setBusy(false);
      if (!ok) return setErr('Wrong password. Try again, or use Forgot password.');
      onLogin(uname);
    } else if (mode === 'signup') {
      if (profiles[uname]) return setErr('That username is taken on this device.');
      if (pw.length < 4) return setErr('Password needs at least 4 characters.');
      if (pw !== pw2) return setErr('Passwords don\u2019t match.');
      if (!norm(ans)) return setErr('Add an answer to your security question - it\u2019s how you reset a forgotten password.');
      setBusy(true);
      const p = await hashNew(pw); const a = await hashNew(norm(ans));
      setBusy(false);
      onSave({ ...profiles, [uname]: { p, q, a } });
      onLogin(uname);
    } else {
      const p = profiles[uname];
      if (!p) return setErr('No account with that username on this device.');
      if (!norm(ans)) return setErr('Answer your security question.');
      if (pw.length < 4) return setErr('New password needs at least 4 characters.');
      if (pw !== pw2) return setErr('Passwords don\u2019t match.');
      setBusy(true);
      const ok = await hashCheck(p.a, norm(ans));
      if (!ok) { setBusy(false); return setErr('That answer doesn\u2019t match.'); }
      const np = await hashNew(pw);
      setBusy(false);
      onSave({ ...profiles, [uname]: { ...p, p: np } });
      onLogin(uname);
    }
  };

  return <div className="auth">
    <div className="auth-brand">🌙</div>
    <div className="auth-title">Hiral's Notes</div>
    <div className="auth-sub">{mode === 'signup' ? 'Make your account - it stays on this phone.' : mode === 'forgot' ? 'Reset with your security question.' : 'Welcome back.'}</div>
    {mode !== 'forgot' && <div className="auth-tabs">
      <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>Log in</button>
      <button className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setErr(''); }}>Sign up</button>
    </div>}
    <div className="auth-card">
      <label>Username</label>
      <input value={u} onChange={e => setU(e.target.value)} placeholder="e.g. hiral" autoCapitalize="none" autoCorrect="off" />
      {mode === 'forgot' && profiles[uname] && <>
        <label>Security question</label>
        <div className="auth-q">{profiles[uname].q}</div>
      </>}
      {mode === 'signup' && <>
        <label>Security question</label>
        <select value={q} onChange={e => setQ(e.target.value)}>{QUESTIONS.map(x => <option key={x} value={x}>{x}</option>)}</select>
      </>}
      {(mode === 'signup' || mode === 'forgot') && <>
        <label>Your answer</label>
        <input value={ans} onChange={e => setAns(e.target.value)} placeholder="Your answer" autoCapitalize="none" autoCorrect="off" />
      </>}
      <label>{mode === 'forgot' ? 'New password' : 'Password'}</label>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••" />
      {mode !== 'login' && <>
        <label>Confirm password</label>
        <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••" />
      </>}
      {err && <div className="auth-err">{err}</div>}
      <button className="auth-go" disabled={busy} onClick={go}>{busy ? 'One sec…' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Reset password'}</button>
      {mode === 'login' && <button className="auth-link" onClick={() => { setMode('forgot'); setErr(''); }}>Forgot password?</button>}
      {mode === 'forgot' && <button className="auth-link" onClick={() => { setMode('login'); setErr(''); }}>Back to log in</button>}
    </div>
  </div>;
}
