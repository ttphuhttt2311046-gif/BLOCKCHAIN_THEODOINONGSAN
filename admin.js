// Đợi Người 1 gửi qua thì dán vào đây
const contractAddress = ""; 
const contractABI = []; 

let provider, signer, contract;

async function connectWallet() {
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        
        // Hiển thị địa chỉ ví lên web
        const address = await signer.getAddress();
        document.getElementById("walletAddress").innerText = "Ví kết nối: " + address;

        // Chỉ khởi tạo contract khi đã có Address và ABI
        if (contractAddress !== "" && contractABI.length > 0) {
            contract = new ethers.Contract(contractAddress, contractABI, signer);
        }
    } else {
        alert("Vui lòng cài đặt MetaMask!");
    }
}

async function handleCreateProduct() {
    alert("Nút này đã sẵn sàng. Chờ ráp ABI và Address để gọi Smart Contract!");
    // Logic gọi contract.createProduct() sẽ viết ở đây
}

async function handleUpdateStatus() {
    alert("Nút này đã sẵn sàng. Chờ ráp ABI và Address để gọi Smart Contract!");
    // Logic gọi contract.updateStatus() sẽ viết ở đây
}
// 1. Viết 2 hàm hỗ trợ Bật / Tắt Loading
function showLoading() {
    document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
}

// 2. Chèn vào hàm đẩy dữ liệu (Ví dụ hàm Khởi tạo lô hàng)
async function handleCreateProduct() {
    try {
        // BẬT LOADING ngay khi người dùng vừa bấm nút
        showLoading(); 
        
        // ... (Chỗ này sau này bạn sẽ gọi contract.createProduct)
        
        // Code giả lập thời gian chờ Blockchain 3 giây (để bạn test thử giao diện)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        alert("Khởi tạo thành công!");
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Giao dịch bị hủy hoặc xảy ra lỗi.");
    } finally {
        // TẮT LOADING: Khối finally đảm bảo dù thành công hay văng lỗi thì màn hình vẫn thoát khỏi trạng thái xoay xoay
        hideLoading(); 
    }
}