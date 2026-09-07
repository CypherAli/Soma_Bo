import AdminShell from "@/components/AdminShell";

/**
 * Back office là ứng dụng MỘT TRANG.
 *
 * Không tách mỗi khu thành một route: chuyển khu là đổi tab trong cùng một
 * khung, giữ nguyên bộ lọc và số liệu tổng quan đã nạp. Tách route thì mỗi lần
 * bấm qua tab khác lại nạp lại từ đầu, mà người ngồi đây đổi tab liên tục.
 */
export default function Page() {
  return <AdminShell />;
}
