"use client";

import { clinicalDraft, draftChanged, mergeClinicalDrafts, type ClinicalDraft } from '@/lib/pathology-drafts';
import { useDirtyGuard } from "@/lib/dirty-guard";
import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  LOCALES,
  type Locale3,
  type MedicalSource,
  type PathologyContent,
  type PathologyDetail,
} from "@/lib/admin";
import { SITE_URL } from "@/lib/auth";

/** Năm mục nội dung của một bài bệnh học, đúng thứ tự trang bệnh lý hiển thị. */
const FIELDS: {
  key: keyof Omit<PathologyContent, "id" | "locale" | "machineTranslated" | "revision">;
  label: string;
}[] = [
  { key: "description", label: "Đại cương" },
  { key: "clinical", label: "Lâm sàng & cận lâm sàng" },
  { key: "imaging", label: "Chẩn đoán hình ảnh" },
  { key: "progression", label: "Tiến triển & biến chứng" },
  { key: "treatment", label: "Điều trị tham khảo" },
];

/** Bản nháp của MỘT ngôn ngữ: năm ô chữ, cộng cờ dịch máy. */
type TextField = (typeof FIELDS)[number]["key"];
type Draft = ClinicalDraft;
const emptyDraft = () => clinicalDraft();
function toDraft(content:PathologyContent|undefined):Draft { return clinicalDraft(content ? {...content,description:content.description??'',clinical:content.clinical??'',imaging:content.imaging??'',progression:content.progression??'',treatment:content.treatment??''} : undefined); }

/**
 * Ngăn soạn một bài bệnh học.
 *
 * Bản nháp giữ RIÊNG cho từng ngôn ngữ và chỉ gửi đi khi bấm lưu: đổi tab ngôn
 * ngữ giữa chừng mà mất chữ đang gõ là mất công của người soạn, còn tự lưu theo
 * từng phím thì mỗi lần gõ lại đẻ ra một dòng nhật ký vô nghĩa.
 */
export default function PathologyDrawer({
  id,
  canReview,
  onClose,
  onSaved,
}: {
  id: string;
  canReview: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<PathologyDetail | null>(null);
  const [locale, setLocale] = useState<Locale3>("vi");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [sources, setSources] = useState<MedicalSource[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  /**
   * Bản nháp phần THUỘC TÍNH (tên, ICD, mức độ…), tách khỏi nháp nội dung.
   *
   * `null` = chưa mở khung sửa. Không đổ sẵn từ `data` ngay khi nạp: mở bài nào
   * cũng thấy một loạt ô nhập là mời gõ nhầm, mà ở đây gõ nhầm là sai dữ liệu y
   * khoa chứ không phải sai một cái nhãn.
   */
  const [meta, setMeta] = useState<{
    nameVi: string;
    nameEn: string;
    nameZh: string;
    icdCode: string;
    severity: string;
    clinicalSystem: string;
    source: string;
    sourcePage: string;
  } | null>(null);

  /** Mã cấu trúc đang gõ ở ô neo. `null` = chưa mở ô. */
  const [linkCode, setLinkCode] = useState<string | null>(null);

  /** Mã cấu trúc đang gõ ở ô thêm cấu trúc phụ. */
  const [relatedCode, setRelatedCode] = useState("");

  const [citeSource, setCiteSource] = useState("");
  const [citePage, setCitePage] = useState("");
  const [citeQuote, setCiteQuote] = useState("");

  const [metaRevision,setMetaRevision] = useState('');
  const dirty = Object.values(drafts).some(draftChanged) || meta !== null || linkCode !== null || !!relatedCode || !!citeSource || !!citePage || !!citeQuote;
  const mayDiscard = useDirtyGuard(dirty,saving);
  const close = useCallback(()=>{ if(mayDiscard()) onClose(); },[mayDiscard,onClose]);
  const load = useCallback(async (savedLocale?: string) => {
    // Nhường một nhịp trước khi chạm vào state, đúng quy ước đã dùng ở
    // `HomeNav`: gọi setState ĐỒNG BỘ trong thân effect thì React Compiler báo
    // lỗi "cascading renders", và cảnh báo đó đúng — lần dựng đầu sẽ render hai
    // lượt liền.
    await Promise.resolve();
    try {
      const detail = await adminApi.pathology(id);
      setData(detail);
      setError("");
      setDrafts(current=>mergeClinicalDrafts(current,Object.fromEntries(LOCALES.map(lang=>[lang,toDraft(detail.content.find(c=>c.locale===lang))])),savedLocale));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không nạp được bệnh lý");
    }
  }, [id]);

  useEffect(() => {
    // Bọc trong một hàm async khai ngay trong effect và nhường một nhịp trước
    // khi gọi: gọi thẳng `load()` thì React Compiler coi là setState đồng bộ
    // trong effect và báo lỗi "cascading renders". Cùng khuôn với `HomeNav`.
    async function run() {
      await Promise.resolve();
      await load();
    }
    void run();
  }, [load]);

  useEffect(() => {
    adminApi
      .sources()
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  // Escape để đóng: người soạn dùng bàn phím là chính, với tay ra chuột để đóng
  // một ngăn là quãng đường thừa lặp lại vài trăm lần một buổi.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!data) {
    return (
      <div className="bo-drawer">
        <button disabled={saving} type="button" aria-label="Đóng" onClick={close} />
        <section>
          <header>
            <h2>{error ? "Lỗi" : "Đang nạp…"}</h2>
          </header>
          <div className="bo-body">
            {error && <p className="bo-msg err">{error}</p>}
          </div>
        </section>
      </div>
    );
  }

  const draft = drafts[locale] ?? emptyDraft();
  const setText = (key: TextField, value: string) =>
    !saving && setDrafts((all) => ({ ...all, [locale]: { ...draft, [key]: value } }));
  const setMachine = (value: boolean) =>
    !saving && setDrafts((all) => ({
      ...all,
      [locale]: { ...draft, machineTranslated: value },
    }));

  const saveContent = async () => {
    if(saving)return; setSaving(true);
    setError("");
    setNote("");
    try {
      await adminApi.saveContent(id, locale, {
        expectedRevision: draft.expectedRevision,
        description: draft.description,
        clinical: draft.clinical,
        imaging: draft.imaging,
        progression: draft.progression,
        treatment: draft.treatment,
        machineTranslated: draft.machineTranslated,
      });
      setNote(`Đã lưu bản ${locale}.`);
      await load(locale);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const act = async (run: () => Promise<unknown>, ok: string) => {
    if(saving) return; setSaving(true);
    setError("");
    setNote("");
    try {
      await run();
      setNote(ok);
      await load();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác không thành công");
    } finally {setSaving(false);}
  };

  return (
    <div className="bo-drawer">
      <button disabled={saving} type="button" aria-label="Đóng" onClick={close} />
      <section>
        <header>
          <div>
            <h2>{data.nameVi}</h2>
            <p>
              {data.slug}
              {data.icdCode ? ` · ICD ${data.icdCode}` : ""}
              {data.clinicalSystem ? ` · ${data.clinicalSystem}` : ""}
            </p>
          </div>
          <button disabled={saving} type="button" className="bo-btn small" onClick={close}>
            Đóng
          </button>
        </header>

        <div className="bo-body">
          {error && <p className="bo-msg err">{error}</p>}
          {note && <p className="bo-msg ok">{note}</p>}

          <div className="bo-bar">
            <span
              className={`bo-tag ${data.needsReview ? "warn" : "good"}`}
              style={{ padding: "6px 10px" }}
            >
              {data.needsReview ? "Chưa có người duyệt" : "Đã duyệt chuyên môn"}
            </span>
            {canReview && (
              <button disabled={saving}
                type="button"
                className="bo-btn small"
                onClick={() =>
                  act(
                    () => adminApi.setReviewed(id, !data.needsReview, data.reviewRevision),
                    data.needsReview
                      ? "Đã đánh dấu duyệt."
                      : "Đã trả về hàng chờ duyệt.",
                  )
                }
              >
                {data.needsReview ? "Đánh dấu đã duyệt" : "Trả về chờ duyệt"}
              </button>
            )}
            {/* URL TUYỆT ĐỐI sang trang ngoài: back office là ứng dụng riêng,
                đường dẫn tương đối `/benh-ly` sẽ trỏ vào chính nó và ra 404. */}
            <a
              className="bo-btn small"
              href={`${SITE_URL}/benh-ly?slug=${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem ngoài trang
            </a>
          </div>

          <section className="bo-section" style={{ marginTop: 8 }}>
            <h2>Thuộc tính bài bệnh</h2>
            {meta === null ? (
              <div className="bo-cite">
                <span>
                  Mức độ: <b>{data.severity ?? "chưa đặt"}</b> · ICD:{" "}
                  <b>{data.icdCode ?? "chưa có"}</b> · Hệ lâm sàng:{" "}
                  <b>{data.clinicalSystem ?? "chưa xếp"}</b>
                </span>
                <span>
                  Nguồn: {data.source}
                  {data.sourcePage ? ` · tr. ${data.sourcePage}` : ""}
                </span>
                <span>
                  Neo tổn thương 3D:{" "}
                  <b>{data.lesionMesh ?? "chưa neo"}</b>
                  {data.lesionSystem ? ` (${data.lesionSystem})` : ""} — chỉ sửa
                  được bằng dữ liệu nguồn rồi chạy <code>npm run verify:lesions</code>,
                  vì tên mesh phải khớp đúng model glTF.
                </span>
                <span>
                  Cấu trúc giải phẫu:{" "}
                  <b>
                    {data.structure
                      ? `${data.structure.nameVi} (${data.structure.code})`
                      : "chưa neo"}
                  </b>
                  {" — "}
                  <button disabled={saving}
                    type="button"
                    className="bo-btn small"
                    onClick={() => setLinkCode(data.structure?.code ?? "")}
                  >
                    Đổi
                  </button>
                </span>
                {linkCode !== null && (
                  <div className="bo-field" style={{ marginTop: 4 }}>
                    <label htmlFor="p-link">Mã cấu trúc</label>
                    <input disabled={saving}
                      id="p-link"
                      className="bo-input"
                      placeholder="ví dụ giai-phau-tim — để trống là bỏ neo"
                      value={linkCode}
                      onChange={(event) => setLinkCode(event.target.value)}
                    />
                    <p
                      style={{
                        margin: "2px 0 6px",
                        color: "var(--bo-muted)",
                        fontSize: 11.5,
                      }}
                    >
                      Để TRỐNG là bỏ neo, và đó là lựa chọn đúng với bệnh không
                      thuộc về một cấu trúc đơn lẻ nào — sốc, rối loạn kali máu,
                      bệnh huyết học. Neo bừa vào một cơ quan tệ hơn để trống.
                      Tra mã ở tab Giải phẫu.
                    </p>
                    <div className="bo-bar">
                      <button disabled={saving}
                        type="button"
                        className="bo-btn primary"
                        onClick={() =>
                          act(async () => {
                            await adminApi.linkStructure(
                              id,
                              linkCode.trim() || null,
                              data.revision,
                            );
                            setLinkCode(null);
                          }, "Đã cập nhật cấu trúc.")
                        }
                      >
                        Lưu
                      </button>
                      <button disabled={saving}
                        type="button"
                        className="bo-btn"
                        onClick={() => setLinkCode(null)}
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                )}
                <footer>
                  <button disabled={saving}
                    type="button"
                    className="bo-btn small"
                    onClick={() =>
                      {setMetaRevision(data.revision); setMeta({
                        nameVi: data.nameVi,
                        nameEn: data.nameEn,
                        nameZh: data.nameZh,
                        icdCode: data.icdCode ?? "",
                        severity: data.severity ?? "",
                        clinicalSystem: data.clinicalSystem ?? "",
                        source: data.source,
                        sourcePage: data.sourcePage?.toString() ?? "",
                      });}
                    }
                  >
                    Sửa thuộc tính
                  </button>
                </footer>
              </div>
            ) : (
              <div className="bo-cite">
                {(
                  [
                    ["nameVi", "Tên tiếng Việt"],
                    ["nameEn", "Tên tiếng Anh"],
                    ["nameZh", "Tên tiếng Trung"],
                    ["icdCode", "Mã ICD-11"],
                    ["clinicalSystem", "Hệ lâm sàng"],
                    ["source", "Nguồn (chữ)"],
                    ["sourcePage", "Trang nguồn"],
                  ] as const
                ).map(([key, label]) => (
                  <div className="bo-field" key={key}>
                    <label htmlFor={`m-${key}`}>{label}</label>
                    <input disabled={saving}
                      id={`m-${key}`}
                      className="bo-input"
                      value={meta[key]}
                      onChange={(event) =>
                        setMeta({ ...meta, [key]: event.target.value })
                      }
                    />
                  </div>
                ))}
                <div className="bo-field">
                  <label htmlFor="m-severity">Mức độ ưu tiên hiển thị</label>
                  <select disabled={saving}
                    id="m-severity"
                    className="bo-select"
                    value={meta.severity}
                    onChange={(event) =>
                      setMeta({ ...meta, severity: event.target.value })
                    }
                  >
                    <option value="">— chưa đặt —</option>
                    <option value="info">info — thông tin</option>
                    <option value="warning">warning — cần lưu ý</option>
                    <option value="critical">critical — nguy kịch</option>
                  </select>
                </div>
                <footer>
                  <button disabled={saving}
                    type="button"
                    className="bo-btn primary"
                    onClick={() =>
                      act(async () => {
                        await adminApi.updatePathology(id, {
                          expectedRevision: metaRevision,
                          nameVi: meta.nameVi,
                          nameEn: meta.nameEn,
                          nameZh: meta.nameZh,
                          // Ô để trống nghĩa là "không có", gửi `undefined` thì
                          // DTO bỏ qua và giá trị cũ ở lại — người sửa tưởng đã
                          // xoá mà thực ra chưa.
                          icdCode: meta.icdCode.trim() || null,
                          severity:
                            (meta.severity as PathologyDetail["severity"]) ||
                            null,
                          clinicalSystem:
                            meta.clinicalSystem.trim() || null,
                          source: meta.source,
                          sourcePage: meta.sourcePage
                            ? Number(meta.sourcePage)
                            : null,
                        });
                        setMeta(null);
                      }, "Đã lưu thuộc tính.")
                    }
                  >
                    Lưu thuộc tính
                  </button>
                  <button disabled={saving}
                    type="button"
                    className="bo-btn"
                    onClick={() => {if(mayDiscard()) setMeta(null);}}
                  >
                    Huỷ
                  </button>
                </footer>
              </div>
            )}
          </section>

          <section className="bo-section">
            <h2>Nội dung theo ngôn ngữ</h2>
            <div className="bo-locale-tabs">
              {LOCALES.map((l) => {
                const existing = data.content.find((c) => c.locale === l);
                return (
                  <button disabled={saving}
                    key={l}
                    type="button"
                    className={l === locale ? "is-on" : ""}
                    onClick={() => setLocale(l)}
                  >
                    {l}
                    <span
                      className={`bo-tag ${
                        !existing
                          ? "bad"
                          : existing.machineTranslated
                            ? "warn"
                            : "good"
                      }`}
                    >
                      {!existing
                        ? "trống"
                        : existing.machineTranslated
                          ? "dịch máy"
                          : "đã soạn"}
                    </span>
                  </button>
                );
              })}
            </div>

            {draft.expectedRevision !== (data.content.find(c=>c.locale===locale)?.revision??'missing') && <div className="bo-msg warn"><p>Bản trên máy chủ đã thay đổi. Phần đang nhập được giữ nguyên.</p><details><summary>Đọc bản mới trên máy chủ</summary>{FIELDS.map(field=><div key={field.key}><b>{field.label}</b><p style={{whiteSpace:'pre-wrap'}}>{data.content.find(c=>c.locale===locale)?.[field.key]??'—'}</p></div>)}</details><button className="bo-btn" disabled={saving} onClick={()=>{if(window.confirm('Bạn đã đối chiếu và muốn lưu phần đang nhập thay cho bản mới trên máy chủ?'))setDrafts(all=>({...all,[locale]:{...draft,expectedRevision:data.content.find(c=>c.locale===locale)?.revision??'missing'}}));}}>Đã đối chiếu, giữ phần đang nhập</button></div>}
            <button className="bo-btn small" disabled={saving} onClick={()=>void load()}>Tải bản mới để đối chiếu</button>
            {FIELDS.map((field) => (
              <div className="bo-field" key={field.key}>
                <label htmlFor={`f-${field.key}`}>{field.label}</label>
                <textarea
                  id={`f-${field.key}`}
                  className="bo-textarea"
                  disabled={saving}
                  value={draft[field.key]}
                  onChange={(event) => setText(field.key, event.target.value)}
                />
              </div>
            ))}

            <label className="bo-check">
              <input disabled={saving}
                type="checkbox"
                checked={draft.machineTranslated}
                onChange={(event) => setMachine(event.target.checked)}
              />
              Đây là bản dịch máy chưa có người chuyên môn duyệt
            </label>
            <p
              style={{
                margin: "6px 0 12px",
                color: "var(--bo-muted)",
                fontSize: 11.5,
              }}
            >
              Cờ này đi thẳng ra băng cảnh báo mà người đọc nhìn thấy. Chỉ bỏ
              tick khi đã thật sự đọc lại và chịu trách nhiệm về nội dung.
            </p>

            <button
              type="button"
              className="bo-btn primary"
              disabled={saving}
              onClick={saveContent}
            >
              {saving ? "Đang lưu…" : `Lưu bản ${locale}`}
            </button>
          </section>

          <section className="bo-section">
            <h2>Cấu trúc phụ bị ảnh hưởng ({data.relatedStructures.length})</h2>
            <div className="bo-cite">
              <span>
                Dành cho bệnh tổn thương ĐA CƠ QUAN — lupus, suy tim, đái tháo
                đường. Cấu trúc chính đặt ở phần thuộc tính bên trên; danh sách
                này là các cơ quan còn lại.
              </span>
              {data.relatedStructures.length > 0 && (
                <div className="bo-tags" style={{ flexDirection: "column", gap: 6 }}>
                  {data.relatedStructures.map(({ structure }) => (
                    <div
                      key={structure.id}
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span style={{ fontSize: 12.5 }}>
                        <b>{structure.nameVi}</b> <code>{structure.code}</code>
                      </span>
                      <button disabled={saving}
                        type="button"
                        className="bo-btn small danger"
                        onClick={() =>
                          act(
                            () =>
                              adminApi.removeRelatedStructure(id, structure.id),
                            `Đã bỏ ${structure.code}.`,
                          )
                        }
                      >
                        Bỏ
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form
                style={{ display: "flex", gap: 8 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!relatedCode.trim()) return;
                  void act(async () => {
                    await adminApi.addRelatedStructure(id, relatedCode.trim());
                    setRelatedCode("");
                  }, "Đã thêm cấu trúc phụ.");
                }}
              >
                <input disabled={saving}
                  className="bo-input"
                  placeholder="Mã cấu trúc, tra ở tab Giải phẫu"
                  value={relatedCode}
                  onChange={(event) => setRelatedCode(event.target.value)}
                />
                <button disabled={saving} type="submit" className="bo-btn">
                  Thêm
                </button>
              </form>
            </div>
          </section>

          <section className="bo-section">
            <h2>Trích dẫn ({data.citations.length})</h2>
            {data.citations.map((cite) => (
              <div className="bo-cite" key={cite.id}>
                <b>{cite.source.title}</b>
                <span>
                  {cite.source.publisher}
                  {cite.source.year ? ` · ${cite.source.year}` : ""}
                  {cite.pageOrSection ? ` · ${cite.pageOrSection}` : ""}
                </span>
                {cite.quote && <blockquote>{cite.quote}</blockquote>}
                <footer>
                  <span className={`bo-tag ${cite.verified ? "good" : "warn"}`}>
                    {cite.verified
                      ? `đã đối chiếu — ${cite.verifiedBy}`
                      : "chưa ai đối chiếu"}
                  </span>
                  {canReview && (
                    <>
                      <button disabled={saving}
                        type="button"
                        className="bo-btn small"
                        onClick={() =>
                          act(
                            () =>
                              adminApi.verifyCitation(cite.id, !cite.verified),
                            cite.verified
                              ? "Đã bỏ dấu đối chiếu."
                              : "Đã ghi nhận đối chiếu.",
                          )
                        }
                      >
                        {cite.verified ? "Bỏ đối chiếu" : "Xác nhận đã đối chiếu"}
                      </button>
                      <button disabled={saving}
                        type="button"
                        className="bo-btn small danger"
                        onClick={() => {
                          if (!confirm("Xoá trích dẫn này?")) return;
                          void act(
                            () => adminApi.removeCitation(cite.id),
                            "Đã xoá trích dẫn.",
                          );
                        }}
                      >
                        Xoá
                      </button>
                    </>
                  )}
                </footer>
              </div>
            ))}

            <form
              className="bo-cite"
              onSubmit={(event) => {
                event.preventDefault();
                if (!citeSource) return;
                void act(async () => {
                  await adminApi.addCitation(id, {
                    sourceId: citeSource,
                    pageOrSection: citePage || undefined,
                    quote: citeQuote || undefined,
                  });
                  setCiteSource("");
                  setCitePage("");
                  setCiteQuote("");
                }, "Đã thêm trích dẫn.");
              }}
            >
              <b>Thêm trích dẫn</b>
              <select disabled={saving}
                className="bo-select"
                value={citeSource}
                onChange={(event) => setCiteSource(event.target.value)}
                required
              >
                <option value="">— chọn tài liệu —</option>
                {sources.filter(source=>source.status!=='archived').map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                    {source.year ? ` (${source.year})` : ""}
                  </option>
                ))}
              </select>
              <input disabled={saving}
                className="bo-input"
                placeholder='Trang hoặc mục, ví dụ "tr. 214"'
                value={citePage}
                onChange={(event) => setCitePage(event.target.value)}
              />
              <textarea disabled={saving}
                className="bo-textarea"
                style={{ minHeight: 64 }}
                placeholder="Trích nguyên văn để người sau đối chiếu (không bắt buộc)"
                value={citeQuote}
                onChange={(event) => setCiteQuote(event.target.value)}
              />
              <div>
                <button disabled={saving} type="submit" className="bo-btn">
                  Thêm
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </div>
  );
}
