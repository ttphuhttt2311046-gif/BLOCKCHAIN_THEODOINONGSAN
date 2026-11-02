// SPDX-License-Identifier: MIT
// Khai báo bản quyền mã nguồn mở MIT
pragma solidity ^0.8.20; 

contract SupplyChain {

    // --- 1. KHAI BÁO CÁC KIỂU DỮ LIỆU ---

    // Cấu trúc lưu 1 mốc lịch sử trên Blockchain
    // CHỈ lưu mã Hash đại diện cho dữ liệu ở Database (tiết kiệm phí Gas)
    struct StatusUpdate {
        bytes32 dataHash;    // Mã băm SHA-256 tạo ra từ dữ liệu thực trong Database
        uint256 timestamp;   // Dấu mốc thời gian Unix chốt trên Blockchain (không thể sửa)
        address updatedBy;   // Địa chỉ ví MetaMask thực hiện ký xác nhận giao dịch
    }

    // Cấu trúc lưu thông tin cơ bản của lô hàng
    struct Product {
        uint256 id;          // Mã định danh sản phẩm (1, 2, 3...)
        address producer;    // Địa chỉ ví của Nông dân / Nhà sản xuất sở hữu lô hàng
        uint256 historyCount;// Số lượng mốc lịch sử Hash đã được ghi nhận
    }

    // --- 2. LƯU TRỮ DỮ LIỆU TRÊN BLOCKCHAIN (STATE VARIABLES) ---

    uint256 public productCount = 0; // Tổng số lô hàng đã tạo

    // Bảng ánh xạ: ID sản phẩm -> Thông tin Product
    mapping(uint256 => Product) public products;

    // Bảng ánh xạ 2 cấp: (ID sản phẩm -> Thứ tự mốc lịch sử) -> Cấu trúc StatusUpdate
    mapping(uint256 => mapping(uint256 => StatusUpdate)) public productHistory;

    // --- 3. KHAI BÁO EVENT (ĐỂ FRONTEND LẮNG NGHE SỰ KIỆN) ---

    event ProductCreated(uint256 indexed id, bytes32 dataHash, address indexed producer, uint256 timestamp);
    event StatusUpdated(uint256 indexed id, bytes32 dataHash, address indexed updatedBy, uint256 timestamp);

    // --- 4. MODIFIER (PHÂN QUYỀN BẢO MẬT) ---

    // Kiểm tra người gọi hàm có phải đúng ví Nông dân tạo ra lô hàng hay không
    modifier onlyProducer(uint256 _id) {
        require(msg.sender == products[_id].producer, unicode"Lỗi: Không có quyền cập nhật!");
        _;
    }

    // --- 5. CÁC HÀM XỬ LÝ CHÍNH ---

    /**
     * @dev 1. Nông dân ký MetaMask đẩy ID và Mã Hash gốc khởi tạo lô hàng lên Blockchain
     * @param _initialHash Mã SHA-256 băm từ thông tin sản phẩm trong Database
     */
    function createProduct(bytes32 _initialHash) public returns (uint256) {
        productCount++; // Tăng ID lên 1

        products[productCount] = Product({
            id: productCount,
            producer: msg.sender,     // Lưu ví người tạo
            historyCount: 0
        });

        // Ghi nhận mốc Hash đầu tiên
        _addHistory(productCount, _initialHash);

        // Bắn sự kiện ra ngoài
        emit ProductCreated(productCount, _initialHash, msg.sender, block.timestamp);
        return productCount;
    }

    /**
     * @dev 2. Cập nhật hành trình: Đẩy mã Hash trạng thái mới lên Blockchain để nối dài chuỗi
     * @param _id ID lô hàng cần cập nhật
     * @param _newHash Mã SHA-256 băm từ dữ liệu trạng thái di chuyển mới trong Database
     */
    function updateStatus(uint256 _id, bytes32 _newHash) public onlyProducer(_id) {
        require(_id > 0 && _id <= productCount, unicode"Lỗi: Sản phẩm không tồn tại!");

        // Ghi nhận mã Hash mới vào danh sách lịch sử
        _addHistory(_id, _newHash);

        emit StatusUpdated(_id, _newHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Hàm nội bộ (internal) hỗ trợ nối mốc Hash vào mảng lịch sử
     */
    function _addHistory(uint256 _id, bytes32 _dataHash) internal {
        uint256 count = products[_id].historyCount;
        
        productHistory[_id][count] = StatusUpdate({
            dataHash: _dataHash,
            timestamp: block.timestamp, // Lấy thời gian khối thực tế trên mạng Sepolia
            updatedBy: msg.sender
        });
        
        products[_id].historyCount++;
    }

    /**
     * @dev 3. Tra cứu toàn bộ chuỗi mã Hash gốc trên Blockchain để so khớp chống giả mạo
     * @param _id ID lô hàng cần tra cứu
     */
    function getProductHistory(uint256 _id) public view returns (StatusUpdate[] memory) {
        uint256 count = products[_id].historyCount;
        StatusUpdate[] memory history = new StatusUpdate[](count);

        for (uint256 i = 0; i < count; i++) {
            history[i] = productHistory[_id][i];
        }
        return history; // Trả về mảng các mốc Hash cho Frontend kiểm tra
    }
}