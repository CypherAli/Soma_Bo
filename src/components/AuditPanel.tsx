"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AuditEntry } from "@/lib/admin";

const ACTION_NAME: Record<string, string> = {
  draft: 'lưu nháp',
  publish: 'xuất bản',
  restore: 'khôi phục',
  replace: 'thay tài liệu',
  upload: 'tải tệp',
  create: "tạo",
  update: "sửa",
  delete: "xoá",
  verify: "duyệt",
  role_change: "đổi quyền",
  disable: "khoá",
  enable: "mở khoá",
};

const ENTITIES = [
  { value: 'site_content', label: 'Nội dung website & mô hình' },
  { value: 'site_asset', label: 'Tệp mô hình & hình ảnh' },
  { value: "", label: "Mọi đối tượng" },
  { value: "pathology", label: "Bệnh lý" },
  { value: "pathology_content", label: "Nội dung bệnh lý" },
  { value: "pathology_citation", label: "Trích dẫn" },
  { value: "medical_source", label: "Tài liệu y khoa" },
  { value: "user", label: "Tài khoản" },
];

/** Rút gọn ảnh chụp JSON cho vừa một ô bảng, bấm mới xem đầy đủ. */
function summarise(value: unknown) {
  if (value === null || value === undefined) return "—";
  const text = JSON.stringify(value);
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

export default function AuditPanel() {
  const [restore,setRestore]=useState<{id:string;preview:Awaited<ReturnType<typeof adminApi.restorePreview>>}|null>(null);
  const [restoring,setRestoring]=useState(false);
  const [note,setNote]=useState('');
  const previewRestore=async(id:string)=>{try{setError('');setRestore({id,preview:await adminApi.restorePreview(id)});}catch(e){setError(e instanceof Error?e.message:'Không mở được phiên bản');}};
  const applyRestore=async()=>{if(!restore||restoring)return;setRestoring(true);try{await adminApi.restoreAudit(restore.id,restore.preview.expectedRevision);setRestore(null);setNote('Đã khôi phục nội dung và ghi nhật ký.'+(['pathology','pathology_content'].includes(restore.preview.entity)?' Bài bệnh được trả về chờ duyệt.':''));await load();}catch(e){setError(e instanceof Error?e.message:'Không khôi phục được');}finally{setRestoring(false);}};
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [actorInput, setActorInput] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  /*
   * `isCurrent` chặn lượt tải CŨ về muộn ghi đè lượt mới.
   *
   * Đã trả giá: bấm một cấu trúc từ thanh tìm kiếm thì panel gửi lượt KHÔNG lọc
   * trước (lúc vừa gắn), rồi mới gửi lượt có lọc — lượt đầu trả về sau và xoá
   * sạch kết quả đúng. Trên màn hình: ô lọc có chữ mà bảng vẫn 200 dòng, không
   * lỗi nào báo ra. Cùng loại lỗi mà `ViewerPathologyPanel` bên Soma_Fe đã gặp.
   */
  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
    // Nhường một nhịp trước khi chạm vào state, đúng quy ước đã dùng ở
    // `HomeNav`: gọi setState ĐỒNG BỘ trong thân effect thì React Compiler báo
    // lỗi "cascading renders", và cảnh báo đó đúng — lần dựng đầu sẽ render hai
    // lượt liền.
    await Promise.resolve();
    try {
      const result = await adminApi.audit({ entity, actorEmail: actor, page });
      if (!isCurrent()) return;
      setRows(result.items);
      setTotal(result.total);
      setPageSize(result.pageSize);
      setError("");
    } catch (e) {
      if (isCurrent()) setError(e instanceof Error ? e.message : "Không nạp được nhật ký");
    } finally {
      if (isCurrent()) setLoading(false);
    }
    },
    [entity, actor, page],
  );

  useEffect(() => {
    // Bọc trong một hàm async khai ngay trong effect và nhường một nhịp trước
    // khi gọi: gọi thẳng `load()` thì React Compiler coi là setState đồng bộ
    // trong effect và báo lỗi "cascading renders". Cùng khuôn với `HomeNav`.
    let alive = true;
    async function run() {
      await Promise.resolve();
      await load(() => alive);
    }
    void run();
    return () => {
      alive = false;
    };
  }, [load]);

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="bo-bar">
        <select
          className="bo-select"
          style={{ width: "auto" }}
          value={entity}
          onChange={(event) => {
            setEntity(event.target.value);
            setPage(1);
          }}
        >
          {ENTITIES.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <form
          className="grow"
          onSubmit={(event) => {
            event.preventDefault();
            setActor(actorInput.trim());
            setPage(1);
          }}
        >
          <input
            className="bo-input"
            placeholder="Lọc theo email người thao tác…"
            value={actorInput}
            onChange={(event) => setActorInput(event.target.value)}
          />
        </form>
      </div>

      {error && <p className="bo-msg err">{error}</p>}{note && <p className="bo-msg ok">{note}</p>}
      {restore && <div className="bo-drawer" role="dialog" aria-modal="true" aria-label="Đối chiếu trước khi khôi phục"><button aria-label="Đóng" disabled={restoring} onClick={()=>setRestore(null)}/><section><header><h2>Đối chiếu trước khi khôi phục</h2></header><div className="bo-body"><p>Khôi phục các trường dưới đây. Nội dung tài liệu gốc và mã liên kết được giữ nguyên.</p><table className="bo-table"><thead><tr><th>Trường</th><th>Hiện tại</th><th>Sau khôi phục</th></tr></thead><tbody>{Object.entries(restore.preview.data).map(([key,value])=><tr key={key}><td>{key}</td><td style={{whiteSpace:'pre-wrap'}}>{String(restore.preview.current[key]??'—')}</td><td style={{whiteSpace:'pre-wrap'}}>{String(value??'—')}</td></tr>)}</tbody></table><div className="bo-bar"><button className="bo-btn primary" disabled={restoring} onClick={()=>void applyRestore()}>{restoring?'Đang khôi phục…':'Khôi phục phiên bản này'}</button><button className="bo-btn" disabled={restoring} onClick={()=>setRestore(null)}>Huỷ</button></div></div></section></div>}

      <div className="bo-table-wrap">
        <table className="bo-table">
          <thead>
            <tr>
              <th>Lúc</th>
              <th>Người làm</th>
              <th>Việc</th>
              <th>Đối tượng</th>
              <th>Trước khi sửa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setExpanded(expanded === row.id ? null : row.id)
                }
              >
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(row.createdAt).toLocaleString("vi-VN")}
                </td>
                <td>{row.actorEmail}</td>
                <td>
                  <span className="bo-tag">
                    {ACTION_NAME[row.action] ?? row.action}
                  </span>
                </td>
                <td>
                  <strong>{row.entityLabel ?? row.entityId}</strong>
                  <em>{row.entity}</em>
                </td>
                <td style={{ maxWidth: 320 }}>
                  {expanded === row.id ? (
                    <>
                      {['pathology','pathology_content','species','anatomy_system','structure','quiz_question','quiz_option','medical_source'].includes(row.entity) && row.before && typeof row.before==='object' && Object.keys(row.before).some(key=>!['needsReview','localFile'].includes(key)) ? <button className="bo-btn small" onClick={event=>{event.stopPropagation();void previewRestore(row.id);}}>Đối chiếu & khôi phục</button> : null}
                      <em>trước:</em>
                      <pre
                        style={{
                          margin: "4px 0",
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          fontSize: 11,
                        }}
                      >
                        {JSON.stringify(row.before, null, 1) ?? "—"}
                      </pre>
                      <em>sau:</em>
                      <pre
                        style={{
                          margin: "4px 0",
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          fontSize: 11,
                        }}
                      >
                        {JSON.stringify(row.after, null, 1) ?? "—"}
                      </pre>
                    </>
                  ) : (
                    <em>{summarise(row.before)}</em>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="bo-empty">Đang nạp…</p>}
        {!loading && rows.length === 0 && (
          <p className="bo-empty">Chưa có thao tác nào khớp bộ lọc.</p>
        )}
      </div>

      <div className="bo-pager">
        <button
          type="button"
          className="bo-btn small"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Trước
        </button>
        <span>
          Trang {page}/{lastPage} · {total} bản ghi · bấm một dòng để xem đầy đủ
        </span>
        <button
          type="button"
          className="bo-btn small"
          disabled={page >= lastPage}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </button>
      </div>
    </>
  );
}
