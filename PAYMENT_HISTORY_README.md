# Payment History Feature

## Tổng quan
Tính năng lịch sử thanh toán cho phép người dùng xem và quản lý tất cả các giao dịch thanh toán của họ, đặc biệt là các subscription đang pending.

## Tính năng chính

### 1. Nút "Xem lịch sử" trên trang Subscription Plans
- Vị trí: Header của trang Subscription Plans
- Chức năng: Chuyển hướng đến trang lịch sử thanh toán
- Icon: FaHistory từ react-icons

### 2. Trang Payment History
- **URL**: `/payment-history`
- **Giao diện**: Dark theme phù hợp với ứng dụng
- **Layout**: 2 cột - danh sách giao dịch và chi tiết giao dịch

### 3. Hiển thị các subscription đang pending
- **Vị trí**: Phần đầu trang Payment History
- **Hiển thị**: Grid layout với các card nhỏ
- **Thông tin**: Tên gói, số tiền, mã giao dịch, ngày tạo
- **Trạng thái**: Badge màu vàng với icon đồng hồ

### 4. Danh sách tất cả giao dịch
- **Vị trí**: Cột bên trái
- **Sắp xếp**: Theo thời gian tạo
- **Thông tin**: Tên gói, mã giao dịch, số tiền, trạng thái, ngày tạo
- **Tương tác**: Click để xem chi tiết

### 5. Chi tiết giao dịch
- **Vị trí**: Cột bên phải
- **Thông tin**: Đầy đủ thông tin gói, trạng thái, phương thức thanh toán
- **Chức năng**: Chọn phương thức thanh toán cho giao dịch pending

## API Endpoints được sử dụng

### 1. Lấy lịch sử thanh toán
```
GET /api/payments/history/{userId}
```

### 2. Lấy chi tiết thanh toán
```
GET /api/payments/detail/{paymentId}
```

### 3. Chọn phương thức thanh toán
```
POST /api/payments/{paymentId}/select-method
```

### 4. Lấy thông tin thanh toán ngân hàng
```
GET /api/payments/{paymentId}/bank-transfer
```

### 5. Lấy thông tin thanh toán ZaloPay
```
GET /api/payments/{paymentId}/zalopay
```

## Components được tạo/cập nhật

### 1. PaymentHistory.tsx
- Component chính cho trang lịch sử thanh toán
- Giao diện dark theme với Tailwind CSS
- Responsive design cho mobile và desktop

### 2. SubscriptionPlans.tsx
- Thêm nút "Xem lịch sử" vào header
- Import FaHistory icon

### 3. paymentService.ts
- Thêm các method mới:
  - `getPaymentHistory(userId)`
  - `getPaymentDetail(paymentId)`
  - `selectPaymentMethod(paymentId, request)`
  - `canSelectPaymentMethod(paymentId)`

### 4. RouteConfig.tsx
- Route đã có sẵn: `/payment-history`

## Cách sử dụng

### 1. Từ trang Subscription Plans
1. Click nút "Xem lịch sử" ở góc phải header
2. Chuyển đến trang Payment History

### 2. Xem các subscription đang pending
1. Các giao dịch pending sẽ hiển thị ở đầu trang
2. Click vào card để xem chi tiết

### 3. Chọn phương thức thanh toán
1. Chọn giao dịch pending từ danh sách
2. Click "Chọn phương thức thanh toán"
3. Chọn Bank Transfer hoặc ZaloPay
4. Làm theo hướng dẫn thanh toán

### 4. Xem chi tiết giao dịch
1. Click vào giao dịch từ danh sách bên trái
2. Xem thông tin chi tiết bên phải
3. Thực hiện các hành động cần thiết

## Trạng thái thanh toán

- **Pending**: Đang chờ xử lý (màu vàng)
- **Completed**: Hoàn thành (màu xanh)
- **Failed**: Thất bại (màu đỏ)
- **Cancelled**: Đã hủy (màu xám)

## Responsive Design

- **Desktop**: Layout 2 cột với sidebar
- **Tablet**: Layout 1 cột, danh sách và chi tiết xếp dọc
- **Mobile**: Layout tối ưu cho màn hình nhỏ

## Lưu ý

1. Cần đăng nhập để xem lịch sử thanh toán
2. Chỉ hiển thị giao dịch của user hiện tại
3. Các giao dịch pending có thể chọn phương thức thanh toán
4. Giao diện tự động refresh khi có thay đổi
