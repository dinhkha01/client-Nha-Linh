# Tích hợp API Cập nhật Profile

## Backend API (ProfileController.java)

Backend đã có sẵn API để cập nhật thông tin profile:

```java
@PutMapping("/{userId}")
public ResponseEntity<?> updateProfile(
    @PathVariable Long userId,
    @RequestParam(required = false) String firstName,
    @RequestParam(required = false) String lastName,
    @RequestParam(required = false) String bio,
    @RequestParam(required = false) MultipartFile profileImage)
```

**Endpoint**: `PUT /api/profile/{userId}`

**Parameters**:
- `userId`: ID của người dùng (path variable)
- `firstName`: Họ (optional)
- `lastName`: Tên (optional)  
- `bio`: Giới thiệu (optional)
- `profileImage`: File ảnh đại diện (optional, MultipartFile)

**Response Format**:
```json
{
  "status": "success",
  "message": "Cập nhật profile thành công",
  "data": {
    // Thông tin user đã cập nhật
  }
}
```

## Frontend Integration

### 1. API Interface

```typescript
export interface UpdateProfileRequest {
  userId: number;
  firstName: string;
  lastName: string;
  bio?: string;
  profileImage?: File;
}
```

### 2. API Call

```typescript
updateProfile: async (data: UpdateProfileRequest) => {
  const token = localStorage.getItem('token')
  
  // Tạo FormData để upload file
  const formData = new FormData();
  formData.append('firstName', data.firstName);
  formData.append('lastName', data.lastName);
  if (data.bio) {
    formData.append('bio', data.bio);
  }
  if (data.profileImage) {
    formData.append('profileImage', data.profileImage);
  }
  
  const response = await axios.put(`${host}/api/profile/${data.userId}`, formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}
```

### 3. Modal Form

`UpdateProfileModal` component đã được cập nhật để:
- Sử dụng file input thay vì URL input
- Xử lý file upload đúng cách
- Gửi dữ liệu qua FormData
- Hiển thị tên file đã chọn

### 4. State Management

Redux store được cập nhật tự động khi profile được cập nhật thành công:
```typescript
if (response.status === 'success' && response.data) {
  dispatch(updateUser(response.data));
  return response.data;
}
```

## Cách sử dụng:

1. **Mở modal cập nhật**: Click nút "Chỉnh sửa" trên trang Profile
2. **Điền thông tin**: Họ, tên, giới thiệu
3. **Chọn ảnh**: Click "Chọn file" để upload ảnh đại diện mới
4. **Lưu thay đổi**: Click "Cập nhật" để gửi dữ liệu lên server

## Lưu ý:

- API endpoint: `/api/profile/{userId}` (không phải `/auth/profile`)
- Sử dụng `multipart/form-data` để upload file
- Response format: `{ status, message, data }` (không phải `{ success, message, data }`)
- File ảnh được xử lý tự động bởi backend
- Thông tin user được cập nhật real-time trong Redux store

## Testing:

1. Đảm bảo backend server đang chạy
2. Kiểm tra endpoint `/api/profile/{userId}` có hoạt động
3. Test upload file ảnh
4. Verify response format đúng với frontend expectation
