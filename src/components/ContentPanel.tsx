"use client";

import { useDirtyGuard } from "@/lib/dirty-guard";
import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE_URL, hasAtLeast, type Role } from '@/lib/auth';
import { assetUrl, categoryLabels, contentKindLabels, modelField, changes, contentApi, replaceAt, type ContentDetail, type ContentPage, type ContentRow, type Revision, type Value } from '@/lib/content';
import ContentFields from './ContentFields';
import MediaPanel from './MediaPanel';
import './content.css';
import { fieldPath, matchesField } from '@/lib/content-fields';
import type { Jump } from './AdminShell';

function previewPath(detail: ContentDetail) {
  const value = detail.draft.value;
  if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.slug === 'string' && detail.category === 'models') return `/giai-phau/mo-hinh/${encodeURIComponent(value.slug)}`;
  if (detail.category === 'quizzes') return '/quiz';
  if (detail.source.includes('/vet/')) return '/dong-vat';
  return '/';
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Thao tác thất bại. Hãy thử lại.';
const date = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa xuất bản';

export default function ContentPanel({ role, jump, onJumpDone }: { role: Role; jump?: Jump | null; onJumpDone?: () => void }) {
  const [category, setCategory] = useState('models');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('scenes');
  const [scope, setScope] = useState('title');
  const [page, setPage] = useState(1);
  const [listing, setListing] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ContentDetail | null>(null);
  const [showList, setShowList] = useState(false);
  const [draft, setDraft] = useState<Record<string, Value>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<(Pick<ContentRow, 'id' | 'title'> & { navigate?: boolean }) | null>(null);
  const [filter, setFilter] = useState('');
  const [mode, setMode] = useState<'model' | 'edit' | 'changes' | 'history'>('edit');
  const [history, setHistory] = useState<Revision[]>([]);
  const [models, setModels] = useState<{ url: string; meshNames: string[] }[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [uploads, setUploads] = useState(0);
  const [previewTarget, setPreviewTarget] = useState('/');
  const [previewUrl, setPreviewUrl] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [inspectedRevision, setInspectedRevision] = useState<{ title: string; payload: Record<string, Value> } | null>(null);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const openRequest = useRef(0);
  const editorScroll = useRef<HTMLDivElement>(null);
  const resultsScroll = useRef<HTMLDivElement>(null);
  const dirty = !!selected && JSON.stringify(draft) !== JSON.stringify(selected.draft);
  useDirtyGuard(dirty,!!uploads || !!busy);
  const difference = selected ? changes(selected.published, draft) : [];
  const model = modelField(draft);
  const sourceModel = selected ? modelField(selected.payload) : null;

  useEffect(() => {
    if (category === 'assets') return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const result = await contentApi.list(category, q, page, controller.signal, category === 'models' ? kind : '', scope);
        if (!controller.signal.aborted) { setListing(result); if (resultsScroll.current) resultsScroll.current.scrollTop = 0; }
      }
      catch (error) { if (!controller.signal.aborted) setError(message(error)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [category, q, page, refresh, kind, scope]);
  useEffect(() => { if (editorScroll.current) editorScroll.current.scrollTop = 0; }, [selected?.id, mode]);
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => { if (dirty || uploads) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, uploads]);

  const open = useCallback(async (row: Pick<ContentRow, 'id'> & { navigate?: boolean }) => {
    const request = ++openRequest.current;
    setBusy('open'); setError(''); setNotice('');
    try {
      const detail = await contentApi.detail(row.id);
      if (request !== openRequest.current) return;
      if (row.navigate) { setCategory(detail.category); setQ(''); setPage(1); setKind(detail.kind === 'atlas-label' ? 'atlas-label' : 'scenes'); setScope('title'); setListing(null); setLoading(true); }
      setShowList(false);
      const params=new URLSearchParams(window.location.search);params.set('tab','content');params.set('contentId',detail.id);params.delete('category');window.history.replaceState(null,'','?'+params.toString());
      setSelected(detail); setDraft(structuredClone(detail.draft)); setFilter(''); setMode(modelField(detail.draft) ? 'model' : 'edit'); setHistory([]); setHistoryPage(1); setInspectedRevision(null); setPreviewTarget(previewPath(detail)); setModels([]); setPreviewUrl('');
      if (detail.category === 'models') {
        try { const library = await contentApi.models(); if (request === openRequest.current) setModels(library); }
        catch { if (request === openRequest.current) setNotice('Không tải được danh sách mesh. Bạn vẫn có thể sửa nội dung và tải tệp GLB.'); }
      }
    } catch (error) { if (request === openRequest.current) setError(message(error)); }
    finally { if (request === openRequest.current) setBusy(''); }
  }, []);

  useEffect(() => {
    if(jump?.tab==='content' && 'category' in jump && !busy && !uploads) {
      queueMicrotask(()=>{setCategory(jump.category);setSelected(null);setQ('');setPage(1);onJumpDone?.();}); return;
    }
    if (jump?.tab !== 'content' || !('contentId' in jump) || busy || uploads) return;
    async function run() {
      await Promise.resolve();
      if (!jump || !('contentId' in jump)) return;
      onJumpDone?.();
      if (selected?.id === jump.contentId) { setShowList(false); setCategory(selected.category); }
      else if (dirty) setPending({ id: jump.contentId, title: jump.contentTitle, navigate: true });
      else await open({ id: jump.contentId, navigate: true });
    }
    void run();
  }, [jump, busy, uploads, dirty, selected, open, onJumpDone]);

  async function perform(action: 'save' | 'publish' | 'preview' | 'restore', revisionId?: string) {
    if (!selected || busy || uploads) return;
    setBusy(action); setError(''); setNotice('');
    try {
      if (action === 'preview') {
        if (!/^\/(?!\/)/.test(previewTarget) || previewTarget.includes('\\')) throw new Error('Đường dẫn xem trước phải nằm trong FE và bắt đầu bằng /.');
        const preview = await contentApi.preview(selected.id, selected.version);
        const url = `${SITE_URL}/api/content-preview?${new URLSearchParams({ token: preview.token, path: previewTarget })}`;
        setNotice('Bản xem trước đã sẵn sàng, có hiệu lực 15 phút.');
        setPreviewUrl(url);
      } else {
        if (action === 'save') await contentApi.save(selected.id, selected.version, draft);
        if (action === 'publish') await contentApi.publish(selected.id, selected.version);
        if (action === 'restore' && revisionId) await contentApi.restore(selected.id, selected.version, revisionId);
        const fresh = await contentApi.detail(selected.id);
        setSelected(fresh); setDraft(structuredClone(fresh.draft)); setRefresh((value) => value + 1);
        setNotice(action === 'publish' ? 'Đã xuất bản. Tải lại FE để đọc nội dung mới.' : action === 'restore' ? 'Đã khôi phục vào bản nháp. Kiểm tra trước khi xuất bản.' : 'Đã lưu bản nháp.');
        setPreviewUrl('');
        if (mode === 'history') setHistory(await contentApi.history(selected.id, historyPage));
      }
    } catch (error) { setError(message(error)); }
    finally { setBusy(''); }
  }
  function choose(row: Pick<ContentRow, 'id' | 'title'>) { if (uploads) { setError('Chờ tải tệp xong trước khi chuyển tài liệu.'); return; } if (dirty) setPending(row); else { setPreviewUrl(''); void open(row); } }
  function resetListing() { setPage(1); setListing(null); setLoading(true); }
  function fields(value: Value, template: Value | undefined, path: string[] = [], search = '') {
    return <fieldset disabled={!!busy || !!uploads} className="cms-form"><ContentFields value={value} template={template} path={path} onChange={(path, value) => { setPreviewUrl(''); setDraft((current) => replaceAt(current, path, value) as Record<string, Value>); }} filter={search} models={models} onUploadState={(delta) => setUploads((count) => Math.max(0, count + delta))} onUploaded={(asset) => { if (asset.mime === 'model/gltf-binary') setModels((items) => [{ url: assetUrl(asset), meshNames: asset.meshNames }, ...items]); }} /></fieldset>;
  }

  return <div className="cms-workspace">
    <nav className="cms-categories" aria-label="Loại nội dung">
      {[['', 'Tất cả nội dung'], ...Object.entries(categoryLabels), ['assets', 'Thư viện tệp']].map(([key, label]) => <button type="button" key={key} disabled={!!uploads || !!busy} className={category === key ? 'is-active' : ''} onClick={() => { if (dirty) { setError('Hãy lưu hoặc dùng nút Bỏ thay đổi trước khi chuyển khu nội dung.'); return; } const params=new URLSearchParams({tab:'content',category:key});window.history.replaceState(null,'','?'+params.toString());setCategory(key); setSelected(null); setQ(''); resetListing(); }}>{label}</button>)}
    </nav>
    {error && <div className="cms-error" role="alert">{error}<button className="bo-btn" onClick={() => setRefresh((value) => value + 1)}>Tải lại danh sách</button>{selected && <button className="bo-btn" disabled={!!busy || !!uploads} onClick={() => choose(selected)}>Tải lại tài liệu</button>}</div>}
    {notice && <p className="cms-notice" role="status">{notice}{previewUrl && <> <a href={previewUrl} target="_blank" rel="noreferrer">Mở bản xem trước ↗</a></>}</p>}
    {pending && <div className="cms-unsaved" role="alert">{pending.id === selected?.id ? 'Bỏ các thay đổi chưa lưu và tải lại bản đã lưu?' : `Bạn có thay đổi chưa lưu. Chuyển sang “${pending.title}”?`} <button className="bo-btn" disabled={!!busy || !!uploads} onClick={() => { const target = pending; setPending(null); void open(target); }}>Bỏ thay đổi & {pending.id === selected?.id ? 'tải lại' : 'chuyển'}</button><button className="bo-btn" onClick={() => { setPending(null); setShowList(false); }}>Tiếp tục sửa</button></div>}
    {category === 'assets' ? <MediaPanel onUploadState={(delta) => setUploads((count) => Math.max(0, count + delta))} /> : <div className={`cms-columns ${selected && !showList ? 'cms-has-selection' : ''} ${showList ? 'cms-show-list' : ''}`}>
      <aside className="cms-browser" aria-label="Danh mục nội dung">
        <div className="cms-browser-head"><label htmlFor="cms-query">Tìm nội dung website</label><div className="cms-query-wrap"><input id="cms-query" type="search" value={q} placeholder="Ví dụ: tim, giai phau tim…" onChange={(event) => { setQ(event.target.value); resetListing(); }} />{q && <button className="bo-btn small" onClick={() => { setQ(''); resetListing(); }} aria-label="Xóa từ khóa">×</button>}</div>
          <label className="cms-search-option">Phạm vi tìm kiếm<select value={scope} onChange={(event) => { setScope(event.target.value); resetListing(); }}><option value="title">Tên & mã liên kết</option><option value="all">Toàn bộ nội dung</option></select></label>
          {category === 'models' && <label className="cms-search-option">Loại nội dung<select value={kind} onChange={(event) => { setKind(event.target.value); resetListing(); }}><option value="scenes">Mô hình & cảnh</option><option value="glb">Mô hình GLB</option><option value="atlas-scene">Cảnh atlas</option><option value="atlas-label">Tên cấu trúc atlas</option><option value="collection">Bộ mô hình</option><option value="">Tất cả loại</option></select></label>}
          <span role="status">{loading ? 'Đang tìm…' : `${listing?.total.toLocaleString('vi-VN') ?? '—'} kết quả`}</span><small className="bo-muted">Có thể tìm không dấu. Kết quả khớp tên được ưu tiên.</small>
        </div>
        <div ref={resultsScroll} className="cms-results" aria-busy={loading}>
          {listing?.items.map((row) => <button type="button" key={row.id} disabled={!!busy} className={`cms-result ${selected?.id === row.id ? 'is-active' : ''}`} onClick={() => { if (showList && row.id === selected?.id) setShowList(false); else choose(row); }}>
            <span>{contentKindLabels[row.kind ?? ''] ?? categoryLabels[row.category]}</span><b>{row.title}</b>{row.identifier && <small>{row.identifier}</small>}{listing.items.some((other) => other.id !== row.id && other.title === row.title && other.kind === row.kind && other.identifier === row.identifier) && <small>Nguồn: {row.source.split('/').at(-1)} · {row.id.split('#').at(-1)?.split('/')[0]}</small>}<small>{row.pending ? 'Có bản nháp' : row.publishedAt ? 'Đã xuất bản' : 'Dữ liệu gốc'}</small>
          </button>)}
          {listing && listing.items.length === 0 && <p className="cms-empty">Không có kết quả trong bộ lọc này. Thử từ khóa ngắn hơn, chọn “Tất cả loại” hoặc tìm trong “Toàn bộ nội dung”.</p>}
        </div>
        <div className="cms-pagination"><button className="bo-btn" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Trước</button><span>{page} / {Math.max(1, Math.ceil((listing?.total ?? 0) / 30))}</span><button className="bo-btn" disabled={loading || page * 30 >= (listing?.total ?? 0)} onClick={() => setPage((value) => value + 1)}>Sau</button></div>
      </aside>
      <section className="cms-editor" aria-label="Biên tập nội dung" aria-busy={!!busy}>
        {!selected ? <div className="cms-welcome"><span>SOMA / CONTENT STUDIO</span><h2>Sửa mô hình 3D và nội dung website.</h2><p>Tìm theo tên ở bên trái, chọn đúng loại mô hình, rồi mở tab “Mô hình 3D · Tải GLB” để thay tệp. Tab “Thông tin & chú giải” dùng để sửa tên, mô tả và các cấu trúc liên kết.</p><ol><li>Biên tập và lưu bản nháp</li><li>Xem trước trên website</li><li>Xuất bản khi đã kiểm tra</li></ol><p className="bo-muted">Chọn các mục phía trên để sửa giao diện, phần giải thích hoặc ngân hàng câu hỏi. Mã liên kết cố định được giữ để bảo toàn địa chỉ và tiến độ học.</p></div> : <>
          <button className="bo-btn cms-back-to-list" disabled={!!busy || !!uploads} onClick={() => setShowList(true)}>← Danh mục nội dung</button><header className="cms-editor-head"><div><span>{contentKindLabels[selected.kind ?? ''] ?? categoryLabels[selected.category]}</span><h2>{selected.title}</h2>{selected.redirectedFrom && <p className="cms-notice">Đã mở bản đang hiển thị trên website. Bản GLB cùng tên là dữ liệu cũ.</p>}{selected.identifier && <p>{selected.identifier}</p>}<p>Phiên bản {selected.version} · {date(selected.publishedAt)}{dirty ? ' · Chưa lưu' : ''}</p></div><div className="cms-editor-actions">
            <button className="bo-btn" disabled={!!busy || !!uploads || !dirty} onClick={() => void perform('save')}>{busy === 'save' ? 'Đang lưu…' : uploads ? 'Đang tải tệp…' : 'Lưu bản nháp'}</button>
            {dirty && <button className="bo-btn" disabled={!!busy || !!uploads} onClick={() => setPending(selected)}>Bỏ thay đổi</button>}
            <button className="bo-btn" disabled={!!busy || !!uploads || dirty} onClick={() => void perform('preview')}>Xem trước ↗</button>
            <button className="bo-btn cms-primary" title={!hasAtLeast(role, 'admin') ? 'Cần quyền admin để xuất bản' : dirty ? 'Lưu bản nháp trước' : ''} disabled={!!busy || !!uploads || dirty || !hasAtLeast(role, 'admin') || difference.length === 0} onClick={() => publishDialog.current?.showModal()}>Xuất bản</button>
          </div></header>
          <nav className="cms-editor-tabs" aria-label="Chế độ biên tập">
            {model && <button className={mode === 'model' ? 'is-active' : ''} onClick={() => setMode('model')}>Mô hình 3D · Tải GLB</button>}
            <button className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}>{model ? 'Thông tin & chú giải' : 'Biên tập'}</button>
            <button className={mode === 'changes' ? 'is-active' : ''} onClick={() => setMode('changes')}>Thay đổi <span>{difference.length}</span></button>
            <button className={mode === 'history' ? 'is-active' : ''} onClick={async () => { setMode('history'); setInspectedRevision(null); try { setHistory(await contentApi.history(selected.id, historyPage)); } catch (error) { setError(message(error)); } }}>Lịch sử</button>
          </nav>
          <div ref={editorScroll} className="cms-editor-scroll" data-lenis-prevent>
            {mode === 'model' && model && <section className="cms-model-tools"><h3>Tệp mô hình 3D</h3><p>{model.templateKey === 'replacement' ? 'Tải GLB riêng tại đây để thay mô hình của cảnh. Để trống đường dẫn tệp nếu muốn dùng các mảnh atlas gốc.' : 'Thay tệp GLB tại đây, sau đó kiểm tra mô hình và các mesh liên kết trong phần Thông tin & chú giải.'}</p><p>Lưu bản nháp → Xem trước → Xuất bản để áp dụng lên website.</p>{fields(model.value, sourceModel?.value, model.path)}</section>}
            {mode === 'edit' && <>{selected.kind === 'atlas-label' && <p className="cms-notice">Đây là tên một cấu trúc trong atlas. Để thay tệp GLB, chọn loại “Mô hình GLB” hoặc “Cảnh atlas” trong bộ lọc bên trái.</p>}<label className="cms-field-filter">Lọc trường nội dung<input value={filter} placeholder="Ví dụ: tiếng Việt, mô tả, GLB, modelFile…" onChange={(event) => setFilter(event.target.value)} /></label>{matchesField(draft, 'value', filter) ? fields(draft, selected.payload, [], filter) : <p className="cms-empty" role="status">Không có trường khớp “{filter}”. <button className="bo-btn" onClick={() => setFilter('')}>Xóa bộ lọc trường</button></p>}</>}
            <details className="cms-preview-settings"><summary>Đường dẫn xem trước website</summary><label className="cms-preview-target">Trang website để xem trước<input value={previewTarget} onChange={(event) => { setPreviewTarget(event.target.value); setPreviewUrl(''); }} placeholder="/giai-phau/mo-hinh/tim" /><small>Đường dẫn được điền theo nội dung đang chọn. Có thể thêm /en hoặc /zh để xem bản dịch.</small></label></details>
            {mode === 'changes' && <div className="cms-diff">{difference.length === 0 ? <p className="cms-empty">Không có thay đổi so với bản đang hiển thị trên FE.</p> : difference.map((change) => <article key={change.path}><b title={change.path}>{fieldPath(change.path)}</b><div><section><span>Đang hiển thị</span><pre>{typeof change.before === 'string' ? change.before : JSON.stringify(change.before, null, 2)}</pre></section><section><span>Bản đang sửa</span><pre>{typeof change.after === 'string' ? change.after : JSON.stringify(change.after, null, 2)}</pre></section></div></article>)}</div>}
            {mode === 'history' && <div className="cms-history">{history.length === 0 ? <p className="cms-empty">Không có phiên bản ở trang này.</p> : history.map((revision) => <article key={revision.id}><div><b>Phiên bản {revision.version}</b><span>{revision.action === 'publish' ? 'Xuất bản' : revision.action === 'source' ? 'Dữ liệu gốc' : revision.action === 'restore' ? 'Khôi phục' : 'Bản nháp'}</span><p>{revision.actorEmail} · {date(revision.createdAt)}</p></div><div className="cms-row-actions"><button className="bo-btn" onClick={async () => { try { const item = await contentApi.revision(selected.id, revision.id); setInspectedRevision({ title: `Phiên bản ${revision.version}`, payload: item.payload }); } catch (error) { setError(message(error)); } }}>Xem nội dung</button><button className="bo-btn" disabled={!!busy || !!uploads || dirty || revision.version === selected.version} onClick={() => void perform('restore', revision.id)}>Khôi phục vào bản nháp</button></div></article>)}<div className="cms-pagination"><button className="bo-btn" disabled={historyPage <= 1} onClick={async () => { try { const next = historyPage - 1; setHistory(await contentApi.history(selected.id, next)); setHistoryPage(next); setInspectedRevision(null); } catch (error) { setError(message(error)); } }}>Mới hơn</button><span>Trang {historyPage}</span><button className="bo-btn" disabled={history.length < 40} onClick={async () => { try { const next = historyPage + 1; setHistory(await contentApi.history(selected.id, next)); setHistoryPage(next); setInspectedRevision(null); } catch (error) { setError(message(error)); } }}>Cũ hơn</button></div>{inspectedRevision && <details className="cms-revision" open><summary>{inspectedRevision.title}</summary><fieldset disabled className="cms-form"><ContentFields value={inspectedRevision.payload} template={selected.payload} onChange={() => undefined} /></fieldset></details>}</div>}
            <details className="cms-source"><summary>Thông tin liên kết</summary><code>{selected.source}</code><p>{selected.id}</p></details>
          </div>
        </>}
      </section>
    </div>}
    <dialog ref={publishDialog} className="cms-dialog"><h2>Xuất bản nội dung?</h2><p>“{selected?.title}” sẽ thay đổi trên FE khi người học tải lại trang. Lịch sử vẫn giữ các phiên bản trước.</p><div><button className="bo-btn" onClick={() => publishDialog.current?.close()}>Kiểm tra lại</button><button className="bo-btn cms-primary" onClick={() => { publishDialog.current?.close(); void perform('publish'); }}>Xuất bản nội dung</button></div></dialog>
  </div>;
}
