# Word Castle

**Word Castle** là game luyện nghe và chính tả tiếng Anh trên trình duyệt. Nghe từ được đọc, gõ từng chữ cái để điều khiển pháo bắn hạ ô từ trước khi nó chạm tường.

Dự án được xây bằng **React, TypeScript, Vite và Canvas**. Kho từ cá nhân được lưu ngay trong trình duyệt, không cần tài khoản hay máy chủ dữ liệu.

## Tính năng

- Sáu bộ từ mẫu: **Basic English, Animals, Vehicles, Colors, Food, Nature**. Có thể tạo bộ riêng và thêm, sửa, xóa, tìm kiếm từ. Mỗi bộ chứa tối đa **500 từ**; các bộ mẫu ban đầu chưa có đủ 500 từ.
- Ưu tiên bản ghi phát âm từ Wiktionary/Wikimedia Commons; hỗ trợ chọn giọng **UK/US** và giọng Web Speech dự phòng.
- Gõ nhanh nhiều chữ để xếp hàng bắn. Nòng pháo xoay về ô chữ cần điền; có nút **Nghe lại** và **Nghe chậm**.
- Hiển thị từ hoàn chỉnh và nghĩa tiếng Việt khi bắn đúng hoặc khi ô từ chạm tường. Ván chơi có điểm, mạng và màn kết quả **VICTORY/DEFEAT**.
- Có chế độ ngày/đêm, tuyết nền, hiệu ứng chiến trường, tiếng pháo và tiếng nổ; có thể chỉnh tốc độ rơi, bật/tắt hiệu ứng âm thanh và phóng to màn chơi.

## Cài đặt và chạy

Cần có **Node.js** và **npm**. Clone dự án rồi chạy:

```bash
git clone https://github.com/shaunyasuo30/Word-Castle.git
cd Word-Castle
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, thường là `http://localhost:5173`. Dự án dùng TSX nên cần chạy qua **Vite**; mở trực tiếp `index.html` bằng Live Server/Go Live sẽ không chạy đúng.

## Cách chơi

1. Chọn một bộ từ và bấm **Bắt đầu**.
2. Chọn giọng đọc, bấm **Bật âm thanh & bắt đầu** và chờ màn đếm ngược **GO!**.
3. Nghe từ rồi gõ các chữ cái **A–Z** theo đúng thứ tự. Mỗi chữ là một phát bắn.
4. Dùng **Nghe lại**, **Nghe chậm** hoặc điều chỉnh tốc độ rơi khi cần. Đừng để ô từ chạm tường.

## Các lệnh

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy ứng dụng để phát triển. |
| `npm test` | Chạy kiểm thử Vitest. |
| `npm run build` | Kiểm tra TypeScript và tạo bản phát hành trong `dist/`. |
| `npm run preview` | Xem thử bản build trên máy. |

Để đưa game lên một trang web công khai, hãy build rồi triển khai nội dung `dist/` lên dịch vụ hosting tĩnh. Việc đẩy mã lên GitHub chỉ lưu mã nguồn; nó không tự xuất bản game.

## Dữ liệu và âm thanh

Bộ từ tự tạo và các lựa chọn cá nhân được lưu bằng `localStorage` theo địa chỉ trang. Xóa dữ liệu trình duyệt hoặc chuyển sang địa chỉ khác có thể làm bạn không còn thấy dữ liệu cũ. Từ tiếng Anh trong kho chỉ nhận chữ A–Z, không có khoảng trắng.

Bản ghi phát âm từ vựng cần Internet. Nếu không tải được bản ghi, game dùng giọng Web Speech của trình duyệt nếu có. Hiệu ứng tiếng pháo, tiếng nổ và các tiếng hô **GO/VICTORY/DEFEAT** nằm trong `public/sfx/` và được tải từ chính ứng dụng. Nguồn các bản thu cùng giấy phép CC0 được ghi tại [public/sfx/SOURCE.md](public/sfx/SOURCE.md). Dự án không sử dụng bản ghi Cambridge.

## Cấu trúc dự án

```text
src/
├── App.tsx              # Điều hướng các màn hình
├── components/          # Kho từ và giao diện màn chơi
├── data/sampleSets.ts   # Các bộ từ mẫu
├── game/                # Luật chơi và phần vẽ Canvas
└── services/            # Lưu dữ liệu, phát âm và hiệu ứng âm thanh
public/sfx/              # Bản thu âm thanh và thông tin nguồn
```
