"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type CitationRow, type MedicalSource } from "@/lib/admin";
import type { Jump } from "./AdminShell";

const SOURCE_OK = ["downloaded", "official-link"];

/**
 * Hàng đợi đối chiếu trích dẫn.
 *
 * Người làm việc này mở sách ra và tick từng dòng, nên màn hình phải cho thấy
 * ĐỦ để đối chiếu mà không cần mở bài: tên bệnh, tài liệu, trang, và câu trích
 * nguyên văn nếu có.
 *
 * Cảnh báo riêng khi trích dẫn dựa vào tài liệu KHÔNG MỞ ĐƯỢC: đánh dấu "đã đối
 * chiếu" cho một nguồn mà chính mình không mở nổi là một cái tick rỗng.
 */
export default function CitationPanel({
  canVerify,
  onChanged,
  onJump,
}: {
  canVerify: boolean;
  onChanged: () => void;
  onJump: (target: Jump) => void;
}) {
  const [rows, setRows] = useState<CitationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [state, setState] = useState("false");
  const [sourceId, setSourceId] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState<MedicalSource[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      await Promise.resolve();
      try {
        const result = await adminApi.citationQueue({
          verified: state === "" ? undefined : state === "true",
          sourceId,
          q: search,
          page,
        });
        if (!isCurrent()) return;
        setRows(result.items);
        setTotal(result.total);
        setPageSize(result.pageSize);
        setError("");
      } catch (e) {
        if (isCurrent()) {
          setError(e instanceof Error ? e.message : "Không nạp được trích dẫn");
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [state, sourceId, search, page],
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
      .sources()
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  const reset = (apply: () => void) => {
    apply();
    setPicked([]);
    setPage(1);
  };

  const ids = rows.map((r) => r.id);
  const allPicked = ids.length > 0 && ids.every((id) => picked.includes(id));

  const run = async (value: boolean) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await adminApi.bulkVerifyCitations(picked, value);
      setNote(
        `${result.updated} trích dẫn ${value ? "đã ghi nhận đối chiếu" : "đã bỏ dấu đối chiếu"}` +
          (result.skipped ? ` · ${result.skipped} vốn đã ở trạng thái đó` : ""),
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
  const riskyPicked = rows.filter(
    (r) => picked.includes(r.id) && !SOURCE_OK.includes(r.source.status),
  ).length;

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
            placeholder="Tìm theo tên bệnh, slug hoặc câu trích…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </form>
        <select
          className="bo-select"
          style={{ width: "auto" }}
          value={state}
          onChange={(event) => reset(() => setState(event.target.value))}
        >
          <option value="false">Chưa đối chiếu</option>
          <option value="true">Đã đối chiếu</option>
          <option value="">Tất cả</option>
        </select>
        <select
          className="bo-select"
          style={{ width: "auto" }}
          value={sourceId}
          onChange={(event) => reset(() => setSourceId(event.target.value))}
        >
          <option value="">Mọi tài liệu</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="bo-msg err">{error}</p>}
      {note && <p className="bo-msg ok">{note}</p>}

      {canVerify && (
        <>
          <div className="bo-bar">
            <label className="bo-check">
              <input
                type="checkbox"
                checked={allPicked}
                onChange={(event) => setPicked(event.target.checked ? ids : [])}
              />
              Chọn cả trang ({ids.length})
            </label>
            <button
              type="button"
              className="bo-btn primary"
              disabled={picked.length === 0 || busy}
              onClick={() => void run(true)}
            >
              Đã đối chiếu ({picked.length})
            </button>
            <button
              type="button"
              className="bo-btn"
              disabled={picked.length === 0 || busy}
              onClick={() => void run(false)}
            >
              Bỏ đối chiếu
            </button>
            <span style={{ color: "var(--bo-muted)", fontSize: 12 }}>
              Tối đa 50 một lượt.
            </span>
          </div>
          {riskyPicked > 0 && (
            <p
              className="bo-msg"
              style={{ background: "var(--bo-warn-bg)", color: "var(--bo-warn)" }}
            >
              {riskyPicked} trích dẫn đang chọn dựa vào tài liệu <b>không mở
              được</b> (liên kết hỏng, cần đăng nhập, hoặc sách thương mại). Đánh
              dấu đã đối chiếu một nguồn mình không mở nổi là một cái tick rỗng.
            </p>
          )}
        </>
      )}

      <div className="bo-table-wrap">
        <table className="bo-table">
          <thead>
            <tr>
              {canVerify && <th style={{ width: 34 }} />}
              <th>Bệnh</th>
              <th>Tài liệu</th>
              <th>Trích nguyên văn</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {canVerify && (
                  <td>
                    <input
                      type="checkbox"
                      style={{ width: 15, height: 15, accentColor: "var(--bo-accent)" }}
                      checked={picked.includes(row.id)}
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
                  <strong>{row.pathology.nameVi}</strong>
                  <em>{row.pathology.slug}</em>
                </td>
                <td>
                  {row.source.title}
                  <em>
                    {row.pageOrSection ?? "chưa ghi trang"}
                    {" · "}
                    <span
                      className={`bo-tag ${SOURCE_OK.includes(row.source.status) ? "good" : "warn"}`}
                    >
                      {row.source.status}
                    </span>
                  </em>
                </td>
                <td style={{ maxWidth: 300 }}>
                  {row.quote ? (
                    <em style={{ fontStyle: "italic" }}>{row.quote}</em>
                  ) : (
                    <em>chưa có câu trích</em>
                  )}
                </td>
                <td>
                  <span className={`bo-tag ${row.verified ? "good" : "warn"}`}>
                    {row.verified ? "đã đối chiếu" : "chưa"}
                  </span>
                  {row.verified && row.verifiedBy && (
                    <em>
                      {row.verifiedBy}
                      {row.verifiedAt
                        ? ` · ${new Date(row.verifiedAt).toLocaleDateString("vi-VN")}`
                        : ""}
                    </em>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="bo-btn small"
                    onClick={() =>
                      onJump({
                        tab: "pathologies",
                        pathologyId: row.pathology.id,
                      })
                    }
                  >
                    Mở bài
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="bo-empty">Đang nạp…</p>}
        {!loading && rows.length === 0 && (
          <p className="bo-empty">Không có trích dẫn nào khớp bộ lọc.</p>
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
          Trang {page}/{lastPage} · {total} trích dẫn
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
