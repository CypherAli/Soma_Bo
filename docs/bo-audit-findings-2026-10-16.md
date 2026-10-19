# Những điểm còn chưa ổn trong BO — 16/10/2026

> Cập nhật 17/10/2026: các mục dưới đây là bằng chứng tại thời điểm rà soát. Đã xử lý các lỗi và luồng liên quan; xem [bản sửa, kiểm chứng và giới hạn](bo-fixes-2026-10-17.md). Bệnh lý DB vẫn lưu trực tiếp kèm trạng thái cần duyệt lại; chưa chuyển sang cơ chế xuất bản hai bản riêng như CMS.

Đây là kết quả rà soát bổ sung, chưa phải danh sách lỗi đã sửa. Phạm vi gồm mã BO, API quản trị và đường hiển thị mô hình của FE. Các phép thử service sử dụng đối tượng cơ sở dữ liệu giả, không thay đổi tài khoản hoặc nội dung thật. Không đánh giá độ chính xác chuyên môn của các bài y khoa.

## Cần ưu tiên

### 1. P1 — Lưu một ngôn ngữ có thể làm mất bản sửa ở ngôn ngữ khác

- Ví dụ: sửa tiếng Việt chưa lưu, chuyển qua tiếng Anh và lưu tiếng Anh. `saveContent()` gọi `load()`, rồi `load()` tạo lại toàn bộ `drafts` từ server; phần tiếng Việt chưa lưu bị thay thế.
- Thêm trích dẫn, đổi thuộc tính hoặc đổi trạng thái duyệt cũng gọi `load()` qua `act()`, gây cùng rủi ro.
- Bằng chứng: `src/components/PathologyDrawer.tsx:115`, `:195`, `:210`.
- Hướng xử lý: lưu và cập nhật baseline của riêng phần đã lưu; bảo toàn các phần còn dirty; cảnh báo trước khi tải lại hoặc đóng ngăn.

### 2. P1 — BO cho sửa mô hình mà route người học không dùng

- Trong catalog có 118 slug xuất hiện ở cả cảnh atlas và module GLB, gồm `giai-phau-tim`.
- FE chọn atlas hoặc GLB thay thế của atlas trước; chỉ đọc module GLB cũ nếu không có atlas. Hai tài liệu trong BO lại cùng đi tới một địa chỉ xem trước theo slug.
- Vì vậy, sửa module GLB cũ không bảo đảm thay đổi trang xem trước hoặc trang người học tương ứng. Việc gắn nhãn GLB/atlas vừa bổ sung chưa giải quyết được sự khác biệt này.
- Bằng chứng: `Soma_Fe/src/app/[locale]/giai-phau/mo-hinh/[slug]/page.tsx:41` đến nhánh `getSceneModule`; `src/components/ContentPanel.tsx:12`.
- Hướng xử lý: BO cần chỉ rõ bản đang được route sử dụng; ưu tiên mở bản đó; bản cũ phải có cảnh báo và địa chỉ xem trước thích hợp.

### 3. P1 — Nội dung đã đổi nhưng vẫn mang trạng thái đã duyệt

- `AdminService.upsertContent()` cập nhật nội dung mà không đặt lại `Pathology.needsReview`.
- Nội dung bệnh lý trong DB được public API trả trực tiếp, khác quy trình nháp/xem trước/xuất bản của CMS.
- Một biên tập viên sửa bài đã duyệt có thể khiến nội dung mới xuất hiện nhưng dấu duyệt cũ vẫn còn.
- Bằng chứng: `soma_be/src/admin/admin.service.ts:633`, `soma_be/src/pathologies/pathologies.service.ts:24` và `:58`.
- Đã kiểm tra bằng service với DB giả: sửa nội dung không có lời gọi cập nhật cờ duyệt của bệnh.
- Hướng xử lý: gắn phê duyệt với phiên bản nội dung; thay đổi chuyên môn cần trở lại chờ duyệt; có bản nháp riêng nếu yêu cầu giữ bản đã duyệt ngoài website.

### 4. P2 — Duyệt từng bài bỏ qua điều kiện mà duyệt hàng loạt kiểm tra

- Hàng đợi hàng loạt yêu cầu có bản tiếng Việt và ít nhất một trích dẫn.
- Nút duyệt trong ngăn bệnh lý gọi `setReviewed()`; service chỉ kiểm tra bệnh tồn tại rồi đổi cờ.
- Bằng chứng: `soma_be/src/admin/admin.service.ts:670`, `soma_be/src/admin/queues.service.ts` trong `bulkReview()`; `src/components/PathologyDrawer.tsx:252`.
- Đã kiểm tra service với DB giả: duyệt đơn thành công dù không kiểm tra nội dung/trích dẫn.
- Hướng xử lý: dùng chung một bộ điều kiện duyệt cho mọi endpoint. Kiểm tra cần nằm ở server.

## Độ nhất quán và khả năng phục hồi

### 5. P2 — Chưa chống ghi đè giữa hai người ở các biểu mẫu ngoài CMS

- CMS có `version` và trả lỗi 409 khi bản đã thay đổi.
- Các API bệnh lý, bản dịch, giải phẫu và thông tin nguồn ghi theo ID, không nhận phiên bản mong đợi.
- Hai người mở cùng bài rồi lần lượt lưu có thể ghi đè nội dung của nhau mà không được báo.
- Bằng chứng: `soma_be/src/admin/dto/admin.dto.ts`; `AdminService.upsertContent()`, `updateSource()` và các hàm cập nhật của `AnatomyAdminService`.
- Hướng xử lý: thêm kiểm tra phiên bản cho những thực thể này, trả lại thay đổi để đối chiếu khi xung đột.

### 6. P2 — Quy tắc API cũ khác API dành cho BO

- API `/admin/structures/:id` hạn chế các trường mã/mesh và ghi nhật ký.
- API `/structures/:code` vẫn cho editor cập nhật bằng DTO kế thừa `CreateStructureDto`, gồm `code`, `meshName` và các tham chiếu hệ/loài; service cập nhật trực tiếp và không ghi audit. `/pathologies/:id` cũng có đường cập nhật trực tiếp không qua audit của BO.
- Các API này vẫn yêu cầu quyền; vấn đề là quy tắc quản trị và nhật ký không thống nhất giữa các đường ghi.
- Bằng chứng: `soma_be/src/structures/dto/update-structure.dto.ts:4`, `src/structures/structures.controller.ts`, `src/structures/structures.service.ts:106`, `src/pathologies/pathologies.service.ts:78`.
- Hướng xử lý: thống nhất dịch vụ ghi dữ liệu, điều kiện hợp lệ và audit; loại bỏ đường ghi dư thừa nếu không dùng.

### 7. P2 — Tài liệu chưa có luồng chọn/thay bộ tài liệu thật

- Hiện có danh sách, xem PDF/nguồn chính thức và PATCH thông tin nguồn. Chưa có API/UI tải hoặc đăng ký nguồn mới, thay bộ tài liệu, lưu phiên bản và quay lại bộ cũ.
- Không được coi việc đổi tên/URL của nguồn hiện tại là thay cuốn sách: các trích dẫn vẫn trỏ vào cùng `sourceId`, trong khi số trang có thể thuộc cuốn cũ.
- `kb:sync` còn upsert đè các trường đã sửa trong DB bằng catalog, nên có thể mất thông tin quản trị sau lần đồng bộ.
- Bằng chứng: `soma_be/src/admin/admin.controller.ts:200`, `src/components/SourcesPanel.tsx:91`, `soma_be/prisma/sync-medical-sources.ts:16`.
- Hướng xử lý: mỗi tài liệu/bản phát hành có định danh riêng; chọn nguồn sử dụng và lưu lịch sử thay thế; giữ nguyên nội dung PDF chuẩn và nguồn của các trích dẫn cũ; có chính sách đồng bộ rõ ràng.

### 8. P2 — Bản sửa chưa lưu chưa được bảo vệ đồng đều

- Bàn dịch đóng bài khi đổi bộ lọc, đổi ngôn ngữ hoặc chuyển trang. Các panel bệnh lý, giải phẫu, trắc nghiệm, nguồn bị unmount khi chuyển mục ở menu.
- Ngoài CMS, các panel này chưa có cơ chế dirty/beforeunload tương đương. Người dùng có thể mất bản đang nhập khi chuyển mục hoặc tải lại.
- Bằng chứng: `src/components/TranslationPanel.tsx:93`, `src/components/AdminShell.tsx:740` trở đi; các panel không có kiểm tra dirty chung.
- Hướng xử lý: có cơ chế bảo vệ bản sửa chung cho BO, bao gồm điều hướng trong ứng dụng, đóng ngăn, đổi bộ lọc và tải lại trang.

## Những điểm cần hoàn thiện tiếp

### 9. P2 — Hai khu quản lý câu hỏi sử dụng nguồn độc lập

- Mục Trắc nghiệm quản lý bảng DB; ngân hàng đề chính của website được quản lý trong CMS. Lưu thành công ở một khu không đồng nghĩa đã sửa bộ đề mà người học đang làm.
- Bằng chứng: phần thông báo ở `src/components/QuizPanel.tsx:93` và cấu trúc danh mục CMS.
- Hướng xử lý: hợp nhất điểm vào quản trị hoặc yêu cầu chọn rõ bộ đề và nơi nó được sử dụng trước khi sửa; cung cấp nút mở chính xác bộ đề ngoài website.

### 10. P2 — Quyền thu hồi phiên chưa thống nhất với thứ bậc tài khoản

- Đổi quyền/khóa tài khoản chặn thao tác lên người ngang hoặc cao hơn actor.
- Thu hồi phiên chỉ cần quyền admin; service không kiểm tra vai của chủ phiên. Một admin có thể thu hồi phiên của super admin.
- Bằng chứng: `soma_be/src/admin/ops.service.ts:282`. Đã kiểm tra bằng DB giả.
- Đây là điểm cần chốt chính sách vận hành: nếu cho phép quản trị thu hồi mọi phiên thì phải ghi rõ; nếu giữ thứ bậc như khóa tài khoản thì cần kiểm tra ở server.

### 11. P2 — Nhật ký ngoài CMS chưa bảo đảm đầy đủ và chưa có khôi phục trong UI

- Nhiều thao tác ghi dữ liệu trước rồi gọi `AuditService.record()`. Lỗi ghi audit bị bắt và chỉ log ra console, nên thao tác vẫn thành công nhưng thiếu dấu vết.
- CMS có lịch sử/khôi phục; các khu bệnh lý, giải phẫu và nguồn mới chỉ có nhật ký xem lại, chưa có khôi phục tương đương.
- Bằng chứng: `soma_be/src/admin/audit.service.ts:25`; so sánh với transaction trong `soma_be/src/content/content.service.ts:316`.
- Hướng xử lý: nếu yêu cầu truy vết bắt buộc, ghi dữ liệu và audit cùng transaction hoặc cơ chế outbox; bổ sung lịch sử/khôi phục theo phiên bản.

### 12. P3 — Điều hướng chưa có địa chỉ riêng cho từng mục/bản ghi

- Tab và bài đang chọn được giữ trong state. F5 trở về Tổng quan; không có URL để đánh dấu hoặc gửi một đường dẫn mở đúng bài đang sửa.
- Bằng chứng: `src/components/AdminShell.tsx:271` và hàm `go()`.
- Hướng xử lý: đưa mục, ID bài và bộ lọc cần thiết vào URL; giữ bản nháp theo phiên làm việc.

## Thứ tự xử lý đề xuất

1. Bảo vệ bản sửa và loại bỏ việc lưu một phần làm mất phần khác.
2. Xác định rõ mô hình/nguồn dữ liệu đang được trang người học sử dụng.
3. Thống nhất lưu nháp, phê duyệt, phiên bản và chống ghi đè.
4. Hoàn thiện quản lý bộ tài liệu, bảo toàn nguồn trích dẫn và đồng bộ.
5. Thống nhất các API ghi, quyền vận hành, audit và khôi phục.
6. Gộp điểm vào ngân hàng câu hỏi và hoàn thiện URL điều hướng.
