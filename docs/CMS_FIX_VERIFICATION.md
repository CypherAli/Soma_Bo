# Kiểm chứng bản sửa CMS

Ngày kiểm tra: 16/10/2026. Phạm vi gồm Soma_Bo, Soma_Fe và soma_be.

## Kết quả

- FE: 75 unit test đạt; lint, TypeScript và build production đạt.
- BO: 11 unit test đạt; lint, TypeScript và build production đạt.
- Backend: 102 test trong 16 bộ đạt. Có test dùng Khronos Validator thật để chặn GLB có primitive sai trước khi ghi tài sản.
- 10 nhóm kiểm thử HTTP trên PostgreSQL đạt, bao gồm phân quyền, nháp/xuất bản, preview, khôi phục, ghi đồng thời, dữ liệu nhị phân và tìm mô hình sau hơn 100 lượt tải tệp. Dữ liệu thử được dọn trong `finally`.
- 9.395 tài liệu nguồn qua bộ kiểm tra; danh mục FE/backend khớp.
- 1.310 hotspot vẫn khớp node thật trong GLB.
- Trang chủ và khung xem mô hình của bản production trả HTTP 200; mã hợp đồng CMS phiên bản 2 của FE/API trùng nhau.
- Trình duyệt dựng mô hình `heart_anatomy.glb`; nhấp mô hình trả tên mesh `Right_ventricle`. Bằng chứng: `model-preview-fixed.png`.

## Giới hạn kiểm chứng

Chưa kiểm thử trực tiếp toàn bộ thao tác Content Studio trong phiên admin ở lần sửa này. Tạo tài khoản admin dùng một lần đã bị bộ duyệt tự động từ chối trước khi thực thi vì cấp quyền mới. Không có tài khoản hoặc tệp mật khẩu thử nào được tạo bởi thao tác bị chặn. Có thể kiểm tra tiếp bằng phiên đăng nhập hiện có của người dùng, hoặc sau khi được cho phép rõ ràng tạo tài khoản thử.

Không sửa nội dung công khai của dự án để lấy ảnh kiểm thử. Các số lượng tài liệu và hotspot là kiểm tra hợp đồng/liên kết; không thay cho kiểm chứng thủ công từng trang và từng ngôn ngữ.
