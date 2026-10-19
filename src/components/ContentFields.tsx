"use client";

import { useId, useRef, useState } from 'react';
import { API_URL, SITE_URL } from '@/lib/auth';
import { assetUrl, contentApi, type Asset, type Value } from '@/lib/content';
import { arrayItemTemplate, fieldLabel, newArrayItem, matchesField, normalizeFieldSearch } from '@/lib/content-fields';
import ModelPreview from './ModelPreview';

type Props = {
  value: Value; template?: Value; path?: (string | number)[];
  onChange: (path: (string | number)[], next: Value) => void;
  filter?: string; models?: { url: string; meshNames: string[] }[]; modelUrl?: string;
  onUploadState?: (delta: number) => void; onUploaded?: (asset: Asset) => void;
};
const snippet = (value: Value): string => typeof value === 'string' ? value : value && typeof value === 'object' && !Array.isArray(value) ? snippet(value.title ?? value.label ?? value.name ?? value.vi ?? value.key ?? value.id ?? '') : '';

export default function ContentFields(props: Props) {
  const { value, template, path = [], onChange, filter = '', models = [], modelUrl = '', onUploadState, onUploaded } = props;
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const key = String(path.at(-1) ?? 'value');
  const title = fieldLabel(key);
  const childFilter = filter && normalizeFieldSearch(`${key} ${title}`).includes(normalizeFieldSearch(filter.trim())) ? '' : filter;
  const child = (next: Value, nextPath: (string | number)[], original?: Value, currentModel = modelUrl) => <ContentFields {...props} filter={childFilter} value={next} template={original} path={nextPath} modelUrl={currentModel} />;
  if (!matchesField(value, key, filter)) return null;

  if (Array.isArray(value)) {
    const sample = arrayItemTemplate(key, template) ?? value[0];
    const tuple = ['offset', 'position', 'rotation', 'target'].includes(key) && value.every((item) => typeof item === 'number');
    const fixed = sample && typeof sample === 'object' && !Array.isArray(sample) && ('slug' in sample || 'code' in sample || ('id' in sample && key !== 'options'));
    const originals = Array.isArray(template) ? template : [];
    return <details className="cms-group" open={path.length <= 1 || !!filter}>
      <summary>{title}<span>{value.length} mục</span></summary>
      <div className={`cms-array ${tuple ? 'cms-coordinates' : ''}`}>
        {value.map((item, index) => {
          const identity = item && typeof item === 'object' && !Array.isArray(item) ? item.id ?? item.key : undefined;
          const original = identity ? originals.find((entry) => entry && typeof entry === 'object' && !Array.isArray(entry) && (entry.id ?? entry.key) === identity) : originals[index];
          return <details key={index} className="cms-item" open={!!filter || typeof item !== 'object'}>
            <summary><b>{index + 1}</b><span>{snippet(item) || `${title} ${index + 1}`}</span></summary>
            <div className="cms-item-body">
              {!tuple && <div className="cms-row-actions">
                <button type="button" className="bo-btn" disabled={index === 0} onClick={() => { const next = [...value]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(path, next); }}>Lên</button>
                <button type="button" className="bo-btn" disabled={index === value.length - 1} onClick={() => { const next = [...value]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(path, next); }}>Xuống</button>
                <button type="button" className="bo-btn" onClick={() => onChange(path, value.filter((_, i) => i !== index))}>Bỏ mục</button>
              </div>}
              {child(item, [...path, index], original)}
            </div>
          </details>;
        })}
        {!tuple && sample !== undefined && !fixed && <button className="bo-btn" type="button" onClick={() => onChange(path, [...value, newArrayItem(key, value.at(-1) ?? sample, crypto.randomUUID().slice(0, 12))])}>+ Thêm mục</button>}
        {!tuple && (sample === undefined || fixed) && <p className="bo-muted">Danh sách liên kết cố định. Có thể sửa nội dung của từng mục hiện có.</p>}
      </div>
    </details>;
  }

  if (value !== null && typeof value === 'object') {
    const currentModel = typeof value.modelFile === 'string' ? value.modelFile : modelUrl;
    const original = template && typeof template === 'object' && !Array.isArray(template) ? template : {};
    const contents = Object.entries(value).map(([name, item]) => <div key={name}>{child(item, [...path, name], original[name], currentModel)}</div>);
    if (path.length <= 1 && key === 'value') return <div>{contents}</div>;
    return <fieldset className="cms-group cms-object"><legend>{title}</legend>{contents}</fieldset>;
  }
  if (typeof value === 'boolean') return <label className="cms-check"><input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />{title}</label>;
  if (value === null) return <div className="cms-field"><label htmlFor={id}>{title}</label>{/^(?:explanation|description(?:Vi|En|Zh)?|note|sourceNote|latin|context|quote|pageOrSection)$/.test(key) ? <textarea id={id} rows={3} value="" placeholder="Bổ sung nội dung…" onChange={(event) => onChange(path, event.target.value)} /> : <span className="bo-muted">Chưa có giá trị trong dữ liệu nguồn</span>}</div>;

  const disabled = uploading || ['slug', 'id', 'code'].includes(key);
  const isModel = /^(?:modelFile|modelUrl)$/.test(key);
  const image = /^(?:img|image|thumbnail|poster|src)$/.test(key) || ['images', 'explanationImages'].includes(String(path.at(-2)));
  const choices = key === 'meshName' ? models.find((model) => model.url === modelUrl || `${API_URL.replace(/\/api$/, '')}${model.url}` === modelUrl)?.meshNames : undefined;
  const options = key === 'view' && typeof value === 'string' && ['front','back','left','right','top','bottom','iso'].includes(String(template)) ? ['front','back','left','right','top','bottom','iso'] : key === 'axis' && path.includes('clip') ? ['x','y','z'] : undefined;
  const displayTitle = /^t[a-z0-9]+_\d+$/.test(key) ? String(template ?? value).slice(0, 90) : title;
  const mediaUrl = typeof value === 'string' && value.startsWith('/') ? `${SITE_URL}${value}` : String(value);
  return <div className="cms-field">
    <label htmlFor={id}>{displayTitle}{disabled && <span className="cms-fixed"> · mã liên kết</span>}</label>
    {typeof value === 'number' ? <input id={id} type="number" step="any" value={value} min={key === 'percent' ? 0 : undefined} max={key === 'percent' ? 100 : undefined} onChange={(event) => { const number = Number(event.target.value); if (event.target.value && Number.isFinite(number)) onChange(path, number); }} />
      : options ? <select id={id} value={value} onChange={(event) => onChange(path, event.target.value)}>{options.map((item) => <option key={item} value={item}>{({front:'Trước',back:'Sau',left:'Trái',right:'Phải',top:'Trên',bottom:'Dưới',iso:'Phối cảnh'} as Record<string,string>)[item] ?? item.toUpperCase()}</option>)}</select>
      : value.length > 110 || /note|intro|description|explanation|stem|lead|body|clinical|treatment/i.test(key) ? <textarea id={id} rows={Math.min(9, Math.max(3, Math.ceil(value.length / 95)))} value={value} disabled={disabled} onChange={(event) => onChange(path, event.target.value)} />
      : <input id={id} value={value} disabled={disabled} list={choices ? `${id}-meshes` : undefined} onChange={(event) => onChange(path, event.target.value)} />}
    {choices && <datalist id={`${id}-meshes`}>{choices.map((name) => <option key={name} value={name} />)}</datalist>}
    {key === 'meshName' && modelUrl && <details className="cms-mesh-picker"><summary>Chọn mesh trên mô hình 3D</summary><ModelPreview url={modelUrl} onPick={(mesh) => onChange(path, mesh)} /></details>}
    {(isModel || image) && <div className="cms-upload">
      <button type="button" className="bo-btn" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? 'Đang kiểm tra & tải lên…' : isModel ? 'Tải GLB thay thế' : 'Tải ảnh thay thế'}</button><input ref={fileInput} aria-label={isModel ? 'Chọn tệp GLB' : 'Chọn tệp ảnh'} type="file" disabled={uploading} accept={isModel ? '.glb' : '.png,.jpg,.jpeg,.webp'} onChange={async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        if (file.size > (isModel ? 100 : 10) * 1024 * 1024) { setError(isModel ? 'Tệp GLB tối đa 100 MB.' : 'Ảnh tối đa 10 MB.'); event.target.value = ''; return; }
        setError(''); setUploading(true); onUploadState?.(1);
        try { const asset = await contentApi.upload(file); onChange(path, assetUrl(asset)); onUploaded?.(asset); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không tải được tệp'); }
        finally { setUploading(false); onUploadState?.(-1); event.target.value = ''; }
      }} />
      {isModel && <span className="bo-muted">GLB 2.0 · tối đa 100 MB · kiểm tra cấu trúc hình học trước khi lưu tệp</span>}
      {image && value && <a href={mediaUrl} target="_blank" rel="noreferrer">Mở ảnh ↗</a>}
    </div>}
    {image && value && <div className="cms-image-preview" role="img" aria-label={`Xem trước ${displayTitle}`} style={{ backgroundImage: `url(${JSON.stringify(mediaUrl)})` }} />}
    {isModel && typeof value === 'string' && value && <details className="cms-mesh-picker"><summary>Kiểm tra mô hình 3D</summary><ModelPreview url={value} /></details>}
    {error && <p className="cms-error" role="alert">{error}</p>}
  </div>;
}
