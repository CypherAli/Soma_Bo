"use client";

import { useEffect, useRef, useState } from 'react';
import { SITE_URL } from '@/lib/auth';

export default function ModelPreview({ url, onPick }: { url: string; onPick?: (mesh: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [selected, setSelected] = useState('');
  useEffect(() => {
    const origin = new URL(SITE_URL).origin;
    const listener = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'soma:model-mesh' || typeof event.data.meshName !== 'string') return;
      setSelected(event.data.meshName);
      onPick?.(event.data.meshName);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onPick]);
  if (!url) return null;
  return <div className="cms-model-preview">
    <iframe ref={frame} title="Xem và chọn cấu trúc mô hình 3D" src={`${SITE_URL}/vi/bo-model-preview?${new URLSearchParams({ model: url })}`} loading="lazy" />
    <p>{selected ? `Mesh đã chọn: ${selected}` : onPick ? 'Xoay, phóng to và nhấp vào cấu trúc để điền tên mesh.' : 'Xoay hoặc phóng to để kiểm tra mô hình.'}</p>
  </div>;
}
