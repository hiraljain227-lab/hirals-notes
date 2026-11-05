// Standalone stand-in for @instinct/files: localStorage-backed state + plain wrappers.
import React, { useCallback, useRef, useState } from 'react';

export function FileCard({ children }: { children: React.ReactNode }) {
  return <main className="file-card">{children}</main>;
}
export function FileRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function read<T>(key: string, init: T): T {
  try {
    const raw = localStorage.getItem('hn.' + key);
    return raw == null ? init : JSON.parse(raw) as T;
  } catch { return init; }
}

export function useLocalState<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(() => read(key, init));
  const ref = useRef(value); ref.current = value;
  const set = useCallback((v: T | ((p: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem('hn.' + key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, set, true];
}
