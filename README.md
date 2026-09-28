# Hệ Thống Quản Lý & Điểm Danh CLB Cầu Lông (SMASH)

Ứng dụng web chuyên biệt phục vụ vận hành, tính tiền sân theo số buổi trong tháng, quản lý số dư ví thành viên, thu chi quỹ và bốc thăm chia sân cho **CLB Cầu Lông**.

---

## 🌟 Chi Tiết Các Chức Năng Đã Có

### 1. Trang Chủ (Dashboard)
- **3 Thẻ Chỉ Số KPI Trực Quan Trên Cùng 1 Dòng:**
  - **Quỹ CLB:** Số dư khả dụng hiện tại, tổng hợp thu chi chung của CLB (tiền mua cầu, thuê sân cố định, nước uống, tài trợ).
  - **Quỹ Tạm Ứng:** Quỹ thành viên ứng trước / tiền cọc giải đấu, cọc sân dài hạn.
  - **Tổng Ví Thành Viên:** Tổng số dư tiền gửi trong ví của tất cả các thành viên trong CLB.
- **Theo dõi ví từng thành viên:** Bảng tra cứu trực quan số dư thực tế, số buổi đã tham gia trong tháng, cảnh báo ví bị âm tiền, nút nạp ví nhanh cho từng người.
- **Giao dịch gần đây:** Nhật ký thời gian thực ghi nhận biến động dòng tiền (Nạp ví, Tiền sân, Thu/Chi quỹ, Phạt, Tạm ứng).

### 2. Điểm Danh & Tự Động Tính Bậc Tiền Sân
- **Phân loại đối tượng khi điểm danh:**
  - **Thành viên chính thức (Official):** Hội viên gắn bó lâu dài.
  - **Thành viên danh dự (Honorary):** Hội viên danh dự, khách quý CLB.
  - **Khách giao lưu (A/B/C):** Khách ngoài đến giao lưu theo từng mức phí.
- **Cơ chế tính bậc tiền sân theo số buổi trong tháng:**
  - **0 – 4 buổi:** `50.000đ/buổi`
  - **5 – 9 buổi:** `100.000đ/buổi`
  - **10 – 15 buổi:** `150.000đ/buổi`
  - **16 – 30+ buổi:** `200.000đ/buổi`
  - *(Các mức buổi và đơn giá có thể thay đổi linh hoạt trong phần Cấu hình)*
- **Tạo điểm danh nhanh đa năng (Quick Attendance):**
  - **⚡ Điểm danh 1-chạm:** Nút `⚡` ngay tại hàng thành viên trên Trang chủ hoặc bảng điểm danh -> Hệ thống hiển thị số tiền trừ theo bậc và số dư ví, xác nhận 1 phát là xong ngay!
  - **📋 Dán danh sách Zalo / Messenger:** Copy danh sách người tham gia từ Zalo (ví dụ: `1. Tuấn`, `2. Hoàng`, `3. Hương...`) dán vào ô, hệ thống tự động bóc tách số thứ tự, nhận diện và khớp chính xác tên hội viên trong CLB -> Bấm **"⚡ Điểm danh toàn bộ danh sách đã khớp"** để trừ ví hàng loạt trong 1 giây!
  - **👥 Điểm danh theo nhóm:** 1 click điểm danh toàn bộ Thành viên chính thức hoặc Thành viên danh dự.
- **Tự động trừ tiền vào ví thành viên:** Khi bấm xác nhận điểm danh, hệ thống tự tính tổng tiền, trừ trực tiếp vào ví của từng thành viên, tự động tăng số buổi tham gia trong tháng, ghi nhận doanh thu vào Quỹ CLB và lưu lịch sử giao dịch.

### 3. Thanh Toán & Quỹ
- **Thu / Chi Quỹ CLB:** Ghi nhận chi phí mua ống cầu Victor / Yonex, tiền thuê sân tháng cố định, nước uống hoặc thu tiền tài trợ.
- **Quỹ thành viên ứng trước:** Quản lý tiền cọc giải đấu nội bộ hoặc thành viên nộp ứng trước.
- **Nạp tiền vào ví:** Hỗ trợ nạp tiền mặt hoặc chuyển khoản (VietQR), tự động cộng số dư ví.
- **Tự ghi nhận chi phí sân:** Tự động kết chuyển chi phí điểm danh vào lịch sử và quỹ.
- **Theo dõi lịch sử giao dịch:** Bộ lọc giao dịch theo loại (Nạp ví, Tiền sân, Thu quỹ, Chi quỹ, Phạt, Tạm ứng) và tìm kiếm theo tên/nội dung.

### 4. Quản Lý Thành Viên & Đổi Tên Nhanh
- **✏️ Chỉnh sửa tên thành viên trực tiếp (Admin):** Nhấp vào biểu tượng chiếc bút cạnh tên bất kỳ thành viên nào (trên Trang chủ, Điểm danh, hay Quản lý thành viên) để đổi tên hoặc số điện thoại. Hệ thống tự động đồng bộ hóa tên mới xuyên suốt mọi bản ghi giao dịch và lịch sử điểm danh.
- **Tạo thành viên chính thức:** Điền họ tên, số điện thoại, số dư ví ban đầu.
- **Tạo tài khoản đăng nhập:** Thiết lập username/password cho từng thành viên tra cứu ví cá nhân.
- **Cấp lại mật khẩu:** Khôi phục và đặt mật khẩu mới nhanh chóng khi thành viên quên.
- **Tạo thành viên danh dự:** Hội viên danh dự của CLB.
- **Tạo khách giao lưu A/B/C:** Thêm nhanh khách giao lưu trực tiếp tại sân với đơn giá riêng.

### 5. Bốc Thăm Chia Sân & Ghép Cặp Cầu Lông (Matchmaker)
- Tích chọn danh sách các bạn có mặt trên sân -> Bấm **"Tạo lượt đấu ngẫu nhiên"**.
- Tự động chia các sân đấu theo thể thức:
  - **Đánh Đôi (2 vs 2):** Cặp đôi Áo Xanh vs Cặp đôi Áo Đỏ (Sân 1, Sân 2...).
  - **Đánh Đơn (1 vs 1):** Tay vợt 1 vs Tay vợt 2.
  - Tự động sắp xếp người nghỉ ngơi chờ đổi ca nếu số lượng người lẻ.

### 6. Cấu Hình & Sao Lưu Dữ Liệu
- **Tên CLB:** Tùy biến tên CLB hiển thị (VD: `CLB CẦU LÔNG SMASH`).
- **Màu giao diện:** BWF Emerald Green (Xanh thảm cầu lông BWF), Badminton Cyan (Xanh lông vũ), Ocean Blue, Sunset Orange, Yonex Crimson Red, Royal Purple.
- **Đơn giá khách A/B/C:** Cài đặt giá tiền sân riêng cho từng nhóm khách.
- **Mức phạt:** Cài đặt mức phạt mặc định khi đi muộn hoặc hủy sân sát giờ.
- **Cấu hình bậc tiền sân:** Thêm, sửa, xóa các khoảng buổi và đơn giá tương ứng.
- **Sao lưu / Khôi phục dữ liệu:**
  - **Export JSON:** Tải tệp sao lưu về máy an toàn.
  - **Import JSON:** Khôi phục lại toàn bộ dữ liệu từ tệp sao lưu.
  - **Reset Demo Data:** Đưa về dữ liệu mẫu ban đầu.

---

## 🔑 Tài Khoản Quản Trị Mẫu

- **Tài khoản:** `admin`
- **Mật khẩu:** `admin123`

---

## 🚀 Hướng Dẫn Khởi Chạy Ứng Dụng

Ứng dụng được thiết kế dạng Single Page Application thuần (HTML5 + Tailwind CSS + Lucide Icons + Vanilla JS), chạy trực tiếp trên mọi trình duyệt mà không cần cài đặt database hay Node.js:

1. **Mở trực tiếp:**
   Nhấp đúp chuột vào tệp [index.html](file:///C:/Users/ADMIN/.gemini/antigravity/scratch/clb-cau-long/index.html) để mở trên Google Chrome, Microsoft Edge, Firefox hoặc Safari.

2. **Chạy qua Local Web Server (Tùy chọn):**
   ```powershell
   cd C:\Users\ADMIN\.gemini\antigravity\scratch\clb-cau-long
   python -m http.server 8080
   ```
   Sau đó mở trình duyệt truy cập: `http://localhost:8080`
