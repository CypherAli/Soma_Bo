"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type Learning } from "@/lib/admin";

const SOURCE_NAME: Record<string, string> = {
  model: "Từ mô hình 3D",
  book: "Từ giáo trình",
  atlas: "Từ atlas",
  personal: "Bộ đề riêng",
  vet: "Thú y",
};

/** Thanh so sánh nằm ngang, dùng cho phân bố theo nguồn và theo phạm vi. */
function Bars({
  rows,
  max,
  labelOf,
}: {
  rows: { key: string; attempts: number; accuracy: number | null }[];
  max: number;
  labelOf: (key: string) => string;
}) {
  if (rows.length === 0) {
    return <p className="bo-empty">Chưa có lượt làm bài nào.</p>;
  }
  return (
    <div className="bo-table-wrap">
      <table className="bo-table">
        <thead>
          <tr>
            <th>Phạm vi</th>
            <th style={{ width: "45%" }}>Số lượt</th>
            <th>Tỉ lệ đúng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <strong>{labelOf(row.key)}</strong>
              </td>
              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 999,
                      background: "var(--bo-line)",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${max ? (row.attempts / max) * 100 : 0}%`,
                        borderRadius: 999,
                        background: "var(--bo-accent)",
                      }}
                    />
                  </div>
                  <b style={{ fontVariantNumeric: "tabular-nums" }}>
                    {row.attempts}
                  </b>
                </div>
              </td>
              <td>
                {row.accuracy === null ? (
                  <em>—</em>
                ) : (
                  <span
                    className={`bo-tag ${
                      row.accuracy >= 70
                        ? "good"
                        : row.accuracy >= 40
                          ? "warn"
                          : "bad"
                    }`}
                  >
                    {row.accuracy}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Hoạt động học tập — TỔNG HỢP, không phải hồ sơ từng người.
 *
 * Trang web hứa tiến độ học là của riêng người dùng. Quản trị cần biết hệ thống
 * có ai dùng không và phần nào đang khó (để xem lại nội dung hay đề), chứ không
 * cần biết ai trả lời sai câu nào — nên ở đây chỉ có tổng, trung bình và phân
 * bố, và các lượt gần đây KHÔNG kèm danh tính.
 */
export default function LearningPanel() {
  const [data, setData] = useState<Learning | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (isCurrent: () => boolean = () => true) => {
    await Promise.resolve();
    try {
      const result = await adminApi.learning();
      if (!isCurrent()) return;
      setData(result);
      setError("");
    } catch (e) {
      if (isCurrent()) {
        setError(e instanceof Error ? e.message : "Không nạp được số liệu");
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
  if (!data) return <p className="bo-empty">Đang nạp số liệu…</p>;

  const lapseRate = data.review.total
    ? Math.round((data.review.lapsed / data.review.total) * 100)
    : 0;

  return (
    <>
      <p style={{ margin: "0 0 14px", color: "var(--bo-muted)", fontSize: 12 }}>
        Chỉ số liệu tổng hợp. Tiến độ học là dữ liệu riêng của người dùng nên
        khu này không có hồ sơ từng người và các lượt gần đây không kèm danh
        tính.
      </p>

      <div className="bo-cards">
        <div className="bo-card">
          <small>Lượt làm bài đã nộp</small>
          <b>{data.attempts.toLocaleString("vi-VN")}</b>
          <i>{data.attempts30d} lượt trong 30 ngày qua</i>
        </div>
        <div className="bo-card">
          <small>Người đã từng nộp bài</small>
          <b>{data.learners}</b>
          <i>không tính tài khoản đăng ký rồi bỏ</i>
        </div>
        <div className="bo-card">
          <small>Lộ trình học đang hoạt động</small>
          <b>{data.paths}</b>
        </div>
        <div className="bo-card">
          <small>Câu trong hàng đợi ôn</small>
          <b>{data.review.total}</b>
          <i className={data.review.dueNow > 0 ? "warn" : "good"}>
            {data.review.dueNow} câu đã đến hạn
          </i>
        </div>
        <div className="bo-card">
          <small>Câu từng trả lời sai</small>
          <b>{data.review.lapsed}</b>
          <i className={lapseRate >= 50 ? "bad" : lapseRate >= 25 ? "warn" : "good"}>
            {lapseRate}% hàng đợi ôn
          </i>
        </div>
      </div>

      {lapseRate >= 50 && data.review.total >= 20 && (
        <p
          className="bo-msg"
          style={{
            marginTop: 14,
            background: "var(--bo-warn-bg)",
            color: "var(--bo-warn)",
          }}
        >
          Quá nửa hàng đợi ôn là câu từng trả lời sai. Có hai cách đọc con số
          này và cả hai đều đáng xem: nội dung khó thật, hoặc có đề sai đáp án.
          Đối chiếu với tỉ lệ đúng theo phạm vi bên dưới để biết là cái nào.
        </p>
      )}

      <section className="bo-section">
        <h2>Theo nguồn đề</h2>
        <Bars
          rows={data.bySource.map((r) => ({
            key: r.source,
            attempts: r.attempts,
            accuracy: r.accuracy,
          }))}
          max={Math.max(1, ...data.bySource.map((r) => r.attempts))}
          labelOf={(key) => SOURCE_NAME[key] ?? key}
        />
      </section>

      <section className="bo-section">
        <h2>Theo phạm vi ôn (10 phạm vi nhiều lượt nhất)</h2>
        <Bars
          rows={data.byScope.map((r) => ({
            key: r.scope,
            attempts: r.attempts,
            accuracy: r.accuracy,
          }))}
          max={Math.max(1, ...data.byScope.map((r) => r.attempts))}
          labelOf={(key) => (key === "all" ? "Toàn bộ" : key)}
        />
      </section>

      <section className="bo-section">
        <h2>Lượt nộp gần đây</h2>
        <div className="bo-table-wrap">
          {data.recent.length === 0 ? (
            <p className="bo-empty">Chưa có lượt nào.</p>
          ) : (
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Lúc</th>
                  <th>Nguồn · phạm vi</th>
                  <th>Chế độ</th>
                  <th>Điểm</th>
                  <th>Thời gian làm</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => {
                  const percent = row.total
                    ? Math.round((row.score / row.total) * 100)
                    : 0;
                  return (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(row.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td>
                        {SOURCE_NAME[row.source] ?? row.source}
                        <em>{row.scope === "all" ? "toàn bộ" : row.scope}</em>
                      </td>
                      <td>
                        <span className="bo-tag">
                          {row.mode === "exam" ? "thi thử" : "luyện tập"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`bo-tag ${
                            percent >= 70 ? "good" : percent >= 40 ? "warn" : "bad"
                          }`}
                        >
                          {row.score}/{row.total} · {percent}%
                        </span>
                      </td>
                      <td>
                        {row.seconds > 0 ? (
                          `${Math.floor(row.seconds / 60)}p ${row.seconds % 60}s`
                        ) : (
                          <em>không đo được</em>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
