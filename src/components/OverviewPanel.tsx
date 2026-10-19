"use client";

import type { Attention, AttentionBucket, Overview } from "@/lib/admin";
import type { Jump, TabKey } from "./AdminShell";
import { IcoAlert, IcoCheck, IcoCross } from "./Icons";

const LOCALE_NAME: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
};

const ACTION_NAME: Record<string, string> = {
  draft: 'lưu nháp',
  publish: 'xuất bản',
  restore: 'khôi phục',
  upload: 'tải tệp',
  create: "tạo",
  update: "sửa",
  delete: "xoá",
  verify: "duyệt",
  role_change: "đổi quyền",
  disable: "khoá",
  enable: "mở khoá",
};

/**
 * Khai báo từng thẻ việc-còn-tồn.
 *
 * Chữ nghĩa nằm ở ĐÂY chứ không ở backend: sửa một nhãn thì không việc gì phải
 * deploy lại máy chủ. Backend chỉ trả con số và vài mục mẫu.
 *
 * `tone` là mức nghiêm trọng, và nó khác nhau có lý do:
 * - `bad` cho thứ làm nội dung SAI hoặc không kiểm chứng được (thiếu nguồn,
 *   nguồn không mở được).
 * - `warn` cho việc tồn đọng bình thường (chưa duyệt, chưa dịch).
 * Đánh tất cả thành đỏ thì màu đỏ hết nghĩa.
 */
type CardSpec = {
  key: keyof Attention;
  title: string;
  note: string;
  okTitle: string;
  tone: "bad" | "warn";
  unit: string;
  /** Bấm vào một mục thì đi đâu. */
  target: (id: string) => Jump;
  /** Bấm "xem tất cả" thì mở khu nào. */
  moreTab: TabKey;
};

const CARDS: CardSpec[] = [
  {
    key: "withoutCitation",
    title: "Bệnh lý chưa có nguồn trích dẫn",
    note: "Nội dung y khoa không truy ngược được về tài liệu nào",
    okTitle: "Mọi bệnh lý đều có nguồn trích dẫn",
    tone: "bad",
    unit: "bệnh",
    target: (id) => ({ tab: "pathologies", pathologyId: id }),
    moreTab: "pathologies",
  },
  {
    key: "sourcesAtRisk",
    title: "Tài liệu không mở được để đối chiếu",
    note: "Liên kết chính thức đã hỏng, cần đăng nhập, hoặc sách thương mại",
    okTitle: "Mọi tài liệu đều mở được để đối chiếu",
    tone: "bad",
    unit: "tài liệu",
    target: () => ({ tab: "sources" }),
    moreTab: "sources",
  },
  {
    key: "needsReview",
    title: "Bệnh lý chờ người chuyên môn duyệt",
    note: "Metadata máy dựng từ mục lục, nội dung chưa ai đọc lại",
    okTitle: "Mọi bệnh lý đã được duyệt chuyên môn",
    tone: "warn",
    unit: "bệnh",
    target: (id) => ({ tab: "pathologies", pathologyId: id }),
    moreTab: "pathologies",
  },
  {
    key: "unverifiedCitations",
    title: "Trích dẫn chưa ai đối chiếu với sách",
    note: "Máy nối bệnh với nguồn; chưa có người mở tài liệu ra kiểm",
    okTitle: "Mọi trích dẫn đã được đối chiếu",
    tone: "warn",
    unit: "trích dẫn",
    target: (id) => ({ tab: "pathologies", pathologyId: id }),
    moreTab: "pathologies",
  },
  {
    key: "machineTranslated",
    title: "Bản dịch máy chưa thẩm định",
    note: "Người đọc đang thấy băng cảnh báo trên các bài này",
    okTitle: "Không còn bản dịch máy nào chưa duyệt",
    tone: "warn",
    unit: "bản ghi",
    target: (id) => ({ tab: "pathologies", pathologyId: id }),
    moreTab: "pathologies",
  },
  {
    key: "structuresMissingDescription",
    title: "Cấu trúc thiếu mô tả",
    note: "Chọn trúng trong /viewer nhưng không có gì để đọc",
    okTitle: "Mọi cấu trúc đều có mô tả đủ ba ngôn ngữ",
    tone: "warn",
    unit: "cấu trúc",
    target: () => ({ tab: "anatomy" }),
    moreTab: "anatomy",
  },
  {
    key: "withoutStructure",
    title: "Bệnh lý chưa neo vào cấu trúc 3D",
    note: "Đúng với bệnh toàn thân; sai với bệnh có cơ quan đích rõ ràng",
    okTitle: "Mọi bệnh lý đều đã neo cấu trúc",
    tone: "warn",
    unit: "bệnh",
    target: (id) => ({ tab: "pathologies", pathologyId: id }),
    moreTab: "pathologies",
  },
];

function AlertCard({
  spec,
  bucket,
  onJump,
}: {
  spec: CardSpec;
  bucket: AttentionBucket;
  onJump: (target: Jump) => void;
}) {
  // Hạng mục đã sạch thì thu về MỘT dòng xanh, không giữ nguyên khung to rỗng:
  // chỗ trên màn hình phải dành cho việc còn phải làm.
  if (bucket.total === 0) {
    return (
      <article className="bo-alert ok">
        <header>
          <IcoCheck />
          <div>
            <strong>{spec.okTitle}</strong>
          </div>
        </header>
      </article>
    );
  }

  const rest = bucket.total - bucket.items.length;

  return (
    <article className={`bo-alert ${spec.tone}`}>
      <header>
        <IcoAlert />
        <div>
          <strong>{spec.title}</strong>
          <small>{spec.note}</small>
        </div>
        <span className="bo-badge">{bucket.total}</span>
      </header>
      <ul>
        {bucket.items.map((item, index) => (
          <li key={`${item.id}-${index}`}>
            <IcoCross />
            <div>
              <strong>{item.title}</strong>
              {item.subtitle && <span>{item.subtitle}</span>}
              <button type="button" onClick={() => onJump(spec.target(item.id))}>
                Mở để sửa →
              </button>
            </div>
          </li>
        ))}
      </ul>
      <footer>
        <button type="button" onClick={() => onJump({ tab: spec.moreTab })}>
          {rest > 0
            ? `Xem tất cả (còn ${rest} ${spec.unit} nữa)`
            : `Mở khu để xử lý`}
        </button>
      </footer>
    </article>
  );
}

function Card({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div className="bo-card">
      <small>{label}</small>
      <b>{value.toLocaleString("vi-VN")}</b>
      {note && <i className={tone}>{note}</i>}
    </div>
  );
}

/**
 * Bảng điều khiển.
 *
 * Thứ tự trên màn hình là thứ tự ƯU TIÊN: việc còn tồn trước, số liệu sau. Một
 * trang quản trị mở ra khoe "106 bệnh lý" rồi mới nói bên dưới rằng 106 bài đó
 * chưa ai duyệt thì đã nói ngược — cái người ngồi đây cần thấy đầu tiên là việc
 * còn phải làm.
 */
export default function OverviewPanel({
  data,
  onRefresh,
  onJump,
}: {
  data: Overview | null;
  onRefresh: () => void;
  onJump: (target: Jump) => void;
}) {
  if (!data) return <p className="bo-empty">Đang nạp số liệu…</p>;

  const { content, locales, quality, people, recentAudit, attention } = data;
  const verified = quality.citations - quality.unverifiedCitations;

  // Thẻ có việc lên trước, thẻ đã sạch dồn xuống cuối.
  const cards = [...CARDS].sort(
    (a, b) =>
      (attention[b.key].total > 0 ? 1 : 0) - (attention[a.key].total > 0 ? 1 : 0),
  );
  const openCount = CARDS.filter((c) => attention[c.key].total > 0).length;

  return (
    <>
      <div className="bo-bar">
        <span style={{ color: "var(--bo-muted)" }}>
          {openCount === 0
            ? "Không còn hạng mục nào tồn đọng."
            : `${openCount}/${CARDS.length} hạng mục còn việc phải làm.`}
        </span>
        <button type="button" className="bo-btn small" onClick={onRefresh}>
          Nạp lại
        </button>
      </div>

      <div className="bo-alerts">
        {cards.map((spec) => (
          <AlertCard
            key={spec.key}
            spec={spec}
            bucket={attention[spec.key]}
            onJump={onJump}
          />
        ))}
      </div>

      <section className="bo-section">
        <h2>Quy mô dữ liệu</h2>
        <div className="bo-cards">
          <Card label="Bệnh lý" value={content.pathologies} />
          <Card
            label="Trích dẫn"
            value={quality.citations}
            note={`${verified} đã đối chiếu`}
            tone={quality.unverifiedCitations > 0 ? "warn" : "good"}
          />
          <Card
            label="Cấu trúc giải phẫu"
            value={content.structures}
            note={`${content.systems} hệ · ${content.species} loài`}
          />
          <Card label="Tài liệu y khoa" value={content.sources} />
          <Card
            label="Neo tổn thương 3D"
            value={content.pathologies - quality.pathologiesWithoutLesion}
            note={`${quality.pathologiesWithoutLesion} bệnh chưa neo mesh`}
          />
          <Card
            label="Tài khoản"
            value={people.users}
            note={
              people.disabledUsers > 0
                ? `${people.disabledUsers} đang bị khoá`
                : "không có tài khoản bị khoá"
            }
            tone={people.disabledUsers > 0 ? "warn" : undefined}
          />
          <Card label="Lượt làm bài đã nộp" value={people.attempts} />
          <Card label="Câu hỏi trong DB" value={content.quizQuestions} />
        </div>
      </section>

      <section className="bo-section">
        <h2>Độ phủ nội dung bệnh lý theo ngôn ngữ</h2>
        <div className="bo-cards">
          {locales.map((row) => {
            const percent = content.pathologies
              ? Math.round((row.filled / content.pathologies) * 100)
              : 0;
            return (
              <div className="bo-meter" key={row.locale}>
                <header>
                  <span>{LOCALE_NAME[row.locale] ?? row.locale}</span>
                  <b>
                    {row.filled}/{content.pathologies}
                  </b>
                </header>
                <div>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <small style={{ color: "var(--bo-muted)", fontSize: 11 }}>
                  {row.missing > 0 ? `còn thiếu ${row.missing} bài` : "đủ cả bộ"}
                </small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bo-section">
        <h2>Thao tác gần đây</h2>
        <div className="bo-table-wrap">
          {recentAudit.length === 0 ? (
            <p className="bo-empty">Chưa có thao tác nào được ghi lại.</p>
          ) : (
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Lúc</th>
                  <th>Người làm</th>
                  <th>Việc</th>
                  <th>Đối tượng</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(entry.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td>{entry.actorEmail}</td>
                    <td>
                      <span className="bo-tag">
                        {ACTION_NAME[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td>
                      <strong>{entry.entityLabel ?? entry.entityId}</strong>
                      <em>{entry.entity}</em>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
