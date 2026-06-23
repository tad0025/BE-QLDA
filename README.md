# 🎬 CINEPLEX - Hệ thống Quản lý Rạp Chiếu Phim & Đặt Vé Trực Tuyến

CINEPLEX là một hệ thống web full-stack hiện đại hỗ trợ quản lý rạp chiếu phim, vận hành suất chiếu và cung cấp nền tảng đặt vé trực tuyến cho khách hàng. Hệ thống nổi bật với tính năng giữ ghế theo thời gian thực (Real-time seat hold), tích hợp thanh toán trực tuyến và xuất vé điện tử mã QR.

## 👥 Đội ngũ phát triển (Nhóm 03)

* **Nguyễn Sư Thành Đạt** - 23110089
* **Hà Trường Giang** - 23110095
* **Lê Nguyễn Đăng Khoa** - 23110115
* **Trịnh Đại Nghĩa** - 23110131

Giảng viên hướng dẫn: **Ths. Nguyễn Minh Đạo** (Trường Đại học Công Nghệ Kỹ Thuật Thành phố Hồ Chí Minh - Khoa Công Nghệ Thông Tin).

## 🚀 Công nghệ sử dụng

Hệ thống được phát triển dựa trên kiến trúc Layered Architecture phân tách rõ ràng giữa Frontend và Backend.

**Frontend (Client/Admin/Staff SPA):**

* ReactJS + Vite
* Tailwind CSS (Styling)
* React Router DOM (Routing)
* Axios (HTTP Client)
* Socket.io-client (Real-time updates)
* Html5-Qrcode & qrcode.react (Quét và sinh mã QR)

**Backend (RESTful API):**

* NestJS (TypeScript Framework)
* TypeORM & MySQL (Database)
* Redis (Caching & Distributed Lock cho sơ đồ ghế)
* Socket.io (WebSocket Gateway)
* Nodemailer (Gửi Email tự động)
* Cloudinary (Lưu trữ hình ảnh/poster)
* Tích hợp thanh toán: MoMo, VNPay, PayPal (Sandbox)

## ✨ Các tính năng nổi bật

### 👤 Dành cho Khách hàng (Customer)

* **Xác thực:** Đăng nhập/Đăng ký an toàn với mã OTP qua Email, phân quyền bằng JWT.
* **Tra cứu:** Tìm kiếm phim, xem chi tiết (trailer, mô tả, độ tuổi), lịch chiếu theo rạp/ngày.
* **Đặt vé Real-time:** Sơ đồ ghế động. Khi chọn ghế, ghế sẽ được khóa tạm thời trong **5 phút** qua Redis & Socket.io để tránh trùng lặp.
* **Dịch vụ đi kèm:** Đặt thêm Bắp, Nước, Combo ngay trong luồng checkout.
* **Khuyến mãi & Tích điểm:** Áp dụng mã giảm giá, tích điểm (Loyalty points) sau mỗi giao dịch thành công và dùng điểm để đổi vé/combo.
* **Thanh toán & E-Ticket:** Thanh toán qua VNPay, MoMo hoặc PayPal. Nhận vé QR Code qua Email tự động ngay sau khi thanh toán.

### 🛡️ Dành cho Quản trị viên (Admin)

* **Dashboard:** Biểu đồ doanh thu trực quan, thống kê vé bán, đơn hàng mới nhất và tỷ lệ lấp đầy.
* **Quản lý Rạp & Phòng chiếu:** Tạo chi nhánh rạp, cấu hình phòng chiếu (Standard, VIP, Couple, IMAX) và tự động sinh layout ghế.
* **Lập lịch chiếu (Scheduling):** Tạo suất chiếu đơn hoặc hàng loạt (Bulk create). Hệ thống tự động validation **chống trùng lịch phòng chiếu**.
* **Quản lý danh mục:** CRUD Phim (kèm upload Poster lên Cloudinary), Giá vé (cuối tuần/ngày thường), Sản phẩm bắp nước, Mã khuyến mãi.

### 🧑💼 Dành cho Nhân viên (Staff)

* **Soát vé (Check-in):** Quét mã QR trực tiếp bằng Camera từ thiết bị tại quầy để xác nhận vé, chống quét lại (Double check-in prevention).
* **Bán vé tại quầy (Offline Sale):** Chọn suất chiếu, ghế, bắp nước và tạo đơn hàng thanh toán tiền mặt trực tiếp cho khách lẻ.

---

## 🛠️ Hướng dẫn Cài đặt & Chạy dự án

### Yêu cầu hệ thống

* **Node.js** (Khuyến nghị v18+)
* **MySQL** (Đang chạy ở cổng 3306)
* **Redis** (Đang chạy ở cổng 6379)

### 1. Khởi chạy Backend

Mở terminal và di chuyển vào thư mục Backend (`BE-QLDA`):

```bash
cd BE-QLDA
npm ci
```

Tạo file `.env` ở thư mục root của Backend và điền các thông tin sau:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=qlda_movie

# Security
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_ACCESS_EXPIRES_IN=1d

# Redis (Real-time Seat Locking)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email SMTP (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM=your_email@gmail.com

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Tích hợp thanh toán (Cấu hình sandbox keys)
# VNP_TMN_CODE, VNP_HASH_SECRET, MOMO_PARTNER_CODE... (Xem thêm trong config)
```

Build và chạy Backend:

```bash
npm run build
npm run start:dev
```

*Lưu ý: Hệ thống được cấu hình `synchronize: true` ở chế độ dev nên sẽ tự động đồng bộ Schema với DB MySQL.*

### 2. Khởi chạy Frontend

Mở một terminal khác và di chuyển vào thư mục Frontend (`src-fe` / `FE-QLDA-MovieManagement`):

```bash
cd FE-QLDA-MovieManagement
npm ci
```

Tạo file `.env` ở thư mục root của Frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=ws://localhost:3000
```

Chạy Frontend:

```bash
npm run dev
```

Trang web sẽ chạy tại địa chỉ: `http://localhost:5173`

---

## 📖 Kịch bản trải nghiệm (Demo Flow)

1. **Khởi tạo dữ liệu (Admin):** Đăng nhập quyền Admin -> Thêm Phim -> Tạo Rạp & Phòng chiếu -> Thiết lập giá vé -> Tạo suất chiếu.
2. **Đặt vé trực tuyến (Customer):** Khách hàng đăng ký/đăng nhập -> Chọn phim & khung giờ -> Chọn ghế (Kiểm tra cơ chế lock 5 phút và cập nhật real-time ở tab khác) -> Chọn bắp nước -> Thanh toán Sandbox (MoMo/VNPay).
3. **Nhận vé:** Kiểm tra hộp thư Email để nhận E-Ticket (Mã QR).
4. **Soát vé (Staff):** Nhân viên mở trang Kiểm duyệt -> Quét mã QR từ màn hình khách hàng -> Hệ thống báo thành công (Quét lại sẽ báo vé đã sử dụng).
