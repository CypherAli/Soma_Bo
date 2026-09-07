# Soma 3D — Back office

Trang quản trị nội dung y khoa của [Soma 3D](https://github.com/CypherAli/Soma_Fe).
Ứng dụng riêng, tách khỏi trang ngoài.

## Vì sao tách repo

Back office và trang ngoài phục vụ hai loại người khác nhau, nên gộp chung chỉ
gây phiền cho cả hai:

- Trang ngoài nặng vì phải có `three.js`, `@react-three/fiber` và `next-intl` cho
  130 model 3D và ba thứ tiếng. Back office không dùng dòng nào trong số đó —
  build ở đây mất khoảng 4 giây, bên kia khoảng 45 giây.
- Ba thứ tiếng là yêu cầu của trang ngoài. Back office là công cụ nội bộ, chỉ
  tiếng Việt; dịch nó ra ba bộ chữ là thêm việc phải nuôi mà không ai đọc.
- Triển khai được riêng: back office có thể đặt sau xác thực ở tầng hạ tầng, hoặc
  chỉ mở trong mạng nội bộ, mà không ảnh hưởng trang công khai.

**Hệ quả của việc tách, cần biết:** hai ứng dụng chạy ở origin khác nhau nên
`localStorage` không chia sẻ được — back office KHÔNG mượn được phiên đăng nhập
của trang ngoài. Vì thế nó có form đăng nhập riêng (`src/components/LoginPanel.tsx`)
gọi thẳng `POST /api/auth/login`.

## Không có cơ sở dữ liệu riêng

Repo này chỉ là giao diện. Mọi thứ nó đọc và ghi đều qua khu `/api/admin` của
[soma_be](https://github.com/CypherAli/Soma_Be), nơi guard `@MinRole` mới là chốt
chặn thật. Việc ẩn nút ở đây chỉ để người dùng đỡ mất công bấm — ẩn được không có
nghĩa là an toàn.

## Chạy

```bash
npm install
cp .env.example .env.local   # sửa NEXT_PUBLIC_API_URL nếu backend không ở cổng 4000
npm run dev                  # http://localhost:3001
```

Cần `soma_be` đang chạy. Cổng 3001 để không tranh cổng 3000 với trang ngoài.

## Cấp quyền quản trị

Không có endpoint HTTP nào tự phong quyền — một endpoint như thế là cửa sau cho
bất kỳ ai tìm ra nó. Super admin đầu tiên cấp bằng lệnh ở phía backend:

```bash
cd soma_be && npm run role -- <email> super_admin
```

Bậc quyền, từ thấp lên cao:

| Vai | Làm được gì |
| --- | --- |
| `user` | Không vào được back office |
| `editor` | Soạn nội dung bệnh lý, thêm trích dẫn, sửa danh mục tài liệu |
| `admin` | Thêm: duyệt chuyên môn, đối chiếu trích dẫn, xem tài khoản, đọc nhật ký |
| `super_admin` | Thêm: cấp và thu quyền |

## Các khu

Mười lăm khu, chia năm nhóm.

**Theo dõi**

| Khu | Nội dung |
| --- | --- |
| Tổng quan | Bảy hạng mục việc tồn đọng, mỗi hạng mục liệt kê mục cụ thể bấm được để làm ngay |
| Tình trạng hệ thống | Cơ sở dữ liệu, **chỉ số tri thức y khoa** (tệp trên đĩa — mất là trợ lý im lặng trả rỗng), tiến trình máy chủ |

**Hàng đợi công việc** — ba phiên làm việc khác nhau, nên là ba khu khác nhau

| Khu | Nội dung |
| --- | --- |
| Chờ duyệt | Chọn nhiều bài, duyệt một lượt. Chỉ tick được bài **đủ điều kiện** (có nội dung tiếng Việt và có trích dẫn), tối đa 50 một lượt |
| Đối chiếu trích dẫn | Bảng hiện đủ để đối chiếu mà không cần mở bài: tên bệnh, tài liệu, trang, câu trích. Cảnh báo riêng khi nguồn không mở được |
| Bàn dịch | Bản đích đặt **cạnh** bản gốc tiếng Việt trên cùng màn hình; ô bản gốc chỉ đọc |

**Nội dung y khoa**

| Khu | Nội dung |
| --- | --- |
| Bệnh lý | Nội dung ba ngôn ngữ, thuộc tính, neo cấu trúc 3D, cấu trúc phụ, trích dẫn |
| Giải phẫu | Ba khung nhìn theo tầng: loài (7) → hệ cơ quan (55) → cấu trúc (200) |
| Trắc nghiệm | Câu hỏi **trong cơ sở dữ liệu** và phương án |
| Tài liệu y khoa | Danh mục nguồn và số bệnh đang dựa vào từng nguồn |

**Người học** — chỉ số liệu tổng hợp, không có hồ sơ từng người

| Khu | Nội dung |
| --- | --- |
| Hoạt động học tập | Lượt nộp, tỉ lệ đúng theo nguồn và phạm vi, hàng đợi ôn. Cảnh báo khi quá nửa hàng ôn là câu từng sai — nội dung khó thật, hoặc có đề sai đáp án |
| Tài liệu cá nhân | **Chỉ phần kê khai** và trạng thái bóc PDF. Không có nội dung tài liệu, không có nội dung câu hỏi |

**Hệ thống**

| Khu | Nội dung |
| --- | --- |
| Tài khoản | Phân quyền, khoá tài khoản (khoá là cắt mọi phiên đang mở ngay) |
| Phiên đăng nhập | Phiên còn hiệu lực, thu hồi được từng phiên |
| Nhật ký | Ai đổi gì, lúc nào, **và giá trị trước khi đổi** |
| Hồ sơ của tôi | Quyền đang có và **đổi mật khẩu** — đổi xong cắt hết phiên khác |

### Những gì back office CỐ Ý không quản lý

- **Ngân hàng đề 257 câu** theo vùng cơ thể: là mã TypeScript trong Soma_Fe, gác
  bởi `npm run verify:quiz-bank`. Bảng `quiz_questions` trong cơ sở dữ liệu chỉ
  có mấy câu mẫu theo hệ cơ quan; khu Trắc nghiệm nói rõ điều này ngay trên giao
  diện để không ai tưởng mình vừa xoá hết đề của trang.
- **Chữ tĩnh của trang ngoài** (nhãn, menu, nội dung trang chủ): là mã TypeScript
  trong Soma_Fe. Đây là công cụ quản trị dữ liệu, không phải CMS sửa từng chữ.
- **Cảnh và điểm chú giải 3D** (1310 hotspot, 130 model): gác bởi
  `npm run verify:scenes` và `verify:models` bên Soma_Fe, vì chúng phải khớp
  node thật trong file glTF.
- **Tài liệu cá nhân, bộ đề riêng và bộ nhớ hội thoại của người dùng.** Trang web
  hứa "chỉ tài khoản của bạn truy cập"; cho quản trị đọc được là phá lời hứa đó.
  Khu Tài khoản chỉ hiện SỐ LƯỢNG, không hiện nội dung.

## Những trường cố ý không cho sửa

- `lesionMesh` / `lesionSystem` — phải khớp tên mesh thật trong file glTF, và cái
  giữ cho chúng khớp là `npm run verify:lesions` ở Soma_Fe. Cho gõ tay thì một
  lỗi chính tả sẽ làm điểm tổn thương im lặng biến mất trong `/viewer`: không
  lỗi, không cảnh báo, không ai biết.
- `slug` — là địa chỉ công khai của bài bệnh và nằm trong `data/slug-alias.json`
  của Soma_Fe; đổi ở đây là làm chết liên kết ngoài.
- `meshName` của cấu trúc — cùng loại rủi ro, gác bởi `npm run verify:scenes`.
- `code` của loài / hệ / cấu trúc — mọi thứ đang trỏ tới chúng dùng chính mã đó.

`severity` để trống thì cứ để trống: mức độ nặng là phán đoán chuyên môn, không
phải ô cần điền cho đủ.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm run build
```
