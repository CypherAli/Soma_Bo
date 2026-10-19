"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type SystemStatus } from "@/lib/admin";
import { API_URL, SITE_URL } from "@/lib/auth";

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

function duration(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
}

function Row({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
  note?: string;
}) {
  return (
    <tr>
      <td>
        <strong>{label}</strong>
        {note && <em>{note}</em>}
      </td>
      <td>
        {tone ? <span className={`bo-tag ${tone}`}>{value}</span> : value}
      </td>
    </tr>
  );
}

/**
 * Tình trạng hệ thống.
 *
 * Kiểm những phụ thuộc NGOÀI cơ sở dữ liệu, vì đó là những thứ hỏng mà không ai
 * biết: chỉ số tri thức y khoa là một tệp trên đĩa, khoá LLM là một biến môi
 * trường. Cả hai hỏng thì trang vẫn lên bình thường, chỉ có trợ lý im lặng trả
 * về rỗng — không có màn này thì phải đợi người dùng kêu mới biết.
 */
export default function SystemPanel() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState("");
  const [at, setAt] = useState<Date | null>(null);

  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    await Promise.resolve();
    try {
      const result = await adminApi.system();
      if (!isCurrent()) return;
      setData(result);
      setAt(new Date());
      setError("");
    } catch (e) {
      if (isCurrent()) {
        setError(e instanceof Error ? e.message : "Không nạp được tình trạng");
      }
    }
  }, []);

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

  if (error) return <p className="bo-msg err">{error}</p>;
  if (!data) return <p className="bo-empty">Đang kiểm tra…</p>;

  /*
   * So với mốc thời gian LÚC NẠP (`at`), không gọi `Date.now()` trong thân
   * render: đọc đồng hồ lúc render là hàm không thuần khiết — React Compiler
   * chặn đúng, vì hai lần render liền nhau có thể cho hai kết quả khác nhau mà
   * dữ liệu không đổi.
   */
  const kbStale =
    data.medicalKb.updatedAt !== null &&
    at !== null &&
    at.getTime() - new Date(data.medicalKb.updatedAt).getTime() >
      90 * 24 * 3600 * 1000;

  return (
    <>
      <div className="bo-bar">
        <span style={{ color: "var(--bo-muted)" }}>
          {at ? `Kiểm lúc ${at.toLocaleTimeString("vi-VN")}` : ""}
        </span>
        <button type="button" className="bo-btn small" onClick={() => void load()}>
          Kiểm lại
        </button>
      </div>

      <section className="bo-section" style={{ marginTop: 0 }}>
        <h2>Phụ thuộc</h2>
        <div className="bo-table-wrap">
          <table className="bo-table">
            <tbody>
              <Row
                label="Cơ sở dữ liệu PostgreSQL"
                note={`phản hồi ${data.database.latencyMs} ms`}
                value={data.database.status === "up" ? "đang chạy" : "không nối được"}
                tone={data.database.status === "up" ? "good" : "bad"}
              />
              <Row
                label="Chỉ số tri thức y khoa"
                note={data.medicalKb.path}
                value={
                  !data.medicalKb.exists
                    ? "không thấy tệp"
                    : `${mb(data.medicalKb.bytes)}${
                        data.medicalKb.updatedAt
                          ? ` · cập nhật ${new Date(data.medicalKb.updatedAt).toLocaleDateString("vi-VN")}`
                          : ""
                      }`
                }
                tone={
                  !data.medicalKb.exists ? "bad" : kbStale ? "warn" : "good"
                }
              />
              <Row
                label="Khoá mô hình ngôn ngữ"
                note={data.llm.note}
                value={data.llm.managedBy}
              />
              <Row label="API backend" note={API_URL} value="đang gọi được" tone="good" />
              <Row label="Trang ngoài" note={SITE_URL} value="cấu hình" />
            </tbody>
          </table>
        </div>
        {!data.medicalKb.exists && (
          <p className="bo-msg err" style={{ marginTop: 10 }}>
            Không thấy tệp chỉ số. Trợ lý bám giáo trình sẽ trả về rỗng mà không
            báo lỗi. Dựng lại bằng{" "}
            <code>python resources/medical_kb/scripts/build_text_index.py</code> ở backend, hoặc đặt
            biến <code>MEDICAL_KB_INDEX</code> trỏ đúng chỗ.
          </p>
        )}
        {kbStale && data.medicalKb.exists && (
          <p className="bo-msg" style={{ marginTop: 10, background: "var(--bo-warn-bg)", color: "var(--bo-warn)" }}>
            Chỉ số đã hơn 90 ngày không cập nhật. Nếu có thêm tài liệu nguồn từ
            đó tới nay thì trợ lý chưa thấy chúng.
          </p>
        )}
      </section>

      <section className="bo-section">
        <h2>Tiến trình máy chủ</h2>
        <div className="bo-cards">
          <div className="bo-card">
            <small>Đã chạy liên tục</small>
            <b style={{ fontSize: 19 }}>{duration(data.runtime.uptimeSeconds)}</b>
            <i>từ {new Date(data.runtime.startedAt).toLocaleString("vi-VN")}</i>
          </div>
          <div className="bo-card">
            <small>Node.js</small>
            <b style={{ fontSize: 19 }}>{data.runtime.node}</b>
          </div>
          <div className="bo-card">
            <small>Phiên đang mở</small>
            <b>{data.totals.sessions}</b>
          </div>
          <div className="bo-card">
            <small>Dòng nhật ký</small>
            <b>{data.totals.auditRows.toLocaleString("vi-VN")}</b>
            <i>
              {data.lastAuditAt
                ? `mới nhất ${new Date(data.lastAuditAt).toLocaleString("vi-VN")}`
                : "chưa có"}
            </i>
          </div>
        </div>
      </section>
    </>
  );
}
