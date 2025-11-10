# Hướng dẫn sử dụng tính năng Subscription và Thanh toán

## Tổng quan

Hệ thống đã được tích hợp đầy đủ các tính năng để quản lý gói cước và thanh toán, bao gồm:

- **Nâng cấp gói tài khoản**: Người dùng có thể mua các gói cước khác nhau
- **Thanh toán qua ngân hàng**: Hỗ trợ chuyển khoản ngân hàng với QR code
- **Thanh toán qua ZaloPay**: Hỗ trợ ví điện tử ZaloPay với QR code và payment URL
- **Quản lý subscription**: Xem thông tin, hủy gói, bật/tắt tự động gia hạn
- **Tích hợp đầy đủ với backend**: Truyền userId, xử lý response đúng format

## Cấu trúc file

### 1. API Services

- `src/api/paymentService.ts` - Xử lý thanh toán
- `src/api/subscriptionService.ts` - Quản lý subscription
- `src/api/subscriptionPlanService.ts` - Quản lý gói cước

### 2. Components

- `src/pages/Checkout/Checkout.tsx` - Trang thanh toán chính
- `src/pages/Checkout/PaymentMethodSelector.tsx` - Chọn hình thức thanh toán
- `src/pages/Checkout/BankTransferPayment.tsx` - Thanh toán ngân hàng
- `src/pages/Checkout/ZaloPayPayment.tsx` - Thanh toán ZaloPay
- `src/pages/Profile/SubscriptionInfo.tsx` - Thông tin subscription
- `src/pages/Profile/CancelSubscriptionModal.tsx` - Modal hủy gói

## Luồng hoạt động

### 1. Mua gói cước

1. Người dùng vào trang `/plans`
2. Chọn gói cước muốn mua
3. Nhấn "Mua gói này"
4. Chuyển đến trang checkout `/checkout/:planId`
5. Chọn hình thức thanh toán (ngân hàng hoặc ZaloPay)
6. Thực hiện thanh toán theo hướng dẫn
7. Hệ thống kiểm tra và kích hoạt gói

### 2. Thanh toán ngân hàng

1. Chọn "Chuyển khoản ngân hàng"
2. Hệ thống hiển thị thông tin tài khoản
3. Copy thông tin cần thiết
4. Thực hiện chuyển khoản qua ứng dụng ngân hàng
5. Nhấn "Kiểm tra thanh toán" để xác nhận

### 3. Thanh toán ZaloPay

1. Chọn "ZaloPay"
2. Hệ thống hiển thị mã QR và thông tin đơn hàng
3. Quét mã QR bằng ứng dụng ZaloPay
4. Hoàn tất thanh toán trong ứng dụng
5. Nhấn "Kiểm tra thanh toán" để xác nhận

### 4. Quản lý subscription

1. Vào trang Profile
2. Xem thông tin gói cước hiện tại
3. Bật/tắt tự động gia hạn
4. Hủy gói nếu cần

## API Endpoints

### Payment API

```
POST /payments - Tạo đơn hàng thanh toán
GET /payments/{id}/bank-transfer - Lấy thông tin ngân hàng
GET /payments/{id}/zalopay - Lấy thông tin ZaloPay
GET /payments/{id}/status - Kiểm tra trạng thái thanh toán
POST /payments/{id}/cancel - Hủy thanh toán
GET /payments/banks - Lấy danh sách ngân hàng hỗ trợ
```

### Subscription API

```
GET /subscriptions/current - Lấy subscription hiện tại
GET /subscriptions/history - Lấy lịch sử subscription
POST /subscriptions/cancel - Hủy subscription
PUT /subscriptions/{id}/auto-renew - Bật/tắt tự động gia hạn
GET /subscriptions/{id} - Lấy chi tiết subscription
POST /subscriptions/{id}/renew - Gia hạn subscription
```

## Cấu hình

### 1. Ngân hàng

Cần cấu hình thông tin tài khoản ngân hàng trong backend:
- Mã ngân hàng
- Số tài khoản
- Tên tài khoản
- Nội dung chuyển khoản mẫu
- QR code tự động tạo từ thông tin chuyển khoản

### 2. ZaloPay

Cần cấu hình thông tin ZaloPay trong backend:
- App ID
- App Secret
- Callback URL
- Payment URL để redirect người dùng
- QR code cho thanh toán
- Sandbox/Production mode

## Xử lý lỗi

### 1. Thanh toán thất bại

- Hiển thị thông báo lỗi cụ thể
- Cho phép thử lại hoặc chọn phương thức khác
- Lưu log để debug

### 2. Mạng chậm

- Hiển thị loading state
- Timeout cho các request
- Retry mechanism

### 3. Validation

- Kiểm tra dữ liệu đầu vào
- Validate số tiền, thông tin ngân hàng
- Sanitize input để tránh XSS

## Bảo mật

### 1. Authentication

- Tất cả API đều yêu cầu đăng nhập
- JWT token validation
- Role-based access control

### 2. Data Protection

- Mã hóa thông tin thanh toán
- Không lưu thông tin nhạy cảm
- HTTPS cho tất cả request

### 3. Rate Limiting

- Giới hạn số lần gọi API
- Prevent brute force attacks
- DDoS protection

## Testing

### 1. Component Test

Đã tạo `PaymentTest.tsx` để test API integration:
- Test tạo payment với userId
- Test lấy danh sách ngân hàng
- Hiển thị response từ backend

### 2. Unit Tests

- Test các service functions
- Mock external API calls
- Validate business logic

### 2. Integration Tests

- Test payment flow end-to-end
- Test error scenarios
- Test edge cases

### 3. Manual Testing

- Test trên các trình duyệt khác nhau
- Test responsive design
- Test accessibility

## Deployment

### 1. Environment Variables

```bash
# Payment Configuration
PAYMENT_API_URL=https://api.payment.com
ZALOPAY_APP_ID=your_app_id
ZALOPAY_APP_SECRET=your_app_secret
ZALOPAY_SANDBOX=true

# Bank Configuration
BANK_ACCOUNT_NUMBER=123456789
BANK_ACCOUNT_NAME=Company Name
BANK_CODE=VCB
```

### 2. Build Commands

```bash
# Development
npm run dev

# Production Build
npm run build

# Preview Production
npm run preview
```

## Monitoring

### 1. Payment Success Rate

- Track tỷ lệ thanh toán thành công
- Monitor failed payments
- Alert khi có vấn đề

### 2. Performance Metrics

- Response time của API
- Error rate
- User experience metrics

### 3. Logs

- Payment logs
- Error logs
- Access logs

## Troubleshooting

### 1. Thanh toán không thành công

- Kiểm tra thông tin ngân hàng
- Verify ZaloPay configuration
- Check network connectivity
- Review server logs

### 2. Gói không được kích hoạt

- Verify payment status
- Check subscription creation
- Review database records
- Contact support

### 3. UI không hiển thị

- Check browser console
- Verify component imports
- Check routing configuration
- Clear browser cache

## Hỗ trợ

Nếu gặp vấn đề, vui lòng:

1. Kiểm tra logs trong console
2. Review network requests
3. Verify configuration
4. Contact development team

## Cập nhật

Hệ thống sẽ được cập nhật thường xuyên với:

- Bug fixes
- Security patches
- New features
- Performance improvements

---

**Lưu ý**: Đây là tài liệu hướng dẫn cơ bản. Để biết thêm chi tiết, vui lòng tham khảo source code hoặc liên hệ team development.
