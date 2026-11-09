// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SupplyChain {
    struct Product {
        address producer;
        bytes32 initialHash;
        bytes32 latestHash;
        uint256 createdAt;
        bool exists;
    }

    struct HistoryItem {
        bytes32 dataHash;
        string status;
        uint256 timestamp;
        address updater;
    }

    mapping(string => Product) private products;
    mapping(string => HistoryItem[]) private productHistory;

    event ProductCreated(string indexed batchId, address indexed producer, bytes32 initialHash, uint256 timestamp);
    event StatusUpdated(string indexed batchId, address indexed updater, bytes32 dataHash, string status, uint256 timestamp);

    modifier onlyProducer(string memory batchId) {
        require(products[batchId].exists, "SupplyChain: product does not exist");
        require(products[batchId].producer == msg.sender, "SupplyChain: onlyProducer");
        _;
    }

    function createProduct(string calldata batchId, bytes32 initialHash) external {
        require(bytes(batchId).length > 0, "SupplyChain: empty batch ID");
        require(initialHash != bytes32(0), "SupplyChain: empty hash");
        require(!products[batchId].exists, "SupplyChain: batch already exists");

        products[batchId] = Product({
            producer: msg.sender,
            initialHash: initialHash,
            latestHash: initialHash,
            createdAt: block.timestamp,
            exists: true
        });
        productHistory[batchId].push(HistoryItem(initialHash, unicode"Khởi tạo lô nông sản", block.timestamp, msg.sender));
        emit ProductCreated(batchId, msg.sender, initialHash, block.timestamp);
    }

    function updateStatus(string calldata batchId, bytes32 newHash, string calldata status)
        external
        onlyProducer(batchId)
    {
        require(newHash != bytes32(0), "SupplyChain: empty hash");
        require(newHash != products[batchId].latestHash, "SupplyChain: unchanged hash");
        require(bytes(status).length > 0, "SupplyChain: empty status");

        products[batchId].latestHash = newHash;
        productHistory[batchId].push(HistoryItem(newHash, status, block.timestamp, msg.sender));
        emit StatusUpdated(batchId, msg.sender, newHash, status, block.timestamp);
    }

    function getProduct(string calldata batchId)
        external
        view
        returns (address producer, bytes32 initialHash, bytes32 latestHash, uint256 createdAt, bool exists)
    {
        Product storage product = products[batchId];
        return (product.producer, product.initialHash, product.latestHash, product.createdAt, product.exists);
    }

    function getProductHistory(string calldata batchId) external view returns (HistoryItem[] memory) {
        require(products[batchId].exists, "SupplyChain: product does not exist");
        return productHistory[batchId];
    }

    function getProducer(string calldata batchId) external view returns (address) {
        return products[batchId].producer;
    }

    function verifyHash(string calldata batchId, bytes32 candidateHash) external view returns (bool) {
        Product storage product = products[batchId];
        return product.exists && candidateHash == product.latestHash;
    }
}
