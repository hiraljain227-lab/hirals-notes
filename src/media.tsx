import React, { useEffect, useRef, useState } from 'react';
import { Attachment, mediaStore, uid } from './db';

const urlCache = new Map<string, string>();
export function useMediaUrl(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(id ? urlCache.get(id) ?? null : null);
  useEffect(() => {
    let live = true;
    if (id && !urlCache.has(id)) mediaStore.get(id).then(b => {
      if (b && live) { const u = URL.createObjectURL(b); urlCache.set(id, u); setUrl(u); }
    }).catch(() => {});
    return () => { live = false; };
  }, [id]);
  return id ? url : null;
}

export function AttachmentView({ a, onRemove }: { a: Attachment; onRemove?: (id: string) => void }) {
  const url = useMediaUrl(a.id);
  return <div className="att-wrap">
    {!url ? <div className="att att-loading" />
      : a.kind === 'image' ? <img className="att" src={url} alt={a.name ?? 'photo'} />
      : a.kind === 'video' ? <video className="att" src={url} controls playsInline preload="metadata" />
      : <div className="att-audio"><span className="att-audio-ic">🎙</span><audio src={url} controls preload="metadata" /></div>}
    {onRemove && <button className="att-x" onClick={() => onRemove(a.id)} aria-label="Remove">×</button>}
  </div>;
}

export async function filesToAttachments(files: FileList | null, kind: Attachment['kind']): Promise<Attachment[]> {
  if (!files) return [];
  const out: Attachment[] = [];
  for (const f of Array.from(files)) {
    const id = uid();
    await mediaStore.put(id, f);
    out.push({ id, kind, name: f.name });
  }
  return out;
}

export function useRecorder(onDone: (a: Attachment) => void) {
  const [rec, setRec] = useState<{ on: boolean; sec: number }>({ on: false, sec: 0 });
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<any>(null);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
        const id = uid();
        await mediaStore.put(id, blob);
        onDone({ id, kind: 'audio', name: 'Voice note' });
      };
      mr.start();
      recRef.current = mr;
      setRec({ on: true, sec: 0 });
      timer.current = setInterval(() => setRec(r => ({ ...r, sec: r.sec + 1 })), 1000);
    } catch {
      alert('Microphone is not available here. You can attach an audio file instead.');
    }
  };
  const stop = () => {
    clearInterval(timer.current);
    recRef.current?.stop();
    recRef.current = null;
    setRec({ on: false, sec: 0 });
  };
  return { rec, start, stop };
}
