"use client";
import { useCallback, useEffect, useState } from "react";
import { adminApi, type MedicalSource } from "@/lib/admin";
import { API_URL, apiRequest } from "@/lib/auth";
import { useDirtyGuard } from "@/lib/dirty-guard";

const STATUSES=[['downloaded','Đã có PDF trong kho'],['official-link','Liên kết chính thức'],['official-link-unavailable','Liên kết đã hỏng'],['restricted-login','Cần đăng nhập thư viện'],['commercial','Sách thương mại — chỉ trích dẫn'],['archived','Ngừng sử dụng']];
type Form={title:string;publisher:string;year:string;url:string;licenseNote:string;status:string};
type Editor={mode:'new'|'replace'|'metadata';source:MedicalSource|null;initial:Form};
const blank=():Form=>({title:'',publisher:'',year:'',url:'',licenseNote:'',status:'official-link'});
const normal=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase();

export default function SourcesLibrary(){
  const [rows,setRows]=useState<MedicalSource[]>([]);
  const [editor,setEditor]=useState<Editor|null>(null);
  const [form,setForm]=useState<Form>(blank);
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [note,setNote]=useState('');
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState('');
  const [showArchived,setShowArchived]=useState(false);
  const dirty=!!editor && (!!file || JSON.stringify(form)!==JSON.stringify(editor.initial));
  const mayDiscard=useDirtyGuard(dirty,busy);
  const load=useCallback(async()=>{
    try{setRows(await adminApi.sources());}catch(e){setError(e instanceof Error?e.message:'Không tải được tài liệu');}finally{setLoading(false);}
  },[]);
  useEffect(()=>{queueMicrotask(()=>void load());},[load]);
  function open(mode:Editor['mode'],source:MedicalSource|null=null){
    if(!mayDiscard())return;
    const initial=mode==='metadata'&&source?{title:source.title,publisher:source.publisher,year:source.year?.toString()??'',url:source.url,licenseNote:source.licenseNote??'',status:source.status}:blank();
    setEditor({mode,source,initial});setForm(initial);setFile(null);setError('');setNote('');
  }
  async function save(event:React.FormEvent){
    event.preventDefault();if(!editor||busy)return;
    setBusy(true);setError('');setNote('');
    try{
      if(editor.mode==='metadata'&&editor.source){
        await adminApi.updateSource(editor.source.id,{title:form.title.trim(),publisher:form.publisher.trim(),year:form.year?Number(form.year):null,url:form.url.trim(),licenseNote:form.licenseNote,status:form.status,expectedRevision:editor.source.revision});
        setNote('Đã lưu thông tin nguồn. Nội dung tài liệu gốc được giữ nguyên.');
      }else{
        const data=new FormData();
        for(const key of ['title','publisher','url','licenseNote'] as const)data.set(key,form[key].trim());
        if(form.year)data.set('year',form.year);if(file)data.set('file',file);
        if(editor.mode==='replace'&&editor.source){data.set('replaceId',editor.source.id);data.set('expectedRevision',editor.source.revision);}
        const result=await apiRequest<MedicalSource&{indexed:boolean;pages:number}>('/admin/sources',{method:'POST',body:data});
        setNote(`Đã ${editor.mode==='replace'?'thay nguồn sử dụng bằng':'thêm'} “${result.title}”.${editor.mode==='replace'?' Nguồn và trích dẫn cũ được giữ nguyên.':''}${file&&!result.indexed?' PDF chưa có văn bản để tra cứu; vẫn xem được bản gốc.':''}`);
      }
      setEditor(null);setFile(null);await load();
    }catch(e){setError(e instanceof Error?e.message:'Không lưu được nguồn');}finally{setBusy(false);}
  }
  async function archive(source:MedicalSource){
    if(!mayDiscard()||!window.confirm(`Ngừng sử dụng “${source.title}”? PDF và ${source._count?.citations??0} trích dẫn cũ vẫn được giữ. Các bài liên quan sẽ cần duyệt lại.`))return;
    setBusy(true);setError('');
    try{await adminApi.updateSource(source.id,{status:'archived',expectedRevision:source.revision});setNote('Đã ngừng sử dụng nguồn trong tra cứu mới.');setEditor(null);await load();}catch(e){setError(e instanceof Error?e.message:'Không cập nhật được');}finally{setBusy(false);}
  }
  const field=(key:keyof Form,label:string,type='text')=><div className="bo-field" key={key}><label htmlFor={'source-'+key}>{label}</label><input id={'source-'+key} className="bo-input" type={type} required={key==='title'||key==='publisher'} min={type==='number'?1000:undefined} max={type==='number'?3000:undefined} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></div>;
  const visible=rows.filter(row=>(showArchived||row.status!=='archived')&&normal(`${row.title} ${row.publisher}`).includes(normal(q.trim())));
  return <>
    <p className="bo-msg">Chọn và thay tài liệu dùng làm nguồn. Sách/PDF gốc được giữ nguyên. Khi thay sách, nguồn mới có mã riêng; các trích dẫn cũ vẫn gắn với đúng sách cũ.</p>
    <div className="bo-bar"><button className="bo-btn primary" disabled={busy} onClick={()=>open('new')}>Thêm tài liệu</button><input aria-label="Tìm tài liệu" className="bo-input grow" placeholder="Tìm tên tài liệu hoặc nhà xuất bản…" value={q} onChange={e=>setQ(e.target.value)}/><label className="bo-check"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Hiện nguồn ngừng sử dụng</label></div>
    {error&&<p className="bo-msg err" role="alert">{error}</p>}{note&&<p className="bo-msg ok" role="status">{note}</p>}
    {editor&&<form className="bo-cite" onSubmit={save}><h2>{editor.mode==='new'?'Thêm tài liệu':editor.mode==='replace'?'Thay bằng tài liệu khác':'Sửa thông tin nguồn'}</h2>
      {editor.mode==='replace'&&<p>Nguồn cần thay: <b>{editor.source?.title}</b>. Nhập thông tin sách mới và chọn PDF hoặc liên kết mới. Nguồn cũ sẽ chuyển sang ngừng sử dụng.</p>}
      <fieldset disabled={busy} style={{border:0,padding:0,margin:0}}>
        {field('title','Tên tài liệu')}{field('publisher','Nhà xuất bản')}{field('year','Năm xuất bản','number')}{field('url','Liên kết chính thức','url')}
        {editor.mode!=='metadata'&&<div className="bo-field"><label htmlFor="source-pdf">PDF gốc · tối đa 30 MB</label><input id="source-pdf" type="file" accept=".pdf,application/pdf" onChange={e=>{const next=e.target.files?.[0]??null;if(next&&next.size>30*1024*1024){setError('PDF tối đa 30 MB');e.target.value='';setFile(null);}else{setFile(next);setError('');}}}/><small>Chọn PDF hoặc nhập liên kết. Tệp được lưu nguyên bản.</small></div>}
        {editor.mode==='metadata'&&<div className="bo-field"><label htmlFor="source-status">Trạng thái sử dụng</label><select id="source-status" className="bo-select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>}
        {field('licenseNote','Ghi chú giấy phép')}
        <div className="bo-bar"><button className="bo-btn primary" type="submit">{busy?'Đang lưu…':editor.mode==='replace'?'Thay nguồn sử dụng':'Lưu'}</button><button type="button" className="bo-btn" onClick={()=>{if(mayDiscard())setEditor(null);}}>Huỷ</button></div>
      </fieldset>
    </form>}
    <div className="bo-table-wrap"><table className="bo-table"><thead><tr><th>Tài liệu</th><th>Trạng thái</th><th>Trích dẫn</th><th>Thao tác</th></tr></thead><tbody>{visible.map(source=><tr key={source.id}><td><strong>{source.title}</strong><em>{source.publisher}{source.year?` · ${source.year}`:''}</em><small>{source.id}</small></td><td><span className={`bo-tag ${source.status==='archived'?'warn':''}`}>{STATUSES.find(([v])=>v===source.status)?.[1]??source.status}</span></td><td>{source._count?.citations??0}</td><td><div className="bo-source-actions">
      {(source.localFile||source.url)&&<a className="bo-btn small" href={source.localFile?`${API_URL}/medical-knowledge/pdf/${encodeURIComponent(source.localFile.split(/[\\/]/).pop()!)}`:source.url} target="_blank" rel="noopener noreferrer">{source.localFile?'Xem PDF gốc ↗':'Mở nguồn ↗'}</a>}
      <button className="bo-btn small" disabled={busy} onClick={()=>open('metadata',source)}>Sửa thông tin nguồn</button>
      {source.status!=='archived'&&<><button className="bo-btn small primary" disabled={busy} onClick={()=>open('replace',source)}>Thay tài liệu khác</button><button className="bo-btn small danger" disabled={busy} onClick={()=>void archive(source)}>Ngừng sử dụng</button></>}
    </div></td></tr>)}</tbody></table>{loading?<p className="bo-empty">Đang tải…</p>:!visible.length&&<p className="bo-empty">Không có tài liệu phù hợp.</p>}</div>
  </>;
}
