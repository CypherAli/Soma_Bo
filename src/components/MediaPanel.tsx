"use client";

import { useEffect, useRef, useState } from 'react';
import { assetUrl, contentApi, type Asset, type AssetPage } from '@/lib/content';
import ModelPreview from './ModelPreview';

export default function MediaPanel({ onUploadState }: { onUploadState?: (delta: number) => void }) {
  const [listing, setListing] = useState<AssetPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Asset | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const result = await contentApi.assets(q, page, kind, controller.signal); if (!controller.signal.aborted) { setListing(result); setError(''); } }
      catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không tải được thư viện'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, page, kind, refresh]);

  return <section className="cms-media">
    <header><div><h2>Thư viện mô hình & hình ảnh</h2><p>Ảnh PNG, JPEG, WebP tối đa 10 MB. Mô hình GLB tối đa 100 MB.</p></div>
      <button type="button" className="bo-btn cms-primary" disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? 'Đang kiểm tra & tải lên…' : '+ Tải tệp lên'}</button><input ref={fileInput} aria-label="Chọn mô hình hoặc ảnh để tải lên" type="file" accept=".glb,.png,.jpg,.jpeg,.webp" disabled={busy} hidden onChange={async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        setBusy(true); onUploadState?.(1); setError('');
        try { const asset = await contentApi.upload(file); setPage(1); setQ(''); setKind(''); setRefresh((value) => value + 1); setSelected(asset); setNotice(`Đã tải ${asset.filename}`); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không tải được tệp'); }
        finally { setBusy(false); onUploadState?.(-1); event.target.value = ''; }
      }} />
    </header>
    <div className="cms-media-filters"><label>Tìm theo tên tệp<input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Tên ảnh hoặc mô hình…" /></label><label>Loại tệp<select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="image">Hình ảnh</option><option value="model">Mô hình 3D</option></select></label><span aria-live="polite">{loading ? 'Đang tải…' : `${listing?.total ?? 0} tệp`}</span></div>
    {error && <p className="cms-error" role="alert">{error}<button className="bo-btn" onClick={() => setRefresh((value) => value + 1)}>Thử lại</button></p>}
    {notice && <p className="cms-notice" role="status">{notice}</p>}
    {!loading && !listing?.items.length && <p className="cms-empty">Không có tệp phù hợp. Mô hình gốc vẫn được quản lý trong mục Mô hình & cảnh 3D.</p>}
    <div className="cms-media-grid" aria-busy={loading}>{listing?.items.map((asset) => <article key={asset.id}>
      <button className="cms-asset-preview" onClick={() => setSelected(asset)} aria-label={`Xem ${asset.filename}`}>{asset.mime.startsWith('image/') ? <span role="img" aria-label={asset.filename} style={{ backgroundImage: `url(${JSON.stringify(assetUrl(asset))})` }} /> : <span className="cms-glb-placeholder">3D<small>{asset.meshNames.length} mesh</small></span>}</button>
      <h3>{asset.filename}</h3><p>{(asset.bytes / 1024 / 1024).toFixed(2)} MB · {asset.mime.startsWith('image/') ? 'Hình ảnh' : 'GLB 2.0'}</p>
      <div className="cms-row-actions"><button className="bo-btn" onClick={() => setSelected(asset)}>Xem trước</button><button className="bo-btn" onClick={async () => { try { await navigator.clipboard.writeText(assetUrl(asset)); setNotice('Đã sao chép đường dẫn.'); } catch { setError(`Đường dẫn: ${assetUrl(asset)}`); } }}>Sao chép đường dẫn</button></div>
    </article>)}</div>
    <div className="cms-pagination"><button className="bo-btn" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trước</button><span>{page} / {Math.max(1, Math.ceil((listing?.total ?? 0) / 24))}</span><button className="bo-btn" disabled={loading || page * 24 >= (listing?.total ?? 0)} onClick={() => setPage((value) => value + 1)}>Sau</button></div>
    {selected && <section className="cms-asset-detail"><header><h3>{selected.filename}</h3><button className="bo-btn" onClick={() => setSelected(null)}>Đóng xem trước</button></header>{selected.mime.startsWith('image/') ? <a href={assetUrl(selected)} target="_blank" rel="noreferrer"><div className="cms-image-preview cms-image-large" role="img" aria-label={selected.filename} style={{ backgroundImage: `url(${JSON.stringify(assetUrl(selected))})` }} /></a> : <ModelPreview url={assetUrl(selected)} />}<a href={assetUrl(selected)} target="_blank" rel="noreferrer">Mở tệp gốc ↗</a>{selected.meshNames.length > 0 && <details><summary>{selected.meshNames.length} tên mesh</summary><pre>{selected.meshNames.join('\n')}</pre></details>}</section>}
  </section>;
}
