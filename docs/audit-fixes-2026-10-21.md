Đã cập nhật Next/eslint-config-next 16.4.2; script dev/build Windows dùng webpack để hỗ trợ SWC WASM khi DLL native bị chặn. Docker nhận public API/site URL qua build args.

Tệp CMS tải mới được lưu bằng tham chiếu tương đối /api/content/assets/:id; URL tuyệt đối vẫn dùng cho thư viện xem trước. Giữ danh sách mesh khớp tham chiếu vừa tải lên. Cần FE/backend cùng bản vá để phục vụ asset trên đúng origin và hỗ trợ mô hình mobile.

Audit production: 0. Braces trong công cụ dev được giới hạn độ lồng và AST qua script postinstall; npm audit vẫn có thể báo metadata của phiên bản gốc. npm run test:security kiểm chứng guard và trường hợp thông thường.

Kiểm tra đạt: 16 unit test, lint, typecheck và production build. Không xuất bản thay đổi nội dung vào DB trong lượt này.
