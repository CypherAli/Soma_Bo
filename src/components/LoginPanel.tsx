"use client";

import { useState } from "react";
import { login } from "@/lib/auth";

/**
 * Đăng nhập cho back office.
 *
 * Back office tách repo nên chạy ở origin khác trang ngoài, và localStorage
 * không chia sẻ qua origin — không thể mượn phiên của Soma_Fe, phải có form
 * riêng. Đây là thứ duy nhất phát sinh thêm khi tách repo.
 *
 * KHÔNG có đăng ký, không có OAuth, không có "quên mật khẩu": tài khoản quản
 * trị được cấp quyền bằng tay (`npm run role` ở soma_be), nên mọi lối tự tạo
 * tài khoản ở đây đều là cửa thừa. Ai chưa có tài khoản thì đăng ký ở trang
 * ngoài rồi xin cấp quyền.
 */
export default function LoginPanel({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đăng nhập được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bo-gate">
      <form className="bo-login" onSubmit={submit}>
        <div className="bo-login-brand">
          <b>Soma 3D</b>
          <span>Back office</span>
        </div>
        <p className="bo-login-lead">
          Khu quản trị nội dung y khoa. Chỉ tài khoản được cấp quyền biên tập
          trở lên mới vào được.
        </p>

        {error && <p className="bo-msg err">{error}</p>}

        <div className="bo-field">
          <label htmlFor="bo-email">Email</label>
          <input
            id="bo-email"
            className="bo-input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="bo-field">
          <label htmlFor="bo-password">Mật khẩu</label>
          <input
            id="bo-password"
            className="bo-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button type="submit" className="bo-btn primary" disabled={busy}>
          {busy ? "Đang kiểm tra…" : "Đăng nhập"}
        </button>

        <p className="bo-login-note">
          Chưa có quyền quản trị? Tài khoản được cấp bằng lệnh{" "}
          <code>npm run role</code> ở phía backend — liên hệ super admin.
        </p>
      </form>
    </div>
  );
}
