"use client";

import { useState } from "react";
import { changePassword, type AuthUser } from "@/lib/auth";

const ROLE_CAN: Record<string, string[]> = {
  editor: [
    "Soạn nội dung bệnh lý ba ngôn ngữ",
    "Thêm trích dẫn, neo bệnh vào cấu trúc 3D",
    "Sửa loài, hệ cơ quan, cấu trúc, câu hỏi trắc nghiệm",
    "Sửa danh mục tài liệu y khoa",
  ],
  admin: [
    "Duyệt chuyên môn và đối chiếu trích dẫn",
    "Xem tài khoản, khoá và mở khoá",
    "Xem hoạt động học tập, tài liệu cá nhân, phiên đăng nhập",
    "Đọc nhật ký thao tác",
  ],
  super_admin: ["Cấp và thu quyền của tài khoản khác"],
};

/**
 * Hồ sơ của chính người đang đăng nhập.
 *
 * Trước đây không có chỗ nào tự đổi mật khẩu — cả trang ngoài lẫn back office.
 * Người quản trị muốn đổi phải nhờ ai đó chạy SQL, tức là trên thực tế không ai
 * đổi bao giờ.
 */
export default function ProfilePanel({ me }: { me: AuthUser }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNote("");
    // Kiểm khớp Ở ĐÂY chứ không gửi lên: máy chủ chỉ nhận một mật khẩu mới nên
    // nó không có cách nào biết người dùng gõ lại sai.
    if (next !== again) {
      setError("Hai lần nhập mật khẩu mới không khớp nhau");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setAgain("");
      setNote(
        "Đã đổi mật khẩu. Mọi phiên khác đã bị cắt; phiên hiện tại được cấp lại nên bạn không phải đăng nhập lại ở đây.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đổi được mật khẩu");
    } finally {
      setBusy(false);
    }
  };

  const rank = ["editor", "admin", "super_admin"];
  const owned = rank.slice(0, rank.indexOf(me.role) + 1);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        <section>
          <h2
            style={{
              margin: "0 0 10px",
              color: "var(--bo-muted)",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Tài khoản
          </h2>
          <div className="bo-cite">
            <b>{me.name}</b>
            <span>{me.email}</span>
            <span>
              Quyền: <b>{me.role}</b>
            </span>
            <span>
              Quyền chỉ super admin cấp được, và không ai tự đổi quyền của chính
              mình — kể cả super admin.
            </span>
          </div>

          <div className="bo-cite">
            <b>Bạn làm được những gì</b>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {owned.flatMap((role) =>
                (ROLE_CAN[role] ?? []).map((line) => (
                  <li
                    key={`${role}-${line}`}
                    style={{ fontSize: 12.5, lineHeight: 1.7 }}
                  >
                    {line}
                  </li>
                )),
              )}
            </ul>
          </div>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 10px",
              color: "var(--bo-muted)",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Đổi mật khẩu
          </h2>
          <form className="bo-cite" onSubmit={submit}>
            {error && <p className="bo-msg err">{error}</p>}
            {note && <p className="bo-msg ok">{note}</p>}

            <div className="bo-field">
              <label htmlFor="p-cur">Mật khẩu hiện tại</label>
              <input
                id="p-cur"
                className="bo-input"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </div>
            <div className="bo-field">
              <label htmlFor="p-new">Mật khẩu mới (ít nhất 8 ký tự)</label>
              <input
                id="p-new"
                className="bo-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
            </div>
            <div className="bo-field">
              <label htmlFor="p-again">Nhập lại mật khẩu mới</label>
              <input
                id="p-again"
                className="bo-input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={again}
                onChange={(event) => setAgain(event.target.value)}
              />
            </div>

            <span>
              Đổi xong, <b>mọi phiên khác bị cắt</b> — đó là điểm chính của việc
              đổi mật khẩu. Phiên đang dùng ở đây được cấp lại nên bạn không bị
              đăng xuất.
            </span>

            <footer>
              <button type="submit" className="bo-btn primary" disabled={busy}>
                {busy ? "Đang đổi…" : "Đổi mật khẩu"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </>
  );
}
