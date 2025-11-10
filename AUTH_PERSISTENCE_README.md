# Hệ thống Duy trì Đăng nhập (Authentication Persistence)

## Tổng quan

Hệ thống duy trì đăng nhập được thiết kế để giữ người dùng đăng nhập ngay cả khi refresh trang hoặc đóng/mở lại trình duyệt.

## Cách hoạt động

### 1. Lưu trữ dữ liệu
- **Token**: Được lưu trong `localStorage` với key `'token'`
- **User Info**: Được lưu trong `localStorage` với key `'user'` (dạng JSON string)

### 2. Khởi tạo ứng dụng
Khi ứng dụng khởi động:

1. **AuthProvider** được mount đầu tiên
2. **Redux store** được khởi tạo với dữ liệu từ `localStorage`
3. **restoreAuthState()** được gọi để khôi phục trạng thái đăng nhập
4. Nếu có token, tự động gọi API `getCurrentUser()` để xác minh token còn hợp lệ

### 3. Axios Interceptors
- **Request Interceptor**: Tự động thêm `Authorization: Bearer {token}` vào header của mọi request
- **Response Interceptor**: Xử lý lỗi 401 (Unauthorized) bằng cách xóa token và redirect về trang chủ

### 4. Các component chính

#### AuthProvider (`src/components/AuthProvider.tsx`)
```typescript
// Khôi phục trạng thái từ localStorage
useEffect(() => {
  dispatch(restoreAuthState());
}, []);

// Xác minh token khi cần thiết
useEffect(() => {
  if (token && !user) {
    dispatch(getCurrentUser());
  }
}, [token, user]);
```

#### AuthSlice (`src/store/slices/authSlice.ts`)
```typescript
// Khởi tạo state từ localStorage
const getInitialState = (): AuthState => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  // ... parse user data
};

// Lưu token và user khi đăng nhập thành công
.addCase(loginUser.fulfilled, (state, action) => {
  localStorage.setItem('token', action.payload.token);
  localStorage.setItem('user', JSON.stringify(state.user));
})
```

## Sử dụng

### Trong component
```typescript
import { useAuth } from '../hooks/useAuth';

const MyComponent = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return <div>Welcome, {user?.firstName}!</div>;
};
```

### Trong API calls
```typescript
import { songHistoryApi } from '../api/songHistory';

// API sẽ tự động sử dụng userId từ localStorage
const history = await songHistoryApi.getUserHistory();
```

## Xử lý lỗi

### Token hết hạn
1. Axios interceptor phát hiện lỗi 401
2. Tự động xóa token và user từ localStorage
3. Redirect về trang chủ
4. Redux store được reset về trạng thái chưa đăng nhập

### Lỗi network
- Hiển thị thông báo lỗi cho người dùng
- Cho phép thử lại hoặc logout

## Bảo mật

### Token Storage
- Token được lưu trong `localStorage` (có thể bị XSS attack)
- Có thể cân nhắc sử dụng `httpOnly` cookies cho bảo mật cao hơn

### Token Validation
- Token được validate mỗi khi gọi API `getCurrentUser()`
- Tự động logout nếu token không hợp lệ

## Cải tiến có thể thực hiện

1. **Refresh Token**: Implement refresh token để tự động gia hạn access token
2. **Remember Me**: Thêm option "Remember Me" với token có thời hạn dài hơn
3. **Session Management**: Theo dõi và quản lý session trên server
4. **Secure Storage**: Sử dụng `httpOnly` cookies thay vì localStorage

## Troubleshooting

### Người dùng bị logout khi refresh trang
- Kiểm tra token có được lưu đúng trong localStorage không
- Kiểm tra API `getCurrentUser()` có trả về lỗi không
- Kiểm tra network tab để xem request có được gửi không

### Token không được gửi trong API calls
- Kiểm tra axios interceptor có hoạt động không
- Kiểm tra token có tồn tại trong localStorage không

### Lỗi 401 liên tục
- Token có thể đã hết hạn
- Server có thể đã thay đổi cách validate token
- Kiểm tra format của token có đúng không
