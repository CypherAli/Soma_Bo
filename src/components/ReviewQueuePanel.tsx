"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, LOCALES, type ReviewRow } from "@/lib/admin";
import type { Jump } from "./AdminShell";

/**
 * Hàng chờ duyệt chuyên môn.
 *
 * Tách khỏi khu Bệnh lý vì đây là một PHIÊN LÀM VIỆC khác: người duyệt mở hai
 * chục bài liền để đọc rồi tick, chứ không đi sửa từng trường. Ở khu Bệnh lý thì
 * mỗi lần lại phải lọc `needsReview` từ đầu.
 *
 * Chỉ tick được bài ĐỦ ĐIỀU KIỆN — có nội dung tiếng Việt đã soạn và có trích dẫn đã đối chiếu từ nguồn đang sử dụng.
 * Duyệt một bài chưa có gì để đọc là ký vào chỗ trống.
 */
export default function ReviewQueuePanel({
  canApprove,
  onChanged,
  onJump,
}: {
  canApprove: boolean;
  onChanged: () => void;
  onJump: (target: Jump) => void;
}) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [system, setSystem] = useState("");
  const [systems, setSystems] = useState<{ name: string; count: number }[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      await Promise.resolve();
      try {
        const result = await adminApi.reviewQueue({
          q: search,
          clinicalSystem: system,
          page,
        });
        if (!isCurrent()) return;
        setRows(result.items);
        setTotal(result.total);
        setPageSize(result.pageSize);
        setError("");
      } catch (e) {
        if (isCurrent()) {
          setError(e instanceof Error ? e.message : "Không nạp được hàng chờ");
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [search, system, page],
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

  useEffect(() => {
    adminApi
      .clinicalSystems()
      .then(setSystems)
      .catch(() => setSystems([]));
  }, []);

  // Đổi trang hay bộ lọc thì BỎ hết lựa chọn: giữ lại thì người dùng tick ở
  // trang 1, sang trang 3 tick thêm, rồi bấm duyệt mà không thấy mình vừa duyệt
  // những bài nào.
  const reset = (apply: () => void) => {
    apply();
    setPicked([]);
    setPage(1);
  };

  const eligible = rows.filter((r) => r.ready).map((r) => r.id);
  const allPicked = eligible.length > 0 && eligible.every((id) => picked.includes(id));

  const run = async (value: boolean) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await adminApi.bulkReview(picked, value, Object.fromEntries(rows.filter(row=>picked.includes(row.id)).map(row=>[row.id,row.reviewRevision])));
      setNote(
        `${result.updated} bài ${value ? "đã đánh dấu duyệt" : "đã trả về hàng chờ"}` +
          (result.skipped ? ` · ${result.skipped} bài vốn đã ở trạng thái đó` : ""),
      );
      setPicked([]);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được");
    } finally {
      setBusy(false);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="bo-bar">
        <form
          className="grow"
          onSubmit={(event) => {
            event.preventDefault();
            reset(() => setSearch(q.trim()));
          }}
        >
          <input
            className="bo-input"
            placeholder="Tìm theo tên hoặc slug…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </form>
        <select
          className="bo-select"
          style={{ width: "auto" }}
          value={system}
          onChange={(event) => reset(() => setSystem(event.target.value))}
        >
          <option value="">Mọi hệ lâm sàng</option>
          {systems.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} ({s.count})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="bo-msg err">{error}</p>}
      {note && <p className="bo-msg ok">{note}</p>}

      {canApprove ? (
        <div className="bo-bar">
          <label className="bo-check">
            <input
              type="checkbox"
              checked={allPicked}
              onChange={(event) =>
                setPicked(event.target.checked ? eligible : [])
              }
            />
            Chọn {eligible.length} bài đủ điều kiện ở trang này
          </label>
          <button
            type="button"
            className="bo-btn primary"
            disabled={picked.length === 0 || busy}
            onClick={() => void run(true)}
          >
            Đánh dấu đã duyệt ({picked.length})
          </button>
          <button
            type="button"
            className="bo-btn"
            disabled={picked.length === 0 || busy}
            onClick={() => void run(false)}
          >
            Trả về hàng chờ
          </button>
          <span style={{ color: "var(--bo-muted)", fontSize: 12 }}>
            Tối đa 50 bài một lượt.
          </span>
        </div>
      ) : (
        <p className="bo-msg" style={{ background: "var(--bo-warn-bg)", color: "var(--bo-warn)" }}>
          Duyệt chuyên môn cần quyền <b>admin</b>. Bạn xem được hàng chờ và mở
          từng bài để soạn, nhưng không tick duyệt được.
        </p>
      )}

      <div className="bo-table-wrap">
        <table className="bo-table">
          <thead>
            <tr>
              {canApprove && <th style={{ width: 34 }} />}
              <th>Bệnh</th>
              <th>Hệ lâm sàng</th>
              <th>Ngôn ngữ</th>
              <th>Nguồn</th>
              <th>Đủ điều kiện</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {canApprove && (
                  <td>
                    <input
                      type="checkbox"
                      style={{ width: 15, height: 15, accentColor: "var(--bo-accent)" }}
                      disabled={!row.ready}
                      checked={picked.includes(row.id)}
                      title={
                        row.ready
                          ? "Chọn để duyệt"
                          : "Cần đại cương tiếng Việt đã soạn và trích dẫn đã đối chiếu từ nguồn đang sử dụng"
                      }
                      onChange={(event) =>
                        setPicked((list) =>
                          event.target.checked
                            ? [...list, row.id]
                            : list.filter((x) => x !== row.id),
                        )
                      }
                    />
                  </td>
                )}
                <td>
                  <strong>{row.nameVi}</strong>
                  <em>
                    {row.slug}
                    {row.icdCode ? ` · ICD ${row.icdCode}` : ""}
                  </em>
                </td>
                <td>{row.clinicalSystem ?? "—"}</td>
                <td>
                  <div className="bo-tags">
                    {LOCALES.map((locale) => {
                      const has = row.locales.includes(locale);
                      const machine = row.machineLocales.includes(locale);
                      return (
                        <span
                          key={locale}
                          className={`bo-tag ${has ? (machine ? "warn" : "good") : "bad"}`}
                        >
                          {locale}
                          {machine ? "*" : ""}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <em>{row.source}</em>
                  <em>
                    {row.sourcePage ? `tr. ${row.sourcePage} · ` : ""}
                    <span className={`bo-tag ${row.citations ? "good" : "bad"}`}>
                      {row.citations} trích dẫn
                    </span>
                  </em>
                </td>
                <td>
                  <span className={`bo-tag ${row.ready ? "good" : "bad"}`}>
                    {row.ready ? "đủ" : "chưa đủ"}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="bo-btn small"
                    onClick={() =>
                      onJump({ tab: "pathologies", pathologyId: row.id })
                    }
                  >
                    Mở
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="bo-empty">Đang nạp…</p>}
        {!loading && rows.length === 0 && (
          <p className="bo-empty">
            Không còn bài nào chờ duyệt khớp bộ lọc này.
          </p>
        )}
      </div>

      <div className="bo-pager">
        <button
          type="button"
          className="bo-btn small"
          disabled={page <= 1}
          onClick={() => {
            setPicked([]);
            setPage((p) => p - 1);
          }}
        >
          Trước
        </button>
        <span>
          Trang {page}/{lastPage} · {total} bài chờ duyệt
        </span>
        <button
          type="button"
          className="bo-btn small"
          disabled={page >= lastPage}
          onClick={() => {
            setPicked([]);
            setPage((p) => p + 1);
          }}
        >
          Sau
        </button>
      </div>
    </>
  );
}
