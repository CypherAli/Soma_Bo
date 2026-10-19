# Rà soát luồng quản trị — 16/10/2026

Phạm vi: tìm kiếm, chọn nội dung, chỉnh mô hình GLB, biểu mẫu, bảo vệ bản nháp và quản lý người dùng trong Soma_Bo; API danh mục nội dung trong soma_be.

## Các lỗi đã xử lý

1. Tìm trong toàn bộ JSON rồi sắp theo bảng chữ cái khiến bài chỉ nhắc đến “tim” xuất hiện trước bài có tên Tim. Mặc định tìm tên và mã; có lựa chọn toàn bộ nội dung; ưu tiên tên khớp, hỗ trợ không dấu, chuẩn hóa dấu câu và chữ hoa/thường.
2. 2.234 tên cấu trúc atlas bị trộn với cảnh và mô hình. Bộ lọc mặc định chỉ hiện mô hình/cảnh; có lựa chọn GLB, cảnh atlas, tên cấu trúc hoặc tất cả.
3. Kết quả cùng tên khó phân biệt. Hiển thị loại nội dung, mã liên kết và nguồn khi các mục cùng loại còn trùng nhau.
4. Tải GLB bị chôn trong biểu mẫu dài. Mô hình mở trực tiếp ở tab “Mô hình 3D · Tải GLB”; cấu hình đường dẫn xem trước được thu gọn.
5. Bộ lọc trường bỏ sót nhãn dịch lồng sâu và ô GLB rỗng. Lọc đệ quy theo nhãn, tên trường và giá trị, hỗ trợ không dấu và thông báo không có trường khớp.
6. Tên đã lưu vẫn hiển thị/tìm theo dữ liệu gốc. Danh sách và tìm kiếm đọc tên trong bản nháp đã lưu, giữ thứ tự ngôn ngữ Việt/Anh/Trung dù PostgreSQL sắp lại khóa JSON.
7. Tìm kiếm trên cùng bỏ sót mô hình. Bổ sung nguồn nội dung website và mở đúng tài liệu; nguồn lỗi không làm mất kết quả từ các nguồn còn lại.
8. Kết quả cũ có thể ghi đè khi truy vấn mới hoặc bảng tìm kiếm đã đóng. Chặn phản hồi lỗi thời, hủy yêu cầu danh sách, hiển thị trạng thái tải và lỗi.
9. Điều hướng danh sách trên màn hình hẹp khó tiếp tục bản sửa. Giữ bản nháp khi quay về danh sách, cho phép trở lại bài đang sửa và cảnh báo trước khi chuyển sang bài khác.
10. Nút tải tệp là label không thao tác tốt bằng bàn phím. Dùng button thật, khóa biểu mẫu khi đang tải và kiểm tra kích thước tệp trước khi gửi.
11. Tìm người dùng thiếu nút rõ ràng; menu phân quyền chứa mức backend từ chối. Bổ sung nút tìm, trạng thái tải, khóa thao tác đang chạy và chỉ hiện quyền được cấp.
12. Biểu mẫu lặp hai khung “Nội dung”. Bỏ các khung bọc thừa, giữ nhãn từng nhóm/trường.
13. Menu có thể che vùng biên tập khi chuyển từ cửa sổ rộng sang hẹp. Đồng bộ trạng thái theo breakpoint và tự đóng menu sau khi chọn mục trên màn hình hẹp.

## Kiểm chứng

- Backend: 16 kiểm thử cho tìm kiếm, hợp đồng nội dung và xác thực GLB; build NestJS.
- Back office: 13 kiểm thử; TypeScript, ESLint và build Next.js.
- Kiểm thử giao diện dùng bundle thật và catalog thật với phiên giả lập, bản nháp trong bộ nhớ tại cổng 3002. Không dùng thông tin đăng nhập của người dùng, không ghi vào cơ sở dữ liệu thật.
- Trên catalog gốc, tìm “tim” với phạm vi tên và bộ lọc mô hình/cảnh trả về 5 kết quả liên quan; ảnh phản ánh lỗi trước đó trả về 121 mục.
- Kiểm tra trình duyệt: mở GLB và cảnh atlas, lọc nhãn không dấu, đổi tab, cảnh báo bản nháp, tìm kiếm trên cùng, tìm người dùng và bố cục hẹp/rộng.

Các kiểm tra này đánh giá chức năng quản trị. Nội dung chuyên môn y khoa trong các bài không được viết lại trong đợt sửa này.

## Chạy lại kiểm tra giao diện

Sau khi build backend và back office, chạy back office cổng 3001, rồi chạy `node scripts/cms-ui-review.cjs` tại thư mục Soma_Bo và mở http://localhost:3002. Máy chủ thử chỉ trả dữ liệu mẫu; các thay đổi nháp chỉ tồn tại trong bộ nhớ. Dừng tiến trình sau khi kiểm tra.
