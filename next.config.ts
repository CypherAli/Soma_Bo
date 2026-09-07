import type { NextConfig } from "next";

/**
 * Cấu hình gọn hơn Soma_Fe một cách CÓ Ý: back office không có next-intl (công
 * cụ nội bộ, chỉ tiếng Việt) và không có three.js (không hiển thị model 3D).
 * Bỏ hai thứ đó là bỏ luôn phần lớn thời gian build.
 */
const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;
