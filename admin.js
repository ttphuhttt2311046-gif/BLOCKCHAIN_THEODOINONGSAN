// Đợi Người 1 gửi qua thì dán vào đây
const contractAddress = ""; 
const contractABI = []; 

let provider, signer, contract;

// ==========================================
// 1. KẾT NỐI VÍ METAMASK
// ==========================================
async function connectWallet() {
    if (window.ethereum) {
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
        alert("Vui lòng kết nối ví và nạp Smart Contract!");
        return;
    }

    const productName = document.getElementById("productName")?.value;
    const description = document.getElementById("description")?.value || "";

    if (!productName) {
        alert("Vui lòng nhập tên sản phẩm!");
        return;
    }

    try {
        showLoading(); 

        // NHỊP 1: Lưu Database qua api.php (truyền thêm action: "create")
        const apiResponse = await fetch("./api.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                action: "create", 
                name: productName,
                description: description
            })
        });
        const dbResult = await apiResponse.json();
        
        if (!apiResponse.ok || !dbResult.id || !dbResult.hash) {
            throw new Error(dbResult.message || "Lỗi lưu Database");
        }

        const productId = dbResult.id; 
        const dataHash = dbResult.hash; 

        // NHỊP 2: Ký MetaMask đẩy ID và Hash lên Blockchain
        const tx = await contract.createProduct(productId, dataHash);
        await tx.wait(); 

        alert(`Khởi tạo thành công! ID lô hàng: ${productId}`);
        
        // Xóa form sau khi xong
        document.getElementById("productName").value = "";
        if (document.getElementById("description")) document.getElementById("description").value = "";

    } catch (error) {
        console.error("Lỗi:", error);
        alert("Giao dịch thất bại: " + error.message);
    } finally {
        hideLoading(); 
    }
}

// ==========================================
// 4. XỬ LÝ NÚT: CẬP NHẬT HÀNH TRÌNH
// ==========================================
async function handleUpdateStatus() {
    if (!contract) {
        alert("Vui lòng kết nối ví và nạp Smart Contract!");
        return;
    }

    const productId = document.getElementById("productId")?.value;
    const location = document.getElementById("location")?.value;
    const status = document.getElementById("status")?.value || "Đang vận chuyển";

    if (!productId || !location) {
        alert("Vui lòng nhập mã ID và chọn vị trí!");
        return;
    }

    try {
        showLoading(); 

        // NHỊP 1: Lưu dòng hành trình mới vào Database (truyền thêm action: "update")
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
            throw new Error(dbResult.message || "Lỗi lưu cập nhật vào Database");
        }

        const newHash = dbResult.hash; 

        // NHỊP 2: Ký MetaMask đẩy Hash của trạm mới lên Blockchain
        const tx = await contract.updateStatus(productId, newHash);
        await tx.wait();

        alert(`Cập nhật thành công trạm mới cho lô hàng #${productId}`);
        
        // Xóa form
        document.getElementById("productId").value = "";
        document.getElementById("location").value = "";

    } catch (error) {
        console.error("Lỗi:", error);
        alert("Giao dịch thất bại: " + error.message);
    } finally {
        hideLoading(); 
    }
}