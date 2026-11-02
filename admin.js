// Đợi Người 1 gửi qua thì dán vào đây
const contractAddress = "0xf80B1598a2bB76149d47543d4193e1ef637f53ca"; 
const contractABI = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "dataHash", "type": "bytes32" },
            { "indexed": true, "internalType": "address", "name": "producer", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "ProductCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "dataHash", "type": "bytes32" },
            { "indexed": true, "internalType": "address", "name": "updatedBy", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "StatusUpdated",
        "type": "event"
    },
    {
        "inputs": [{ "internalType": "bytes32", "name": "_initialHash", "type": "bytes32" }],
        "name": "createProduct",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
        "name": "getProductHistory",
        "outputs": [
            {
                "components": [
                    { "internalType": "bytes32", "name": "dataHash", "type": "bytes32" },
                    { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
                    { "internalType": "address", "name": "updatedBy", "type": "address" }
                ],
                "internalType": "struct SupplyChain.StatusUpdate[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "productCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "productHistory",
        "outputs": [
            { "internalType": "bytes32", "name": "dataHash", "type": "bytes32" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
            { "internalType": "address", "name": "updatedBy", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "products",
        "outputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "address", "name": "producer", "type": "address" },
            { "internalType": "uint256", "name": "historyCount", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_id", "type": "uint256" },
            { "internalType": "bytes32", "name": "_newHash", "type": "bytes32" }
        ],
        "name": "updateStatus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]; 

let provider, signer, contract;

// ==========================================
// 1. KẾT NỐI VÍ METAMASK VÀ ÉP MẠNG SEPOLIA
// ==========================================
async function connectWallet() {
    if (window.ethereum) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], 
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                alert("Ví MetaMask của bạn chưa cài đặt mạng Sepolia. Vui lòng thêm thủ công.");
            } else {
                console.error("Lỗi chuyển mạng:", switchError);
            }
            return; 
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        
        const address = await signer.getAddress();
        document.getElementById("walletAddress").innerText = "Ví kết nối: " + address;

        if (contractAddress !== "" && contractABI.length > 0) {
            contract = new ethers.Contract(contractAddress, contractABI, signer);
        }
    } else {
        alert("Vui lòng cài đặt MetaMask!");
    }
}

// ==========================================
// 2. HÀM HỖ TRỢ HIỂN THỊ LOADING
// ==========================================
function showLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("hidden");
}

function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("hidden");
}

// ==========================================
// 3. XỬ LÝ NÚT: KHỞI TẠO LÔ HÀNG
// ==========================================
async function handleCreateProduct() {
    if (!contract) {
        alert("Vui lòng kết nối ví MetaMask trước!");
        return;
    }

    const productName = document.getElementById("productName")?.value.trim();
    const description = document.getElementById("description")?.value.trim() || "";

    if (!productName) {
        alert("Vui lòng nhập tên sản phẩm!");
        return;
    }

    try {
        showLoading(); 

        // BƯỚC 1: Lấy ID dự kiến tiếp theo từ Smart Contract
        const currentCount = await contract.productCount();
        const nextChainId = currentCount.toNumber() + 1;

        // BƯỚC 2: Gửi thông tin sang PHP để tạo bản ghi & lấy mã băm Hash
        const apiResponse = await fetch("./api.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                action: "create", 
                name: productName,
                description: description,
                chain_id: nextChainId
            })
        });
        const dbResult = await apiResponse.json();
        
        if (!apiResponse.ok || !dbResult.hash) {
            throw new Error(dbResult.message || "Lỗi lưu dữ liệu vào MySQL");
        }

        const dataHash = dbResult.hash; 
        const formattedHash = dataHash.startsWith("0x") ? dataHash : "0x" + dataHash;

        // BƯỚC 3: Ký giao dịch gửi Hash lên Blockchain Sepolia
        const tx = await contract.createProduct(formattedHash);
        await tx.wait(); // Chờ Block xác nhận

        alert(`Khởi tạo thành công! Mã lô hàng (Chain ID & MySQL ID): ${nextChainId}`);
        
        // Reset form
        document.getElementById("productName").value = "";
        if (document.getElementById("description")) document.getElementById("description").value = "";

    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
        alert("Giao dịch thất bại: " + (error.reason || error.message || error));
    } finally {
        hideLoading(); 
    }
}

// ==========================================
// 4. XỬ LÝ NÚT: CẬP NHẬT HÀNH TRÌNH (ĐÃ SỬA LỖI CHAIN_ID)
// ==========================================
async function handleUpdateStatus() {
    if (!contract) {
        alert("Vui lòng kết nối ví MetaMask trước!");
        return;
    }

    const productId = document.getElementById("productId")?.value.trim();
    const location = document.getElementById("location")?.value.trim();
    const status = document.getElementById("status")?.value || "Đang vận chuyển";

    if (!productId || !location) {
        alert("Vui lòng nhập mã ID lô hàng và địa điểm!");
        return;
    }

    try {
        showLoading(); 

        // BƯỚC 1: Gửi thông tin trạm mới sang MySQL
        const apiResponse = await fetch("./api.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                action: "update", 
                id: productId, 
                location: location, 
                status: status 
            })
        });
        const dbResult = await apiResponse.json();

        if (!apiResponse.ok || !dbResult.hash) {
            throw new Error(dbResult.message || "Lỗi lưu trạm mới vào MySQL");
        }

        const newHash = dbResult.hash; 
        const formattedNewHash = newHash.startsWith("0x") ? newHash : "0x" + newHash;
        
        // BƯỚC 2: Ưu tiên dùng chain_id do PHP trả về, nếu không có mới dùng productId nhập vào
        const targetChainId = dbResult.chain_id ? parseInt(dbResult.chain_id) : parseInt(productId);

        // BƯỚC 3: Gửi Hash trạm mới lên Blockchain theo đúng targetChainId
        const tx = await contract.updateStatus(targetChainId, formattedNewHash);       
        await tx.wait();

        alert(`Cập nhật thành công trạm mới cho lô hàng #${targetChainId}`);
        
        // Reset form
        document.getElementById("productId").value = "";
        document.getElementById("location").value = "";

    } catch (error) {
        console.error("Lỗi cập nhật:", error);
        alert("Giao dịch thất bại: " + (error.reason || error.message || error));
    } finally {
        hideLoading(); 
    }
}