# HỆ THỐNG QUẢN LÝ CLB CẦU LÔNG (LẬP TRÍ) - BẢN VẬN HÀNH THỰC TẾ

Ứng dụng web chuyên biệt phục vụ vận hành thực tế cho **Câu Lạc Bộ Cầu Lông**:
- **Quản lý sân, tiền cầu:** Tự động chia tiền cầu theo số quả thực tế trong buổi sau khi trừ khách giao lưu.
- **Tính bậc tiền sân:** Tự động tính tiền sân theo số buổi sinh hoạt trong tháng (0–4 buổi, 5–9 buổi, 10–15 buổi, 16+ buổi).
- **Quản lý ví thành viên:** Trừ ví tự động, hỗ trợ nợ ví âm, tất toán công nợ cuối ngày/cuối tháng.
- **Sổ quỹ CLB & Quỹ tạm ứng:** Đối soát minh bạch 100% dòng tiền (Thu quỹ, Tiền phạt, Mua cầu, Trả sân, Chi hỷ/hiếu/liên hoan).
- **Đồng bộ đám mây thời gian thực:** Kết nối Google Firebase Realtime Database — khi điểm danh hoặc nạp tiền ví, toàn bộ điện thoại và máy tính của các thành viên đều cập nhật tức thì.

---

## 🚀 HƯỚNG DẪN ĐƯA LÊN NỀN TẢNG MIỄN PHÍ THEO THỜI GIAN THỰC (VERCEL + FIREBASE)

Bạn chỉ mất khoảng **3 - 5 phút** để đưa ứng dụng lên mạng internet hoàn toàn **miễn phí 100%**, có tên miền riêng (ví dụ: `https://clblaptri.vercel.app`) để gửi cho toàn bộ anh em trong CLB cùng truy cập.

---

### BƯỚC 1: Đẩy Mã Nguồn Lên GitHub

1. Trong thư mục dự án `d:\clblaptri`, nhấp đúp chuột vào file:
   👉 **`day-code-len-github.bat`**
2. Cửa sổ dòng lệnh sẽ tự động tải tất cả code lên repository GitHub của bạn: `https://github.com/o936315009/clb`
3. *(Lưu ý: Nếu máy tính yêu cầu đăng nhập tài khoản GitHub, hãy bấm `Sign in with your browser` để xác thực).*

---

### BƯỚC 2: Triển Khai Miễn Phí Trên Vercel (Có Tên Miền Riêng)

[Vercel](https://vercel.com) là nền tảng máy chủ đám mây miễn phí tốt nhất thế giới dành cho ứng dụng web:

1. Truy cập: [https://vercel.com/signup](https://vercel.com/signup)
2. Chọn **"Continue with GitHub"** để đăng nhập bằng tài khoản GitHub của bạn.
3. Tại trang bảng điều khiển (Dashboard) của Vercel:
   - Bấm nút **"Add New..."** ➔ Chọn **"Project"**.
   - Tìm repository **`clb`** (hoặc `o936315009/clb`) trong danh sách ➔ Bấm **"Import"**.
4. Tại màn hình cấu hình dự án:
   - **Project Name:** Đặt tên bạn muốn (ví dụ: `clblaptri` hoặc `clb-laptri`).
   - Các mục khác giữ nguyên mặc định.
   - Bấm nút **"Deploy"**.
5. Đợi khoảng **30 - 60 giây**, màn hình sẽ hiện pháo hoa chúc mừng 🎉 kèm đường dẫn website chính thức của CLB:
   👉 `https://clblaptri.vercel.app` (hoặc tên miền bạn đã chọn).

---

### BƯỚC 3: Cấu Hình Firebase Realtime Database (Đồng Bộ Thời Gian Thực)

Hệ thống đã được tích hợp sẵn với Google Firebase Realtime Database của dự án `clblaptri`. Để mọi người dùng trên điện thoại có thể đọc và đồng bộ dữ liệu mượt mà:

1. Truy cập vào trang quản trị: [Firebase Console](https://console.firebase.google.com/)
2. Chọn dự án: **`clblaptri`** (hoặc tạo mới nếu muốn dùng database riêng).
3. Vào menu bên trái ➔ Chọn **Build** ➔ **Realtime Database**.
4. Chuyển sang tab **"Rules" (Quy tắc)**.
5. Sao chép toàn bộ nội dung từ file `database.rules.json` và dán vào:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "clubs": {
      "$clubId": {
        ".read": true,
        ".write": true
      }
    },
    "memberships": {
      "$clubId": {
        ".read": true,
        ".write": true
      }
    },
    "users": {
      "$uid": {
        ".read": true,
        ".write": true
      }
    },
    "system": {
      ".read": true,
      ".write": true
    }
  }
}
```

6. Bấm nút **"Publish" (Xuất bản)** để lưu quy tắc.
7. Bây giờ, hệ thống đồng bộ 2 chiều thời gian thực (Realtime Sync) đã kích hoạt 100%! Bất kỳ thay đổi nào (điểm danh, nạp ví, tiền sân) sẽ nhảy số ngay lập tức trên máy của tất cả thành viên.

---

### BƯỚC 4: Tạo Biểu Tượng App Màn Hình Chính (PWA) Trên Điện Thoại

Để các thành viên mở CLB nhanh như một ứng dụng app native:

- **Trên iPhone / iPad (Trình duyệt Safari):**
  1. Mở link web CLB trên Safari.
  2. Bấm nút **Chia sẻ** (biểu tượng ô vuông có mũi tên trỏ lên ở thanh dưới).
  3. Cuộn xuống chọn **"Thêm vào MH chính" (Add to Home Screen)** ➔ Bấm **Thêm**.
- **Trên Android (Chrome / Cốc Cốc):**
  1. Mở link web CLB trên Google Chrome.
  2. Bấm vào biểu tượng **3 dấu chấm (⋮)** ở góc trên bên phải.
  3. Chọn **"Thêm vào Màn hình chính"** (hoặc **Cài đặt ứng dụng**).

---

## 🌟 HƯỚNG DẪN BẮT ĐẦU VẬN HÀNH VỚI DỮ LIỆU MỚI

Hệ thống đã được thiết kế sẵn sàng cho dữ liệu hoạt động mới sạch sẽ 100%:

1. **Đăng nhập quản lý ban đầu:**
   - **Tài khoản:** `chinh` hoặc `admin`
   - **Mật khẩu:** `123` (hoặc `123456`)
2. **Nhập danh sách thành viên mới (Hàng loạt trong 1 giây):**
   - Vào tab **"Quản lý thành viên"**.
   - Bấm nút: **`⚡ Dán danh sách Zalo / Excel`**.
   - Dán danh sách họ tên từ nhóm Zalo của bạn (Ví dụ:
     ```text
     1. Nguyễn Văn An - 0901234567
     2. Trần Văn Bình - 0912345678
     3. Lê Hoàng Cường (Danh dự)
     4. Phạm Thị Dung - 0988776655
     5. Vũ Quốc Em
     ```
   - Bấm **"Xác nhận thêm vào CLB"** ➔ Toàn bộ thành viên sẽ được tạo ngay, tự có tài khoản đăng nhập (mật khẩu `123`) và đồng bộ lên đám mây.
3. **Cài đặt thông tin Ngân hàng / VietQR của CLB:**
   - Vào tab **"Cấu hình & Sao lưu"**.
   - Cập nhật số tài khoản, tên ngân hàng và chủ tài khoản vào ô **"Thông tin VietQR / Ngân hàng"** để thành viên quét mã nạp ví.
4. **Tổ chức buổi sinh hoạt đầu tiên:**
   - Vào tab **"Điểm danh"** ➔ Tích chọn các thành viên và khách có mặt.
   - Nhập số lượng quả cầu đã đánh ➔ Hệ thống tự động tính tiền cầu và chia đều cho từng người.
   - Bấm **"Lưu & Chia tiền buổi cầu"** ➔ Ví của từng thành viên được tự động trừ, đồng thời sinh ảnh báo cáo kết quả để chia sẻ ngay vào nhóm Zalo!
5. **Nút Làm Mới Sạch Dữ Liệu:**
   - Trong tab **"Cấu hình & Sao lưu"**, nếu muốn xóa sạch dữ liệu chạy thử bất cứ lúc nào, bạn chỉ cần bấm nút **`🧹 Khởi tạo dữ liệu nhập mới (Sạch 100%)`**.

---

*Chúc Câu Lạc Bộ Cầu Lông hoạt động ngày càng phát triển, sôi nổi và gắn kết! 🏸🔥*
