let provider, signer, contract;

// ==========================================
// 0. HÀM ĐỊNH VỊ GPS TỰ ĐỘNG 
// ==========================================
function getLocation() {
    const geoStatus = document.getElementById("geoStatus");
    const locationInput = document.getElementById("location");

    if (!navigator.geolocation) {
        geoStatus.innerText = "Trình duyệt của bạn không hỗ trợ GPS.";
        geoStatus.style.color = "red";
        return;
    }

    geoStatus.innerText = "Đang lấy tọa độ GPS...";
    geoStatus.style.color = "#666";

    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (document.getElementById("lat")) document.getElementById("lat").value = lat;
        if (document.getElementById("lng")) document.getElementById("lng").value = lng;

        geoStatus.innerText = `📍 Đã lấy tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        geoStatus.style.color = "#17734f";

        try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`);
            const data = await response.json();
            
            // ĐÃ SỬA: Chỉ lấy Phường/Xã (locality) và Tỉnh/Thành phố (principalSubdivision), bỏ Quận/Huyện (city)
            const shortAddress = [data.locality, data.principalSubdivision]
                                 .filter(Boolean).join(", ");
            
            if (locationInput) {
                locationInput.value = shortAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        } catch (error) {
            console.error("Lỗi khi tra cứu địa danh:", error);
            if (locationInput && !locationInput.value) {
                locationInput.value = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        }
    }, (error) => {
        geoStatus.innerText = "🚫 Lỗi: Không thể lấy vị trí (hãy kiểm tra quyền truy cập GPS).";
        geoStatus.style.color = "red";
    });
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
            if (window.APP_CONFIG?.CONTRACT_ADDRESS && window.APP_CONFIG?.CONTRACT_ABI) {
                contract = new ethers.Contract(
                    window.APP_CONFIG.CONTRACT_ADDRESS,
                    window.APP_CONFIG.CONTRACT_ABI,
                    signer
                );
            } else {
                throw new Error("Thiếu cấu hình smart contract trong file .env ở thư mục gốc.");
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

        // Contract cũ dùng bộ đếm ID; contract mới dùng mã lô do API cấp.
        const hasProductCount = window.APP_CONFIG.CONTRACT_ABI.some(
            item => item.type === "function" && item.name === "productCount"
        );
        let nextChainId = null;
        if (hasProductCount) {
            const currentCount = await contract.productCount();
            nextChainId = currentCount.toNumber() + 1;
        }

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

        const chainId = String(dbResult.chain_id ?? dbResult.id);
        const dataHash = dbResult.hash;
        const formattedHash = dataHash.startsWith("0x") ? dataHash : "0x" + dataHash;

        // BƯỚC 3: Ký giao dịch gửi Hash lên Blockchain Sepolia
        const createProductAbi = window.APP_CONFIG.CONTRACT_ABI.find(
            item => item.type === "function" && item.name === "createProduct"
        );
        if (!createProductAbi) throw new Error("ABI không có hàm createProduct.");
        const tx = createProductAbi.inputs.length > 1
            ? await contract.createProduct(chainId, formattedHash)
            : await contract.createProduct(formattedHash);
        await tx.wait(); // Chờ Block xác nhận

        alert(`Khởi tạo thành công! Mã lô hàng: ${chainId}`);
        
        // ==========================================
        // BƯỚC 4: TẠO VÀ HIỂN THỊ MÃ QR CODE (MỚI THÊM)
        // ==========================================
        // Tạo link trỏ về trang index.html (trang tra cứu)
        const searchUrl = new URL("../trace-ui/index.html", window.location.href);
        searchUrl.searchParams.set("id", chainId);
        
        const qrContainer = document.getElementById("qrContainer");
        const qrResult = document.getElementById("qrResult");
        const qrLink = document.getElementById("qrLink");

        if (qrContainer && qrResult && qrLink) {
            qrContainer.style.display = "block"; // Hiện khung chứa QR
            qrResult.innerHTML = ""; // Xóa mã QR cũ nếu người dùng tạo liên tiếp nhiều lô

            // Vẽ mã QR mới
            new QRCode(qrResult, {
                text: searchUrl.toString(),
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Gắn link cho thẻ <a> bên dưới
            qrLink.href = searchUrl.toString();
            qrLink.innerText = searchUrl.toString();
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
        
        // BƯỚC 2: Ưu tiên dùng chain_id do API trả về.
        const targetChainId = String(dbResult.chain_id || productId);

        // BƯỚC 3: Gửi Hash trạm mới lên Blockchain theo đúng targetChainId
        const updateStatusAbi = window.APP_CONFIG.CONTRACT_ABI.find(
            item => item.type === "function" && item.name === "updateStatus"
        );
        if (!updateStatusAbi) throw new Error("ABI không có hàm updateStatus.");
        const tx = updateStatusAbi.inputs.length > 2
            ? await contract.updateStatus(targetChainId, formattedNewHash, status)
            : await contract.updateStatus(targetChainId, formattedNewHash);
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