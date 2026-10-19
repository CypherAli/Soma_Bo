# Content Studio

Mở **Website & mô hình → Content Studio** trong BO. Backend và FE cần cùng phiên bản của hợp đồng CMS.

## Nội dung quản trị

- Giao diện: chữ hiển thị, từ điển vi/en/zh, điều hướng, hình ảnh và màu website.
- Mô hình: cảnh GLB, nhóm/lớp atlas, mã mảnh có thật, vị trí nhãn, màu, góc nhìn và mô hình thay thế.
- Giải thích: tên, Latin, mô tả, ghi chú, nguồn đối chiếu và bài học liên quan.
- Câu hỏi: các kho JSON công khai, nội dung, phương án, đáp án và giải thích; khu Trắc nghiệm cũ tiếp tục quản lý bảng câu hỏi trong DB.

Danh mục được sinh từ nguồn thật bằng `npm run cms:sync` ở Soma_Fe. `npm run verify:cms` kiểm tra hợp đồng chưa bị cũ. Không cần nhập lại thủ công hàng nghìn nội dung. Thư mục `soma_be/resources/cms/` phải có trong gói triển khai backend (Dockerfile đã sao chép).

## Quy trình

1. Tìm theo tiêu đề, mã mảnh, tên file hoặc một đoạn nội dung.
2. Sửa biểu mẫu. Các nhóm lớn thu gọn được; ô lọc tìm trường bên trong tài liệu.
3. **Lưu bản nháp**: chỉ người có quyền BO nhìn thấy. Người học vẫn đọc bản đã xuất bản.
4. **Xem trước** tạo liên kết sống 15 phút. FE dùng cookie HttpOnly cho phiên xem trước; token quản trị không được đặt trong URL. Mở `/api/content-preview` không có token để thoát xem trước.
5. Đối chiếu tab **Thay đổi**, rồi admin/super_admin **Xuất bản**. Người học tải lại FE để đọc bản mới.
6. Tab **Lịch sử** khôi phục nội dung cũ vào một bản nháp mới. Phải xuất bản riêng để thay đổi FE.

Editor được biên tập, tải tệp, xem trước và khôi phục. Admin trở lên được xuất bản. Phân quyền chặn ở backend, không chỉ bằng nút trong BO. Mỗi lần ghi đều kiểm tra phiên bản; cập nhật cũ bị trả 409 để tránh ghi đè công việc của người khác. Nội dung và nhật ký được lưu cùng một transaction.

## Mô hình và tệp

Ảnh nhận PNG/JPEG/WebP tối đa 10 MB; GLB 2.0 tối đa 100 MB. Nội dung tệp được kiểm tra, không tin phần mở rộng. Không nhận SVG hoặc GLB phụ thuộc tài nguyên bên ngoài. Tệp lưu trong PostgreSQL nên không mất khi container khởi động lại.

Ở cảnh atlas, khối **Thay thế bằng mô hình riêng** cho phép chọn GLB và khai báo cấu trúc/chú giải. Để đường dẫn trống thì vẫn dùng atlas gốc. Tên mesh phải tồn tại trong mô hình được chọn. Với atlas gốc, các mã mảnh phải có trong manifest và nhóm được tham chiếu phải tồn tại. Mã slug/id/code giữ ổn định để bảo toàn liên kết và tiến độ người học.

Mỗi tài liệu dữ liệu có mã ổn định theo nguồn; không thay chuỗi toàn website. Chữ giao diện được giới hạn trong file sở hữu tài liệu `copy:`. Hai trường có cùng chữ ở hai tài liệu khác nhau được chỉnh độc lập. Mã định danh, class CSS, ref, event handler, giá trị người dùng nhập và đối tượng Three.js không bị thay bằng nội dung CMS.

## Cấu trúc tích hợp

`SiteContent` lưu bản nháp/bản công khai; `SiteContentRevision` lưu lịch sử; `SiteContentPreview` lưu ảnh chụp xem trước có hạn dùng; `SiteAsset` lưu tệp. API công khai chỉ trả các bản đã xuất bản, kèm quy tắc thay thế so với nguồn.

Hợp đồng CMS phiên bản 2 có `contractHash`; FE và backend phải được triển khai cùng bản danh mục. FE nạp snapshot công khai, dùng chung cho SSR và hydration qua `ContentProvider`. Các nguồn tĩnh được gắn bằng `bindContentSource`; component lấy dữ liệu đã resolve trước khi tính chữ, ảnh nền, góc nhìn hoặc danh sách. `ContentSurface` chỉ xử lý chữ thuộc file của nó. Kho JSON được áp dụng theo mã tài liệu và chỉ số câu hỏi, tên mảnh atlas theo ID; không so khớp toàn cục bằng nội dung chuỗi.

Khi API CMS gián đoạn, FE giữ bản công khai hợp lệ gần nhất trong bộ nhớ và trên đĩa, không ghi bản xem trước vào cache này. Chỉ khi chưa từng có bản hợp lệ cho hợp đồng hiện tại mới dùng nguồn. Có thể đặt `CMS_CACHE_DIR` vào ổ đĩa bền vững và cấp quyền ghi cho tiến trình FE. Backend cache snapshot trong 3 giây và hủy cache khi ghi nội dung.

Đặt `API_INTERNAL_URL` ở FE nếu backend dùng hostname nội bộ khác `NEXT_PUBLIC_API_URL`. Đặt `CMS_CATALOG_PATH` ở backend nếu cần chuyển tệp hợp đồng sang đường dẫn khác.

## Công cụ biên tập bổ sung

- Đường dẫn xem trước chỉnh được để đến đúng trang và ngôn ngữ cần kiểm tra.
- Có nút bỏ thay đổi, tải lại chính tài liệu khi gặp xung đột, xem nội dung một phiên bản trước khi khôi phục và chuyển trang lịch sử.
- Phương án mới tự nhận mã riêng. Tọa độ cố định không có nút thêm/xóa/đổi thứ tự. Backend kiểm tra đáp án nhiều lựa chọn, cờ chấm điểm, độ dài tọa độ, trục, tỷ lệ và góc nhìn.
- Thư viện tệp tìm theo tên, lọc loại, phân trang 24 tệp. Danh sách mô hình không bị giới hạn ở 100 tệp tải lên gần nhất.
- Ảnh có bản xem trước. GLB được kiểm tra bằng Khronos glTF Validator, có khung xem 3D; trường mesh cho phép nhấp cấu trúc để điền tên. Không lưu/xuất bản hoặc chuyển khu khi đang tải tệp.
- Trên màn hình hẹp, mở tài liệu chuyển sang khung biên tập; nút Danh mục nội dung đưa về danh sách.

`scripts/bind-content-sources.mjs` hỗ trợ gắn nguồn và consumer đã có trong danh mục. Khi thêm nguồn mới: chạy `cms:sync`, gắn binding cho nguồn/consumer, kiểm tra cách dùng dữ liệu trước khi render rồi chạy lại `cms:sync` và `verify:cms`. Với hàm tạo dữ liệu dẫn xuất, phải giữ binding hoặc đọc bằng `document(id, fallback)`; không dùng thay chuỗi như đường tắt.

## Kiểm tra

```sh
# Soma_Bo
npm run typecheck
npm run lint
npm run test:unit
npm run build

# Soma_Fe
npm run verify:cms
npm run verify:scenes
node --import ./scripts/ts-resolve.mjs --test src/lib/content/resolve.test.ts
npm run lint
npm run build

# soma_be, sau prisma generate và migrate deploy
npm run build
npm test -- --runInBand content.validation.spec.ts content.upload.spec.ts
node scripts/qa-cms.mjs
node scripts/qa-cms.mjs --audit-catalog
```

`qa-cms.mjs` mở API trên cổng ngẫu nhiên và dùng danh mục, người dùng, bản nháp, ảnh và nhật ký riêng, rồi tự dọn. Không đổi nội dung công khai của dự án. Script kiểm tra quyền, bản nháp, preview, publish, restore, sửa đồng thời, tệp nhị phân và audit trên PostgreSQL thật.
