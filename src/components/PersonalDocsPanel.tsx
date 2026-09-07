"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type PersonalDocRow } from "@/lib/admin";

const STATUS: Record<string, { text: string; tone: string }> = {
  processing: { text: "đang bóc", tone: "warn" },
  ready: { text: "xong", tone: "good" },
  failed: { text: "bóc hỏng", tone: "bad" },
};

const kb = (bytes: number) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

/**
 * Tài liệu PDF người dùng tải lên — CHỈ phần kê khai.
 *
 * Không có tên câu hỏi, không có phương án, không một chữ nào của tài liệu.
 * Trang web hứa "chỉ tài khoản của bạn truy cập"; cho quản trị đọc được là phá
 * lời hứa đó. Cái quản trị thật sự cần chỉ là "có bản nào bóc hỏng không" — mà
 * điều đó nằm ở trạng thái, không nằm ở nội dung.
 *
 * Không có nút xoá: tài liệu là của người dùng, chỉ họ xoá được ở trang ngoài.
 */
export default function PersonalDocsPanel() {
  const [rows, setRows] = useState<PersonalDocRow[]>([]);
  const [byStatus, setByStatus] = useState<
    { status: string; count: number }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      await Promise.resolve();
      try {
        const result = await adminApi.personalDocs({ status, page });
        if (!isCurrent()) return;
        setRows(result.items);
        setByStatus(result.byStatus);
        setTotal(result.total);
        setPageSize(result.pageSize);
        setError("");
      } catch (e) {
        if (isCurrent()) {
          setError(e instanceof Error ? e.message : "Không nạp được danh sách");
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [status, page],
  );

  useEffect(() => {
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

  const failed = byStatus.find((s) => s.status === "failed")?.count ?? 0;
  const stuck = byStatus.find((s) => s.status === "processing")?.count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <p style={{ margin: "0 0 14px", color: "var(--bo-muted)", fontSize: 12 }}>
        Chỉ phần kê khai: tên tệp, dung lượng, số trang, trạng thái bóc và số câu
        bóc được. <b>Không có nội dung tài liệu và không có nội dung câu hỏi</b> —
        đó là dữ liệu riêng của người dùng.
      </p>

      {error && <p className="bo-msg err">{error}</p>}

      {failed > 0 && (
        <p className="bo-msg err">
          {failed} tài liệu bóc hỏng. Người tải lên đang thấy tài liệu của mình
          không ra được câu nào mà không biết vì sao — xem cột ghi chú để biết
          lỗi, và đối chiếu với nhật ký máy chủ cùng thời điểm.
        </p>
      )}
      {stuck > 0 && (
        <p
          className="bo-msg"
          style={{ background: "var(--bo-warn-bg)", color: "var(--bo-warn)" }}
        >
          {stuck} tài liệu đang ở trạng thái “đang bóc”. Nếu con số này không
          giảm sau vài phút thì lượt bóc đã chết giữa đường và bản ghi bị treo
          lại ở đó.
        </p>
      )}

      <div className="bo-bar">
        <select
          className="bo-select"
          style={{ width: "auto" }}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Mọi trạng thái ({total})</option>
          {byStatus.map((s) => (
            <option key={s.status} value={s.status}>
              {STATUS[s.status]?.text ?? s.status} ({s.count})
            </option>
          ))}
        </select>
        <button type="button" className="bo-btn small" onClick={() => void load()}>
          Nạp lại
        </button>
      </div>

      <div className="bo-table-wrap">
        <table className="bo-table">
          <thead>
            <tr>
              <th>Tệp</th>
              <th>Người tải lên</th>
              <th>Bóc được</th>
              <th>Trạng thái</th>
              <th>Lúc</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label = STATUS[row.status] ?? {
                text: row.status,
                tone: "",
              };
              return (
                <tr key={row.id}>
                  <td>
                    <strong>{row.filename}</strong>
                    <em>
                      {kb(row.bytes)}
                      {row.pages > 0 ? ` · ${row.pages} trang` : ""}
                    </em>
                  </td>
                  <td>{row.owner}</td>
                  <td>
                    <span
                      className={`bo-tag ${row.questions > 0 ? "good" : "bad"}`}
                    >
                      {row.questions} câu
                    </span>
                    <em>{row.approved} câu đã người tải lên duyệt</em>
                  </td>
                  <td>
                    <span className={`bo-tag ${label.tone}`}>{label.text}</span>
                    {row.note && <em>{row.note}</em>}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(row.createdAt).toLocaleString("vi-VN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <p className="bo-empty">Đang nạp…</p>}
        {!loading && rows.length === 0 && (
          <p className="bo-empty">Chưa có tài liệu nào khớp bộ lọc.</p>
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
          Trang {page}/{lastPage} · {total} tài liệu
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
