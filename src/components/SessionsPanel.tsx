"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type SessionRow } from "@/lib/admin";
import { clearAuth, type AuthUser } from "@/lib/auth";

function remaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `còn ${days} ngày`;
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return `còn ${hours} giờ`;
  return `còn ${Math.max(0, Math.floor(ms / 60000))} phút`;
}

/**
 * Phiên đăng nhập còn hiệu lực.
 *
 * Phiên sống 30 ngày, nên "đăng xuất trên máy kia" là một việc thật người ta
 * cần làm được — bỏ quên phiên trên máy phòng máy tính của trường là để ngỏ tài
 * khoản suốt một tháng.
 *
 * Không hiện băm token: nó là bí mật của phiên, và một trang quản trị chẳng có
 * việc gì cần tới nó.
 */
export default function SessionsPanel({ me }: { me: AuthUser }) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      await Promise.resolve();
      try {
        const result = await adminApi.sessions({ page });
        if (!isCurrent()) return;
        setRows(result.items);
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
    [page],
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

  const revoke = async (row: SessionRow) => {
    const mine = row.user.id === me.id;
    if (
      !confirm(
        mine
          ? "Thu hồi một phiên của CHÍNH BẠN. Nếu đó là phiên đang dùng thì bạn bị đăng xuất ngay. Tiếp tục?"
          : `Thu hồi phiên của ${row.user.email}? Người đó sẽ bị đăng xuất ở thiết bị tương ứng.`,
      )
    ) {
      return;
    }
    setError("");
    setNote("");
    try {
      await adminApi.revokeSession(row.id);
      setNote(`Đã thu hồi một phiên của ${row.user.email}.`);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không thu hồi được";
      /*
       * Thu hồi ĐÚNG phiên mình đang dùng thì lời gọi nạp lại ngay sau đó nhận
       * 401. Đó là kết quả đúng, không phải lỗi — nên dọn token và để khung
       * đăng nhập hiện ra, thay vì báo một lỗi mà người dùng không sửa được.
       */
      if (message.includes("Phiên đăng nhập")) {
        clearAuth();
        return;
      }
      setError(message);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <p style={{ margin: "0 0 14px", color: "var(--bo-muted)", fontSize: 12 }}>
        Phiên sống 30 ngày kể từ lúc đăng nhập. Khoá tài khoản ở khu Tài khoản
        cũng cắt sạch phiên của tài khoản đó.
      </p>

      {error && <p className="bo-msg err">{error}</p>}
      {note && <p className="bo-msg ok">{note}</p>}

      <div className="bo-table-wrap">
        <table className="bo-table">
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Quyền</th>
              <th>Đăng nhập lúc</th>
              <th>Hết hạn</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.user.name}</strong>
                  <em>{row.user.email}</em>
                  {row.user.id === me.id && <em>— tài khoản của bạn</em>}
                </td>
                <td>
                  <span className="bo-tag">{row.user.role}</span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(row.createdAt).toLocaleString("vi-VN")}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {new Date(row.expiresAt).toLocaleDateString("vi-VN")}
                  <em>{remaining(row.expiresAt)}</em>
                </td>
                <td>
                  <button
                    type="button"
                    className="bo-btn small danger"
                    onClick={() => void revoke(row)}
                  >
                    Thu hồi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="bo-empty">Đang nạp…</p>}
        {!loading && rows.length === 0 && (
          <p className="bo-empty">Không có phiên nào còn hiệu lực.</p>
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
          Trang {page}/{lastPage} · {total} phiên đang mở
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
