"use client";

import { useDirtyGuard } from "@/lib/dirty-guard";
import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  LOCALES,
  type AnatomySystem,
  type Species,
  type StructureRow,
} from "@/lib/admin";
import type { Jump } from "./AdminShell";

type View = "structures" | "systems" | "species";

const LOCALE_NAME: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
};

/**
 * Loài, hệ cơ quan và cấu trúc giải phẫu.
 *
 * Gộp ba thực thể vào MỘT tab với ba khung nhìn, không tách thành ba tab riêng:
 * chúng là ba tầng của cùng một cây (loài → hệ → cấu trúc) và người soạn đi
 * xuống theo cây chứ không nhảy ngang. Bấm số cấu trúc ở một hệ là sang thẳng
 * danh sách cấu trúc đã lọc theo hệ đó.
 */
export default function AnatomyPanel({
  jump,
  onJumpDone,
}: {
  /** Yêu cầu lọc sẵn theo một mã cấu trúc, từ thanh tìm kiếm. */
  jump: Jump | null;
  onJumpDone: () => void;
}) {
  const [view, setView] = useState<View>("structures");
  const [species, setSpecies] = useState<Species[]>([]);
  const [systems, setSystems] = useState<AnatomySystem[]>([]);

  const [rows, setRows] = useState<StructureRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [speciesId, setSpeciesId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [missing, setMissing] = useState("");
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

  const loadRefs = useCallback(async () => {
    await Promise.resolve();
    try {
      const [sp, sy] = await Promise.all([
        adminApi.species(),
        adminApi.systems({}),
      ]);
      setSpecies(sp);
      setSystems(sy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không nạp được loài và hệ");
    }
  }, []);

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
      const result = await adminApi.structures({
        q: search,
        speciesId,
        systemId,
        missingDescription: missing,
        page,
      });
      if (!isCurrent()) return;
      setRows(result.items);
      setTotal(result.total);
      setPageSize(result.pageSize);
      setError("");
    } catch (e) {
      if (isCurrent()) {
          setError(e instanceof Error ? e.message : "Không nạp được cấu trúc");
        }
    } finally {
      if (isCurrent()) setLoading(false);
    }
    },
    [search, speciesId, systemId, missing, page],
  );

  useEffect(() => {
    async function run() {
      await Promise.resolve();
      await loadRefs();
    }
    void run();
  }, [loadRefs]);

  useEffect(() => {
    if (view !== "structures") return;
    let alive = true;
    async function run() {
      await Promise.resolve();
      await load(() => alive);
    }
    void run();
    return () => {
      alive = false;
    };
  }, [view, load]);

  /* Đặt sẵn từ khoá tìm rồi xoá yêu cầu ngay, cùng lý do với `PathologyPanel`. */
  useEffect(() => {
    if (jump?.tab !== "anatomy" || !("structureQuery" in jump)) return;
    const text = jump.structureQuery;
    // Nhường một nhịp và bọc trong hàm async khai tại chỗ: gọi setState đồng bộ
    // trong thân effect thì React Compiler báo "cascading renders". Cùng khuôn
    // với các effect nạp dữ liệu ở panel này.
    async function run() {
      await Promise.resolve();
      setView("structures");
      setQ(text);
      setSearch(text);
      setPage(1);
      onJumpDone();
    }
    void run();
  }, [jump, onJumpDone]);

  const changeFilter = (apply: () => void) => {
    if(!mayDiscard()) return; setEditing(null); apply();
    setPage(1);
  };

  const act = async (run: () => Promise<unknown>, ok: string) => {
    if(mutating) return; setMutating(true);
    setError("");
    setNote("");
    try {
      await run();
      setNote(ok);
      setEditing(null);
      setDraft({});
      await Promise.all([load(), loadRefs()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {setMutating(false);}
  };

  /** Ô nhập của khung sửa tại chỗ. */
  const field = (key: string, label: string, long = false) => (
    <div className="bo-field" key={key}>
      <label htmlFor={`a-${key}`}>{label}</label>
      {long ? (
        <textarea
          id={`a-${key}`}
          className="bo-textarea"
          style={{ minHeight: 74 }}
          value={draft[key] ?? ""}
          onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
        />
      ) : (
        <input
          id={`a-${key}`}
          className="bo-input"
          value={draft[key] ?? ""}
          onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
        />
      )}
    </div>
  );

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const systemsOfSpecies = speciesId
    ? systems.filter((s) => s.species.id === speciesId)
    : systems;

  return (
    <fieldset disabled={mutating} style={{border:0,padding:0,margin:0,minWidth:0}}>
      <div className="bo-locale-tabs">
        {(
          [
            ["structures", "Cấu trúc"],
            ["systems", "Hệ cơ quan"],
            ["species", "Loài"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={view === key ? "is-on" : ""}
            onClick={() => {if(mayDiscard()){setEditing(null);setView(key);}}}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="bo-msg err">{error}</p>}
      {note && <p className="bo-msg ok">{note}</p>}

      {view === "structures" && (
        <>
          <div className="bo-bar">
            <form
              className="grow"
              onSubmit={(event) => {
                event.preventDefault();
                changeFilter(() => setSearch(q.trim()));
              }}
            >
              <input
                className="bo-input"
                placeholder="Tìm theo tên, mã, tên Latin hoặc tên mesh…"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </form>
            <select
              className="bo-select"
              style={{ width: "auto" }}
              value={speciesId}
              onChange={(event) =>
                changeFilter(() => {
                  setSpeciesId(event.target.value);
                  // Hệ đang chọn có thể không thuộc loài mới — bỏ luôn, nếu
                  // không thì bộ lọc chồng nhau và ra danh sách trống.
                  setSystemId("");
                })
              }
            >
              <option value="">Mọi loài</option>
              {species.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameVi} ({s.structures})
                </option>
              ))}
            </select>
            <select
              className="bo-select"
              style={{ width: "auto" }}
              value={systemId}
              onChange={(event) =>
                changeFilter(() => setSystemId(event.target.value))
              }
            >
              <option value="">Mọi hệ</option>
              {systemsOfSpecies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameVi} ({s.structures})
                </option>
              ))}
            </select>
            <select
              className="bo-select"
              style={{ width: "auto" }}
              value={missing}
              onChange={(event) =>
                changeFilter(() => setMissing(event.target.value))
              }
            >
              <option value="">Mọi mô tả</option>
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  Chưa có mô tả {locale}
                </option>
              ))}
            </select>
          </div>

          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Cấu trúc</th>
                  <th>Hệ · Loài</th>
                  <th>Mô tả</th>
                  <th>Liên quan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) =>
                  editing === row.id ? (
                    <tr key={row.id}>
                      <td colSpan={5}>
                        <p
                          style={{
                            margin: "0 0 12px",
                            color: "var(--bo-muted)",
                            fontSize: 11.5,
                          }}
                        >
                          Mã <code>{row.code}</code>
                          {row.meshName ? (
                            <>
                              {" "}
                              · mesh <code>{row.meshName}</code>
                            </>
                          ) : (
                            " · chưa gắn mesh"
                          )}{" "}
                          — hai trường này không sửa được ở đây vì phải khớp đúng
                          tên trong file glTF, gác bởi{" "}
                          <code>npm run verify:scenes</code>.
                        </p>
                        {field("nameVi", "Tên tiếng Việt")}
                        {field("nameEn", "Tên tiếng Anh")}
                        {field("nameZh", "Tên tiếng Trung")}
                        {field("latin", "Tên Latin (TA2)")}
                        {field("taCode", "Mã Terminologia Anatomica")}
                        {field("descriptionVi", "Mô tả tiếng Việt", true)}
                        {field("descriptionEn", "Mô tả tiếng Anh", true)}
                        {field("descriptionZh", "Mô tả tiếng Trung", true)}
                        <div className="bo-bar">
                          <button
                            type="button"
                            className="bo-btn primary"
                            onClick={() =>
                              act(
                                () =>
                                  adminApi.updateStructure(row.id, {expectedRevision,
                                    nameVi: draft.nameVi,
                                    nameEn: draft.nameEn,
                                    nameZh: draft.nameZh,
                                    latin: draft.latin || null,
                                    taCode: draft.taCode || null,
                                    descriptionVi: draft.descriptionVi,
                                    descriptionEn: draft.descriptionEn,
                                    descriptionZh: draft.descriptionZh,
                                  }),
                                `Đã lưu ${row.code}.`,
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
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.nameVi}</strong>
                        <em>{row.nameEn}</em>
                        {row.latin && <em>{row.latin}</em>}
                        <em>
                          {row.code}
                          {row.taCode ? ` · TA ${row.taCode}` : ""}
                        </em>
                      </td>
                      <td>
                        {row.system.nameVi}
                        <em>{row.species.nameVi}</em>
                        {row.parent && <em>trong {row.parent.nameVi}</em>}
                      </td>
                      <td>
                        <div className="bo-tags">
                          {LOCALES.map((locale) => {
                            const key = `description${locale === "vi" ? "Vi" : locale === "en" ? "En" : "Zh"}` as const;
                            const has = Boolean(row[key]);
                            return (
                              <span
                                key={locale}
                                className={`bo-tag ${has ? "good" : "bad"}`}
                                title={
                                  has
                                    ? `Đã có mô tả ${LOCALE_NAME[locale]}`
                                    : `Chưa có mô tả ${LOCALE_NAME[locale]}`
                                }
                              >
                                {locale}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <em>{row.children} cấu trúc con</em>
                        <em>{row.pathologies} bệnh lý</em>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="bo-btn small"
                          onClick={() => {
                            if(!mayDiscard()) return; setEditing(row.id); setExpectedRevision(row.revision);
                            beginDraft({
                              nameVi: row.nameVi,
                              nameEn: row.nameEn,
                              nameZh: row.nameZh,
                              latin: row.latin ?? "",
                              taCode: row.taCode ?? "",
                              descriptionVi: row.descriptionVi ?? "",
                              descriptionEn: row.descriptionEn ?? "",
                              descriptionZh: row.descriptionZh ?? "",
                            });
                          }}
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
            {loading && <p className="bo-empty">Đang nạp…</p>}
            {!loading && rows.length === 0 && (
              <p className="bo-empty">Không có cấu trúc nào khớp bộ lọc.</p>
            )}
          </div>

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
              Trang {page}/{lastPage} · {total} cấu trúc
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
        </>
      )}

      {view === "systems" && (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>Hệ cơ quan</th>
                <th>Loài</th>
                <th>Thứ tự</th>
                <th>Nội dung</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {systems.map((row) =>
                editing === row.id ? (
                  <tr key={row.id}>
                    <td colSpan={5}>
                      <p
                        style={{
                          margin: "0 0 12px",
                          color: "var(--bo-muted)",
                          fontSize: 11.5,
                        }}
                      >
                        Mã <code>{row.code}</code> — không sửa được, mọi thứ
                        đang trỏ tới hệ này dùng chính mã đó.
                      </p>
                      {field("nameVi", "Tên tiếng Việt")}
                      {field("nameEn", "Tên tiếng Anh")}
                      {field("nameZh", "Tên tiếng Trung")}
                      {field("latin", "Tên Latin")}
                      {field("order", "Thứ tự hiển thị")}
                      <div className="bo-bar">
                        <button
                          type="button"
                          className="bo-btn primary"
                          onClick={() =>
                            act(
                              () =>
                                adminApi.updateSystem(row.id, {expectedRevision,
                                  nameVi: draft.nameVi,
                                  nameEn: draft.nameEn,
                                  nameZh: draft.nameZh,
                                  latin: draft.latin || null,
                                  order: Number(draft.order) || 0,
                                }),
                              `Đã lưu ${row.code}.`,
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
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.nameVi}</strong>
                      <em>{row.nameEn}</em>
                      {row.latin && <em>{row.latin}</em>}
                      <em>{row.code}</em>
                    </td>
                    <td>{row.species.nameVi}</td>
                    <td>{row.order}</td>
                    <td>
                      <button
                        type="button"
                        className="bo-drill"
                        onClick={() => {
                          setSpeciesId(row.species.id);
                          setSystemId(row.id);
                          setPage(1);
                          if(!mayDiscard()) return; setEditing(null);setView("structures");
                        }}
                      >
                        {row.structures} cấu trúc →
                      </button>
                      <em>{row.quizzes} câu hỏi</em>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="bo-btn small"
                        onClick={() => {
                          if(!mayDiscard()) return; setEditing(row.id); setExpectedRevision(row.revision);
                            beginDraft({
                            nameVi: row.nameVi,
                            nameEn: row.nameEn,
                            nameZh: row.nameZh,
                            latin: row.latin ?? "",
                            order: String(row.order),
                          });
                        }}
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {systems.length === 0 && <p className="bo-empty">Chưa có hệ nào.</p>}
        </div>
      )}

      {view === "species" && (
        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th>Loài</th>
                <th>Tên Latin</th>
                <th>Nội dung</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {species.map((row) =>
                editing === row.id ? (
                  <tr key={row.id}>
                    <td colSpan={4}>
                      <p
                        style={{
                          margin: "0 0 12px",
                          color: "var(--bo-muted)",
                          fontSize: 11.5,
                        }}
                      >
                        Mã <code>{row.code}</code> — không sửa được.
                      </p>
                      {field("nameVi", "Tên tiếng Việt")}
                      {field("nameEn", "Tên tiếng Anh")}
                      {field("nameZh", "Tên tiếng Trung")}
                      {field("latin", "Tên Latin")}
                      <div className="bo-bar">
                        <button
                          type="button"
                          className="bo-btn primary"
                          onClick={() =>
                            act(
                              () =>
                                adminApi.updateSpecies(row.id, {expectedRevision,
                                  nameVi: draft.nameVi,
                                  nameEn: draft.nameEn,
                                  nameZh: draft.nameZh,
                                  latin: draft.latin || null,
                                }),
                              `Đã lưu ${row.code}.`,
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
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.nameVi}</strong>
                      <em>
                        {row.nameEn} · {row.nameZh}
                      </em>
                      <em>{row.code}</em>
                    </td>
                    <td>
                      <em>{row.latin ?? "—"}</em>
                    </td>
                    <td>
                      <em>{row.systems} hệ cơ quan</em>
                      <button
                        type="button"
                        className="bo-drill"
                        onClick={() => {
                          setSpeciesId(row.id);
                          setSystemId("");
                          setPage(1);
                          if(!mayDiscard()) return; setEditing(null);setView("structures");
                        }}
                      >
                        {row.structures} cấu trúc →
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="bo-btn small"
                        onClick={() => {
                          if(!mayDiscard()) return; setEditing(row.id); setExpectedRevision(row.revision);
                            beginDraft({
                            nameVi: row.nameVi,
                            nameEn: row.nameEn,
                            nameZh: row.nameZh,
                            latin: row.latin ?? "",
                          });
                        }}
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {species.length === 0 && <p className="bo-empty">Chưa có loài nào.</p>}
        </div>
      )}
    </fieldset>
  );
}
