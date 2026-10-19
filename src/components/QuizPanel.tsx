"use client";

import { useDirtyGuard } from "@/lib/dirty-guard";
import { useCallback, useEffect, useState } from "react";
import { adminApi, type AnatomySystem, type QuizQuestion } from "@/lib/admin";

/**
 * Câu hỏi trắc nghiệm NẰM TRONG CƠ SỞ DỮ LIỆU.
 *
 * Phải nói rõ ngay trên giao diện: đây không phải toàn bộ ngân hàng đề của
 * trang web. Bộ đề thật (257 câu theo vùng cơ thể) là mã TypeScript trong
 * Soma_Fe và được gác bởi `npm run verify:quiz-bank`; bảng này chỉ có mấy câu
 * mẫu theo hệ cơ quan. Không nói ra thì người quản trị sẽ tưởng mình vừa xoá
 * hết đề của trang.
 */
export default function QuizPanel({onWebsite}:{onWebsite:()=>void}) {
  const [rows, setRows] = useState<QuizQuestion[]>([]);
  const [systems, setSystems] = useState<AnatomySystem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [systemId, setSystemId] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [baseline,setBaseline] = useState('');
  const [expectedRevision,setExpectedRevision] = useState('');
  const [mutating,setMutating] = useState(false);
  const mayDiscard = useDirtyGuard(editing!==null && JSON.stringify(draft)!==baseline,mutating);
  const beginDraft = (value:typeof draft) => {setDraft(value);setBaseline(JSON.stringify(value));};
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

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
    await Promise.resolve();
    try {
      const result = await adminApi.quizzes({ systemId, q: search, page });
      if (!isCurrent()) return;
      setRows(result.items);
      setTotal(result.total);
      setPageSize(result.pageSize);
      setError("");
    } catch (e) {
      if (isCurrent()) setError(e instanceof Error ? e.message : "Không nạp được câu hỏi");
    } finally {
      if (isCurrent()) setLoading(false);
    }
    },
    [systemId, search, page],
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
      .systems({})
      .then((all) => setSystems(all.filter((s) => s.quizzes > 0)))
      .catch(() => setSystems([]));
  }, []);

  const act = async (run: () => Promise<unknown>, ok: string) => {
    if(mutating) return; setMutating(true);
    setError("");
    setNote("");
    try {
      await run();
      setNote(ok);
      setEditing(null);
      setDraft({});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {setMutating(false);}
  };

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <fieldset disabled={mutating} style={{border:0,padding:0,margin:0,minWidth:0}}>
      <div className="bo-msg"><b>Chọn ngân hàng câu hỏi</b><p>Câu hỏi trên website và câu hỏi theo hệ cơ quan có nguồn riêng. Chọn đúng bộ trước khi sửa.</p><button className="bo-btn primary" onClick={onWebsite}>Mở ngân hàng câu hỏi website</button> <span className="bo-tag">Đang xem: Câu hỏi theo hệ cơ quan</span></div>

      <div className="bo-bar">
        <form
          className="grow"
          onSubmit={(event) => {
            event.preventDefault();
            if(!mayDiscard()) return; setEditing(null); setSearch(q.trim());
            setPage(1);
          }}
        >
          <input
            className="bo-input"
            placeholder="Tìm trong đề bài…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </form>
        <select
          className="bo-select"
          style={{ width: "auto" }}
          value={systemId}
          onChange={(event) => {
            if(!mayDiscard()) return; setEditing(null); setSystemId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Mọi hệ cơ quan</option>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameVi} ({s.quizzes})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="bo-msg err">{error}</p>}
      {note && <p className="bo-msg ok">{note}</p>}

      {rows.map((row) => (
        <div className="bo-cite" key={row.id}>
          {editing === row.id ? (
            <>
              <div className="bo-field">
                <label htmlFor={`q-vi-${row.id}`}>Đề bài tiếng Việt</label>
                <textarea
                  id={`q-vi-${row.id}`}
                  className="bo-textarea"
                  style={{ minHeight: 64 }}
                  value={draft.promptVi ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, promptVi: event.target.value })
                  }
                />
              </div>
              <div className="bo-field">
                <label htmlFor={`q-en-${row.id}`}>Đề bài tiếng Anh</label>
                <textarea
                  id={`q-en-${row.id}`}
                  className="bo-textarea"
                  style={{ minHeight: 64 }}
                  value={draft.promptEn ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, promptEn: event.target.value })
                  }
                />
              </div>
              <div className="bo-field">
                <label htmlFor={`q-zh-${row.id}`}>Đề bài tiếng Trung</label>
                <textarea
                  id={`q-zh-${row.id}`}
                  className="bo-textarea"
                  style={{ minHeight: 64 }}
                  value={draft.promptZh ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, promptZh: event.target.value })
                  }
                />
              </div>
              <div className="bo-field">
                <label htmlFor={`q-ex-${row.id}`}>Giải thích</label>
                <textarea
                  id={`q-ex-${row.id}`}
                  className="bo-textarea"
                  style={{ minHeight: 64 }}
                  value={draft.explanation ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, explanation: event.target.value })
                  }
                />
              </div>
              <div className="bo-field">
                <label htmlFor={`q-src-${row.id}`}>Nguồn</label>
                <input
                  id={`q-src-${row.id}`}
                  className="bo-input"
                  value={draft.source ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, source: event.target.value })
                  }
                />
              </div>
              <footer>
                <button
                  type="button"
                  className="bo-btn primary"
                  onClick={() =>
                    act(
                      () =>
                        adminApi.updateQuiz(row.id, {expectedRevision,
                          promptVi: draft.promptVi,
                          promptEn: draft.promptEn,
                          promptZh: draft.promptZh,
                          explanation: draft.explanation,
                          source: draft.source || undefined,
                        }),
                      "Đã lưu câu hỏi.",
                    )
                  }
                >
                  Lưu
                </button>
                <button
                  type="button"
                  className="bo-btn"
                  onClick={() => {
                    if(!mayDiscard()) return; setEditing(null);
                    setDraft({});
                  }}
                >
                  Huỷ
                </button>
              </footer>
            </>
          ) : (
            <>
              <b>{row.promptVi}</b>
              <span>
                {row.promptEn} · {row.promptZh}
              </span>
              <span>
                {row.system.nameVi}
                {row.source ? ` · ${row.source}` : ""}
              </span>
              {row.explanation && <blockquote>{row.explanation}</blockquote>}

              <div className="bo-tags" style={{ flexDirection: "column", gap: 6 }}>
                {row.options.map((option) => (
                  <div
                    key={option.id}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span
                      className={`bo-tag ${option.isCorrect ? "good" : ""}`}
                      style={{ minWidth: 52, textAlign: "center" }}
                    >
                      {option.isCorrect ? "đúng" : "sai"}
                    </span>
                    <span style={{ fontSize: 12.5 }}>
                      {option.textVi}
                      {option.latin ? ` · ${option.latin}` : ""}
                    </span>
                    {!option.isCorrect && (
                      <button
                        type="button"
                        className="bo-btn small"
                        onClick={() => mayDiscard() && act(
                            () =>
                              adminApi.updateQuizOption(option.id, {
                                isCorrect: true,
                                expectedRevision: option.revision,
                              }),
                            "Đã đổi đáp án đúng — các phương án còn lại tự thành sai.",
                          )
                        }
                      >
                        Đặt làm đáp án đúng
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <footer>
                <button
                  type="button"
                  className="bo-btn small"
                  onClick={() => {
                    if(!mayDiscard()) return; setEditing(row.id); setExpectedRevision(row.revision);
                            beginDraft({
                      promptVi: row.promptVi,
                      promptEn: row.promptEn,
                      promptZh: row.promptZh,
                      explanation: row.explanation ?? "",
                      source: row.source ?? "",
                    });
                  }}
                >
                  Sửa câu hỏi
                </button>
              </footer>
            </>
          )}
        </div>
      ))}

      {loading && <p className="bo-empty">Đang nạp…</p>}
      {!loading && rows.length === 0 && (
        <p className="bo-empty">Không có câu hỏi nào khớp bộ lọc.</p>
      )}

      <div className="bo-pager">
        <button
          type="button"
          className="bo-btn small"
          disabled={page <= 1}
          onClick={() => {if(mayDiscard()) {setEditing(null);setPage((p)=>p-1);}}}
        >
          Trước
        </button>
        <span>
          Trang {page}/{lastPage} · {total} câu hỏi
        </span>
        <button
          type="button"
          className="bo-btn small"
          disabled={page >= lastPage}
          onClick={() => {if(mayDiscard()) {setEditing(null);setPage((p)=>p+1);}}}
        >
          Sau
        </button>
      </div>
    </fieldset>
  );
}
