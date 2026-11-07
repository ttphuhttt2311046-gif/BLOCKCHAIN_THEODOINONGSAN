Thay đổi 7/11/2026:

- Dùng env ngăn truy cập env bằng link
- Sửa api.php cho phù hợp phiên bản mới
- app.js bỏ kiểm tra  location và status chỉ so hash. Hash đã bao gồm location, status và thời gian
- Sửa css cho đẹp



Thay đổi:

- Bổ sung code file API phù hợp với trace-ui logic cũ không mất
- RPC cũ lỗi thay cái khác
- Thêm css dễ nhìn
- Thêm QR Scan

Cách dùng tra cứu nguồn gốc
Cách 1: Nhập mã lô hàng -> tra cứu
Cách 2: Quét QR
Nếu hiện:

- "Lỗi: Lô hàng chưa được ghi lên blockchain" thì lô này có trên csdl nhưng chain_id bị null
- "Lỗi: Không tìm thấy lô hàng" thì lô này ko có trên csdl
- "Lỗi: call revert exception....." vì product does not exist tại lô này chưa tạo trên contract
