// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; 

contract SupplyChain {

    // --- 1. DỮ LIỆU ---
    struct StatusUpdate {
        bytes32 dataHash;    // Mã Hash SHA-256 từ Database
        uint256 timestamp;   // Thời gian chốt trên Blockchain
        address updatedBy;   // Địa chỉ ví MetaMask ký giao dịch
    }

    struct Product {
        uint256 id;           // ID lô hàng (1, 2, 3...)
        address producer;     // Ví Nông dân tạo lô
        uint256 historyCount; // Số mốc lịch sử
    }

    // --- 2. LƯU TRỮ ---
    uint256 public productCount = 0; 
    mapping(uint256 => Product) public products;
    mapping(uint256 => mapping(uint256 => StatusUpdate)) public productHistory;

    // --- 3. SỰ KIỆN ---
    event ProductCreated(uint256 indexed id, bytes32 dataHash, address indexed producer, uint256 timestamp);
    event StatusUpdated(uint256 indexed id, bytes32 dataHash, address indexed updatedBy, uint256 timestamp);

    // --- 4. HÀM XỬ LÝ CHÍNH ---

    // Nông dân tạo lô hàng mới
    function createProduct(bytes32 _initialHash) public returns (uint256) {
        productCount++; 

        products[productCount] = Product({
            id: productCount,
            producer: msg.sender,
            historyCount: 0
        });

        _addHistory(productCount, _initialHash);
        emit ProductCreated(productCount, _initialHash, msg.sender, block.timestamp);
        return productCount;
    }

    // Cập nhật hành trình (Vận chuyển / Kho)
    function updateStatus(uint256 _id, bytes32 _newHash) public {
        require(_id > 0 && _id <= productCount, unicode"Lỗi: Sản phẩm không tồn tại!");
        _addHistory(_id, _newHash);
        emit StatusUpdated(_id, _newHash, msg.sender, block.timestamp);
    }

    // Hàm phụ: Thêm mốc lịch sử
    function _addHistory(uint256 _id, bytes32 _dataHash) internal {
        uint256 count = products[_id].historyCount;
        productHistory[_id][count] = StatusUpdate({
            dataHash: _dataHash,
            timestamp: block.timestamp,
            updatedBy: msg.sender
        });
        products[_id].historyCount++;
    }

    // Tra cứu toàn bộ lịch sử lô hàng
    function getProductHistory(uint256 _id) public view returns (StatusUpdate[] memory) {
        uint256 count = products[_id].historyCount;
        StatusUpdate[] memory history = new StatusUpdate[](count);
        for (uint256 i = 0; i < count; i++) {
            history[i] = productHistory[_id][i];
        }
        return history;
    }
}