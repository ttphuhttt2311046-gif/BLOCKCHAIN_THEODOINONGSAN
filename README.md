Web: [https://tracuunguongoc.infinityfreeapp.com]

Thay đổi:
- Bổ sung code file API phù hợp với trace-ui logic cũ không mất
- RPC cũ lỗi thay cái khác
- Thêm css dễ nhìn
- Thêm QR Scan

Cách cập nhật địa chỉ và ABI:
CONTRACT_ADDRESS, ABI nhánh smart-contract đã deploy trên remix cung cấp
1. Sửa CONTRACT_ADDRESS ở app.js
2. Sửa ABI file SupplyChainABI.json

Cách dùng tra cứu nguồn gốc
Cách 1: Nhập mã lô hàng -> tra cứu
Cách 2: Quét QR dùng điện thoại cho dễ mở file QRtest có sãn rồi quét
Nếu hiện:
- "Lỗi: Lô hàng chưa được ghi lên blockchain" thì lô này có trên csdl nhưng chain_id bị null
- "Lỗi: Không tìm thấy lô hàng" thì lô này ko có trên csdl

Lưu ý:
- Khi tạo mã QR nội dung QR nên là https://<tên-miền>/index.html?id=<mã lô>
