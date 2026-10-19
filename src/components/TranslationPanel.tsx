"use client";

import { useDirtyGuard } from "@/lib/dirty-guard";
import { useCallback, useEffect, useState } from "react";
import { adminApi, type Locale3, type TranslationRow } from "@/lib/admin";

/** Năm mục nội dung, đúng thứ tự trang bệnh lý hiển thị. */
const FIELDS = [
  ["description", "Đại cương"],
  ["clinical", "Lâm sàng & cận lâm sàng"],
  ["imaging", "Chẩn đoán hình ảnh"],
  ["progression", "Tiến triển & biến chứng"],
  ["treatment", "Điều trị tham khảo"],
] as const;

type Field = (typeof FIELDS)[number][0];

const STATE_LABEL: Record<string, { text: string; tone: string }> = {
  missing: { text: "chưa có", tone: "bad" },
  machine: { text: "dịch máy", tone: "warn" },
  reviewed: { text: "đã duyệt", tone: "good" },
};

/**
 * Bàn dịch: bản đích đặt CẠNH bản gốc tiếng Việt.
 *
 * Ở khu Bệnh lý thì người dịch phải mở ngăn, bấm tab vi đọc một câu, bấm tab en
 * gõ câu đó — đọc một câu là hai lần bấm. Ở đây hai bản nằm cùng màn hình, gõ
 * xong bấm lưu là sang bài tiếp.
 *
 * Ô bản gốc để CHỈ ĐỌC: đây là bàn dịch, không phải chỗ sửa bản gốc. Sửa bản
 * tiếng Việt thì làm ở khu Bệnh lý, nơi có đủ trích dẫn và thuộc tính để đối
 * chiếu.
 */
export default function TranslationPanel({
  onChanged,
}: {
  onChanged: () => void;
}) {
  const [locale, setLocale] = useState<Locale3>("zh");
  const [state, setState] = useState("machine");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [baseline,setBaseline] = useState('');
  const [expectedRevision,setExpectedRevision] = useState('missing');
  const mayDiscard = useDirtyGuard(openId!==null && JSON.stringify({draft,reviewed})!==baseline,busy);
  const close = () => {if(mayDiscard()) setOpenId(null);};
  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      await Promise.resolve();
      try {
        const result = await adminApi.translations({
          locale,
          state,
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
          setError(e instanceof Error ? e.message : "Không nạp được hàng đợi");
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [locale, state, search, page],
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

  const reset = (apply: () => void) => {
    if(!mayDiscard()) return; apply();
    setOpenId(null);
    setPage(1);
  };

  const open = (row: TranslationRow) => {
    if(!mayDiscard()) return;
    setExpectedRevision(row.target?.revision ?? "missing");
    setBaseline(JSON.stringify({draft:Object.fromEntries(FIELDS.map(([key])=>[key,row.target?.[key]??""])),reviewed:row.target ? !row.target.machineTranslated:false}));
    setOpenId(row.id);
    setDraft({
      description: row.target?.description ?? "",
      clinical: row.target?.clinical ?? "",
      imaging: row.target?.imaging ?? "",
      progression: row.target?.progression ?? "",
      treatment: row.target?.treatment ?? "",
    });
    // Mặc định theo trạng thái hiện tại: bài dịch máy thì ô "đã có người duyệt"
    // để trống, người dịch tự tick khi thật sự đã đọc lại.
    setReviewed(row.target ? !row.target.machineTranslated : false);
    setNote("");
    setError("");
  };

  const save = async (row: TranslationRow) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await adminApi.saveContent(row.id, locale, {
        expectedRevision,
        description: draft.description,
        clinical: draft.clinical,
        imaging: draft.imaging,
        progression: draft.progression,
        treatment: draft.treatment,
        machineTranslated: !reviewed,
      });
      setNote(`Đã lưu bản ${locale} của “${row.nameVi}”.`);
      setOpenId(null);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const targetName = (row: TranslationRow) =>
    locale === "en" ? row.nameEn : row.nameZh;

  return (
    <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
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
          value={locale}
          onChange={(event) =>
            reset(() => setLocale(event.target.value as Locale3))
          }
        >
          <option value="zh">Bản tiếng Trung</option>
          <option value="en">Bản tiếng Anh</option>
        </select>
        <select
          className="bo-select"
          style={{ width: "auto" }}
          value={state}
          onChange={(event) => reset(() => setState(event.target.value))}
        >
          <option value="machine">Dịch máy, chưa duyệt</option>
          <option value="missing">Chưa có bản dịch</option>
          <option value="reviewed">Đã có người duyệt</option>
          <option value="">Tất cả</option>
        </select>
      </div>

      <p style={{ margin: "0 0 14px", color: "var(--bo-muted)", fontSize: 12 }}>
        Bản tiếng Việt là bản GỐC nên không nằm trong hàng đợi này, và ô bản gốc
        bên dưới chỉ để đọc — sửa bản tiếng Việt thì làm ở khu Bệnh lý.
      </p>

      {error && <p className="bo-msg err">{error}</p>}
      {note && <p className="bo-msg ok">{note}</p>}

      {rows.map((row) => {
        const label = STATE_LABEL[row.state];
        const isOpen = openId === row.id;
        return (
          <div className="bo-cite" key={row.id}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <b>{row.nameVi}</b>
                <span>
                  {targetName(row) || "chưa có tên ở ngôn ngữ này"}
                  {row.clinicalSystem ? ` · ${row.clinicalSystem}` : ""} ·{" "}
                  {row.slug}
                </span>
              </div>
              <span className={`bo-tag ${label.tone}`}>{label.text}</span>
              <button
                type="button"
                className="bo-btn small"
                onClick={() => (isOpen ? close() : open(row))}
              >
                {isOpen ? "Đóng" : "Dịch"}
              </button>
            </div>

            {isOpen && (
              <>
                {FIELDS.map(([key, heading]) => (
                  <div
                    key={key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <div className="bo-field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`src-${row.id}-${key}`}>
                        {heading} — bản gốc (chỉ đọc)
                      </label>
                      <textarea
                        id={`src-${row.id}-${key}`}
                        className="bo-textarea"
                        style={{ minHeight: 120, opacity: 0.85 }}
                        readOnly
                        value={row.source?.[key as Field] ?? ""}
                      />
                    </div>
                    <div className="bo-field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`tgt-${row.id}-${key}`}>
                        {heading} — bản {locale}
                      </label>
                      <textarea
                        id={`tgt-${row.id}-${key}`}
                        className="bo-textarea"
                        style={{ minHeight: 120 }}
                        value={draft[key] ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, [key]: event.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}

                <label className="bo-check" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                  Tôi đã đọc lại bản này và chịu trách nhiệm về nội dung
                </label>
                <span>
                  Không tick thì bản này vẫn mang cờ <b>dịch máy</b>, và người
                  đọc ngoài trang vẫn thấy băng cảnh báo.
                </span>

                <footer>
                  <button
                    type="button"
                    className="bo-btn primary"
                    disabled={busy}
                    onClick={() => void save(row)}
                  >
                    {busy ? "Đang lưu…" : `Lưu bản ${locale}`}
                  </button>
                  <button
                    type="button"
                    className="bo-btn"
                    onClick={close}
                  >
                    Huỷ
                  </button>
                </footer>
              </>
            )}
          </div>
        );
      })}

      {loading && <p className="bo-empty">Đang nạp…</p>}
      {!loading && rows.length === 0 && (
        <p className="bo-empty">Không có bài nào khớp bộ lọc này.</p>
      )}

      <div className="bo-pager">
        <button
          type="button"
          className="bo-btn small"
          disabled={page <= 1}
          onClick={() => {
            if(!mayDiscard()) return; setOpenId(null);
            setPage((p) => p - 1);
          }}
        >
          Trước
        </button>
        <span>
          Trang {page}/{lastPage} · {total} bài
        </span>
        <button
          type="button"
          className="bo-btn small"
          disabled={page >= lastPage}
          onClick={() => {
            if(!mayDiscard()) return; setOpenId(null);
            setPage((p) => p + 1);
          }}
        >
          Sau
        </button>
      </div>
    </fieldset>
  );
}
