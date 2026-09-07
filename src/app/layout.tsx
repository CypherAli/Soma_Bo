import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./admin.css";

/**
 * Chỉ một phông chữ, không có serif.
 *
 * Soma_Fe nạp thêm Playfair Display cho phần chữ trang trí của trang giới
 * thiệu. Back office không có chữ trang trí nào, nạp thêm một họ phông là bắt
 * người dùng tải thêm vài trăm KB để không dùng.
 */
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Back office — Soma 3D",
  description:
    "Quản trị nội dung y khoa, tài khoản và nhật ký thao tác của Soma 3D.",
  // Công cụ nội bộ: không có lý do gì để nó xuất hiện trong kết quả tìm kiếm.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Đặt nền tối TRƯỚC khi React dựng cây, cùng cách và cùng khoá
            localStorage với Soma_Fe — nếu không thì mỗi lần tải lại trang sẽ
            loé trắng một nhịp rồi mới đổi sang tối. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("soma3d-theme")||"dark"}catch{document.documentElement.dataset.theme="dark"}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
