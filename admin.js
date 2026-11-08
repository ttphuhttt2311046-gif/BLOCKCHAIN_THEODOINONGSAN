let provider, signer, contract;

// ==========================================
// 0. HÀM ĐỊNH VỊ GPS TỰ ĐỘNG (THÊM MỚI)
// ==========================================
function getLocation() {
    const geoStatus = document.getElementById("geoStatus");
    if (!geoStatus) return; // Nếu nút được bấm từ Khu vực 1 không có id="geoStatus" thì bỏ qua hiển thị

    if (navigator.geolocation) {
        geoStatus.innerText = "Đang tìm vị trí GPS...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                if (document.getElementById("lat")) document.getElementById("lat").value = lat;
                if (document.getElementById("lng")) document.getElementById("lng").value = lng;
                geoStatus.innerText = `📍 Đã lấy tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            },
            (error) => {
                geoStatus.innerText = "❌ Lỗi: Vui lòng bật định vị và cấp quyền cho trình duyệt.";
                console.error("Lỗi GPS:", error);
            }
        );
    } else {
        geoStatus.innerText = "❌ Trình duyệt của bạn không hỗ trợ định vị GPS.";
    }
}

// ==========================================
// 1. KẾT NỐI VÍ METAMASK, KÝ XÁC THỰC VÀ PHÂN QUYỀN
// ==========================================
async function connectWallet() {
    if (!window.ethereum) {
        alert("Vui lòng cài đặt MetaMask!");
        return;
    }

    try {
        // Chuyển sang mạng Sepolia
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], 
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                alert("Ví MetaMask của bạn chưa cài đặt mạng Sepolia.");
            }
            return; 
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const address = await signer.getAddress();

        document.getElementById("walletAddress").innerText = "Đang xác thực chữ ký ví...";

        // BƯỚC 1: Lấy mã Nonce từ server auth.php
        const nonceRes = await fetch(`./auth.php?action=get_nonce&address=${address}`);
        const nonceData = await nonceRes.json();
        
        if (!nonceRes.ok) throw new Error(nonceData.message || "Lỗi khi lấy mã xác thực.");

        // BƯỚC 2: Bật popup MetaMask yêu cầu người dùng ký thông báo
        const message = `Chào mừng đến với Hệ thống Truy xuất Nguồn gốc.\n\nMã xác thực của bạn: ${nonceData.nonce}`;
        const signature = await signer.signMessage(message); // MetaMask sẽ nảy popup ở dòng này!

        // BƯỚC 3: Gửi chữ ký lên server để kiểm tra và nhận quyền (Role)
        const authRes = await fetch('./auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify_signature',
                address: address,
                signature: signature
            })
        });
        
        const authData = await authRes.json();

        if (authRes.ok && authData.success) {
            // Đăng nhập thành công, đổi tên role ra tiếng Việt cho đẹp
            const roleMap = {
                'farmer': 'Nông dân',
                'transporter': 'Vận chuyển',
                'pending': 'Chờ duyệt',
                'admin': 'Quản trị viên'
            };
            const roleName = roleMap[authData.role] || authData.role;
            
            document.getElementById("walletAddress").innerText = `Ví kết nối: ${address} (Vai trò: ${roleName})`;

            // BƯỚC 4: Phân quyền giao diện (UI)
            const farmerSection = document.getElementById("farmerSection");
            const transporterSection = document.getElementById("transporterSection");
            const unauthorizedMsg = document.getElementById("unauthorizedMessage");

            // Ẩn tất cả các form trước khi cấp quyền
            if (farmerSection) farmerSection.style.display = 'none';
            if (transporterSection) transporterSection.style.display = 'none';
            if (unauthorizedMsg) unauthorizedMsg.style.display = 'none';

            // Mở form tùy theo Role
            if (authData.role === 'farmer') {
                if (farmerSection) farmerSection.style.display = 'block';
            } else if (authData.role === 'transporter') {
                if (transporterSection) transporterSection.style.display = 'block';
            } else if (authData.role === 'pending') {
                if (unauthorizedMsg) {
                    unauthorizedMsg.innerHTML = "⏳ Tài khoản của bạn đang ở trạng thái <b>Chờ duyệt</b>. Vui lòng liên hệ Admin để được cấp quyền.";
                    unauthorizedMsg.style.color = "#f6851b"; // Màu cam
                    unauthorizedMsg.style.display = 'block';
                }
            } else {
                if (unauthorizedMsg) {
                    unauthorizedMsg.innerHTML = "🚫 Bạn không có quyền nhập dữ liệu trên trang này.";
                    unauthorizedMsg.style.color = "red";
                    unauthorizedMsg.style.display = 'block';
                }
            }

            // Khởi tạo Smart Contract sau khi đã xác thực thành công
            if (typeof ENV !== 'undefined' && ENV.CONTRACT_ADDRESS !== "") {
                contract = new ethers.Contract(ENV.CONTRACT_ADDRESS, ENV.CONTRACT_ABI, signer);
            }
        } else {
            throw new Error(authData.message || "Xác thực chữ ký thất bại!");
        }

    } catch (error) {
        // Xử lý khi người dùng bấm "Hủy" chữ ký hoặc bị lỗi
        console.error("Lỗi đăng nhập:", error);
        document.getElementById("walletAddress").innerText = "Chưa kết nối ví";
        
        const unauthorizedMsg = document.getElementById("unauthorizedMessage");
        if (unauthorizedMsg) {
            unauthorizedMsg.innerHTML = "🚫 " + (error.message || "Đã hủy kết nối hoặc lỗi xác thực.");
            unauthorizedMsg.style.color = "red";
            unauthorizedMsg.style.display = 'block';
        }
        
        // Khóa kín các form nhập liệu
        if (document.getElementById("farmerSection")) document.getElementById("farmerSection").style.display = 'none';
        if (document.getElementById("transporterSection")) document.getElementById("transporterSection").style.display = 'none';
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
    
    // Lấy thêm tọa độ (nếu có bấm nút lấy định vị)
    const lat = document.getElementById("lat")?.value;
    const lng = document.getElementById("lng")?.value;

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
                chain_id: nextChainId,
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null
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
        
        // ==========================================
        // BƯỚC 4: TẠO VÀ HIỂN THỊ MÃ QR CODE (MỚI THÊM)
        // ==========================================
        // Tạo link trỏ về trang index.html (trang tra cứu)
        const searchUrl = window.location.origin + "/Admin_Traceability/index.html?id=" + nextChainId;
        
        const qrContainer = document.getElementById("qrContainer");
        const qrResult = document.getElementById("qrResult");
        const qrLink = document.getElementById("qrLink");

        if (qrContainer && qrResult && qrLink) {
            qrContainer.style.display = "block"; // Hiện khung chứa QR
            qrResult.innerHTML = ""; // Xóa mã QR cũ nếu người dùng tạo liên tiếp nhiều lô

            // Vẽ mã QR mới
            new QRCode(qrResult, {
                text: searchUrl,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Gắn link cho thẻ <a> bên dưới
            qrLink.href = searchUrl;
            qrLink.innerText = searchUrl;
        }
        // ==========================================
        
        // Reset form
        document.getElementById("productName").value = "";
        if (document.getElementById("description")) document.getElementById("description").value = "";
        if (document.getElementById("lat")) document.getElementById("lat").value = "";
        if (document.getElementById("lng")) document.getElementById("lng").value = "";
        if (document.getElementById("geoStatus")) document.getElementById("geoStatus").innerText = "";

    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
        alert("Giao dịch thất bại: " + (error.reason || error.message || error));
    } finally {
        hideLoading(); 
    }
}

// ==========================================
// 4. XỬ LÝ NÚT: CẬP NHẬT HÀNH TRÌNH
// ==========================================
async function handleUpdateStatus() {
    if (!contract) {
        alert("Vui lòng kết nối ví MetaMask trước!");
        return;
    }

    const productId = document.getElementById("productId")?.value.trim();
    const location = document.getElementById("location")?.value.trim();
    const status = document.getElementById("status")?.value || "Đang vận chuyển";
    
    // Lấy tọa độ GPS
    const lat = document.getElementById("lat")?.value;
    const lng = document.getElementById("lng")?.value;

    if (!productId || !location) {
        alert("Vui lòng nhập mã ID lô hàng và chọn địa điểm!");
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
                status: status,
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null
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
        if (document.getElementById("lat")) document.getElementById("lat").value = "";
        if (document.getElementById("lng")) document.getElementById("lng").value = "";
        if (document.getElementById("geoStatus")) document.getElementById("geoStatus").innerText = "";

    } catch (error) {
        console.error("Lỗi cập nhật:", error);
        alert("Giao dịch thất bại: " + (error.reason || error.message || error));
    } finally {
        hideLoading(); 
    }
}
// BẢO MẬT UI: Ẩn tất cả form ngay khi tải trang, bắt buộc phải đăng nhập MetaMask mới hiện
window.addEventListener('DOMContentLoaded', (event) => {
    const farmerSection = document.getElementById("farmerSection");
    const transporterSection = document.getElementById("transporterSection");
    if (farmerSection) farmerSection.style.display = 'none';
    if (transporterSection) transporterSection.style.display = 'none';
});