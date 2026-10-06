# Word Castle

Word Castle là game luyện nghe và chính tả tiếng Anh trên trình duyệt. Nghe từ, gõ từng chữ cái để điều khiển pháo bắn vào ô từ trước khi nó chạm tường.

Dự án dùng React, TypeScript, Vite và Canvas. Bộ từ, lịch sử chơi và cài đặt được lưu trong `localStorage` của trình duyệt; không cần tài khoản hoặc cơ sở dữ liệu.

## Tính năng

- Sáu bộ từ mẫu và bộ từ tự tạo. Có thể thêm, sửa, xóa, tìm kiếm, nhập CSV/JSON và sao lưu dữ liệu học tập.
- Tra từ tiếng Anh trong **Kho từ vựng**: hiện nghĩa tiếng Việt, phiên âm, phát âm, loại từ, định nghĩa và ví dụ. Có thể thêm kết quả vào bộ từ đang học.
- Nhiều chế độ luyện, mức khó, điểm, combo, thống kê và ôn lại từ sai.
- Giọng UK/US, bản ghi phát âm khi có, giọng đọc của trình duyệt khi cần; có nút nghe lại và nghe chậm.
- Bàn phím chữ ảo trên màn hình cảm ứng, giao diện cho điện thoại, chế độ ngày/đêm và rồng bay khạc lửa trong cảnh chơi.

## Chạy trên máy

Cần Node.js và npm. Trong thư mục project, chạy:

```bash
npm ci
npm run dev
```

Mở địa chỉ Vite in ra trong terminal, thường là `http://localhost:5173`. Cần chạy qua Vite để các endpoint tra từ hoạt động; mở trực tiếp `index.html` bằng Live Server không hỗ trợ chúng.

```bash
npm test       # Chạy kiểm thử
npm run build  # Kiểm tra TypeScript và tạo dist/
npm run preview
```

`npm run preview` chỉ xem bản build tĩnh; để thử đầy đủ phần tra nghĩa tiếng Việt trên máy, dùng `npm run dev`.

## Cách chơi

1. Chọn bộ từ và bấm **Bắt đầu**.
2. Chọn chế độ luyện, mức khó và giọng đọc; bấm **Bật âm thanh & bắt đầu**.
3. Nghe từ rồi gõ các chữ cái A–Z theo thứ tự, hoặc dùng bàn phím ảo trên điện thoại.
4. Dùng **Nghe lại**, **Nghe chậm** hoặc **Pause/Resume** khi cần. Sau ván chơi, xem kết quả và chọn **Ôn lại từ sai**.

## Tra từ và lưu dữ liệu

Phần **Dictionary** lấy nghĩa tiếng Việt qua Google Translate và dùng [MyMemory](https://mymemory.translated.net/doc/spec.php) khi nguồn đầu tiên bị giới hạn. Loại từ, định nghĩa, ví dụ và audio được lấy từ [Free Dictionary API](https://dictionaryapi.dev/). Nút loa ưu tiên audio của API; nếu không có thì dùng Web Speech của trình duyệt. Không có dữ liệu từ điển được ghi cứng trong ứng dụng.

Ứng dụng gọi `/api/translate` để lấy nghĩa tiếng Việt và ưu tiên `/api/dictionary` để lấy dữ liệu từ điển; nếu endpoint từ điển không khả dụng, trình duyệt thử gọi Free Dictionary API trực tiếp. Hai endpoint cùng domain này chạy bằng Vite khi phát triển và bằng Vercel Functions khi triển khai. Nghĩa tiếng Việt có thể dùng ngay trong lúc định nghĩa chi tiết còn tải. Vì vậy tính năng tra nghĩa tiếng Việt cần môi trường có hỗ trợ các endpoint `api/`; chỉ tải riêng thư mục `dist/` lên hosting tĩnh sẽ thiếu tính năng này. Tra từ cần Internet và các dịch vụ miễn phí có thể tạm thời gián đoạn.

Khi thêm từ đã tra, bạn có thể sửa nghĩa tiếng Việt trước khi lưu. Từ được đưa vào đúng bộ từ hiện có và dùng ngay trong game. Game chỉ nhận từ tiếng Anh gồm chữ A–Z, tối đa 14 ký tự; mỗi bộ chứa tối đa 500 từ.

`localStorage` gắn với địa chỉ trang và trình duyệt đang dùng. Xóa dữ liệu trình duyệt hoặc đổi địa chỉ trang có thể làm mất dữ liệu đã lưu; hãy dùng **Sao lưu toàn bộ** trong Kho từ vựng để tải bản sao JSON.

## Đưa mã lên GitHub và triển khai

Repository hiện dùng nhánh `master`. Kiểm tra các file trước khi đưa lên GitHub, rồi chạy:

```bash
git status --short
git add .
git commit -m "Update Word Castle dictionary and mobile layout"
git push origin master
```

`.gitignore` loại `node_modules/`, `dist/`, file môi trường và cấu hình Vercel cục bộ. Giữ `package-lock.json`, thư mục `api/`, mã nguồn và các file âm thanh trong `public/` trong commit.

Để trang công khai có đủ chức năng tra từ, kết nối repository với [Vercel](https://vercel.com/docs/frameworks/frontend/vite), chọn project Vite ở thư mục gốc, build bằng `npm run build` và dùng thư mục output `dist`. Các file trong `api/` sẽ được triển khai thành Vercel Functions. Nếu project Vercel đã kết nối với repository và `master` là nhánh production, push lên `master` sẽ tạo bản triển khai mới. Kiểm tra `/api/translate?word=beautiful` và `/api/dictionary?word=beautiful` trên domain sau khi triển khai.

## Cấu trúc chính

```text
api/                 # Endpoint tra nghĩa tiếng Việt và dữ liệu từ điển
public/sfx/          # Âm thanh game và thông tin nguồn
src/components/      # Giao diện game, kho từ và thống kê
src/game/            # Luật chơi và phần vẽ Canvas
src/services/        # Tra từ, âm thanh và lưu dữ liệu học tập
```

Nguồn và giấy phép của các bản thu game được ghi trong [public/sfx/SOURCE.md](public/sfx/SOURCE.md).
