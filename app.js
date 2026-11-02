const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const CONTRACT_ADDRESS = "0xf80B1598a2bB76149d47543d4193e1ef637f53ca"; 
const API_URL = "api.php";

// NHÚNG TRỰC TIẾP ABI VÀO APP.JS ĐỂ TRÁNH DÍNH CACHE FILE JSON
const ABI = [
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

let scanner = null;

// Chuyển đổi mọi định dạng Hash sang Hex string chuẩn 64 ký tự
function safeHex(val) {
    if (!val) return "";
    if (typeof val === "string") return val.toLowerCase();
    if (val._isBigNumber || (ethers.BigNumber && ethers.BigNumber.isBigNumber(val))) {
        return val.toHexString().toLowerCase();
    }
    return String(val).toLowerCase();
}

function computeHash(row) {
    const raw = `${row.product_id}${row.location}${row.status}${row.ts}`;
    return ethers.utils.sha256(ethers.utils.toUtf8Bytes(raw)).toLowerCase();
}

function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function traCuu(dbId) {
    const out = document.getElementById("ketqua");
    if (!/^\d+$/.test(dbId)) {
        out.innerHTML = `<span class="bad" style="color:red;">Vui lòng nhập mã lô hàng là số</span>`;
        return;
    }
    out.textContent = "Đang tải dữ liệu...";
    try {
        // 1. Lấy thông tin & lịch sử từ Database (MySQL)
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "history", id: dbId }),
        });
        const db = await res.json();
        if (!db.product) throw new Error(db.message || "Không tìm thấy lô hàng trong cơ sở dữ liệu");
        if (db.product.chain_id == null) throw new Error("Lô hàng chưa được ghi lên Blockchain (chain_id rỗng)");

        // 2. Kết nối Smart Contract Sepolia với ABI trực tiếp
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        const chain = await contract.getProductHistory(db.product.chain_id);

        if (chain.length !== db.history.length) {
            throw new Error(`Số mốc lịch sử không khớp: DB (${db.history.length} mốc), Blockchain (${chain.length} mốc)`);
        }

        // 3. Đối chiếu mã băm an toàn
        let allOk = true;
        const items = db.history.map((row, i) => {
            const c = chain[i];
            const computed = computeHash(row);
            
            const chainHash = safeHex(c.dataHash).replace("0x", "").padStart(64, "0");
            const dbHash = String(row.data_hash).toLowerCase().replace("0x", "").padStart(64, "0");
            const localHash = computed.replace("0x", "").padStart(64, "0");

            const ok = (localHash === dbHash) && (localHash === chainHash);
            allOk = allOk && ok;

            return `<li class="tl-item" style="margin-bottom: 12px; padding: 10px; border-left: 4px solid ${ok ? '#2ec4b6' : '#e71d36'}; background: #f8f9fa;">
                <b>${esc(new Date(row.ts * 1000).toLocaleString("vi-VN"))}</b><br>
                📍 Vị trí: ${esc(row.location)} — Trạng thái: ${esc(row.status)}<br>
                <small style="color:${ok ? 'green' : 'red'};">${ok ? "✓ Đã xác minh tính toàn vẹn trên Blockchain" : "❌ Mã băm không khớp với Blockchain"}</small>
            </li>`;
        }).join("");

        out.innerHTML = `<h3>Sản phẩm: ${esc(db.product.name)} (Mã Chain ID: ${db.product.chain_id})</h3>
            <p style="font-weight: bold; color: ${allOk ? 'green' : 'red'};">
                ${allOk ? "✓ Toàn bộ hành trình đã được xác minh toàn vẹn" : "❌ Có mốc dữ liệu bị thay đổi so với Blockchain"}
            </p>
            <ol style="list-style: none; padding-left: 0;">${items}</ol>
            <p><a href="https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener">Xem Hợp Đồng trên Sepolia Etherscan ↗</a></p>`;
    } catch (e) {
        out.innerHTML = `<span class="bad" style="color: red;">Lỗi: ${esc(e.message)}</span>`;
    }
}

// Tự động tra cứu nếu URL có query parameters (VD: ?id=3)
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("pid");
    const id = new URLSearchParams(location.search).get("id");
    if (id) { input.value = id; traCuu(id.trim()); }
    if (input) {
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") traCuu(input.value.trim());
        });
    }
});

// Quét QR Code
function batQuet() {
    if (scanner) return;
    const input = document.getElementById("pid");
    document.getElementById("reader").style.display = "block";
    document.getElementById("btnDung").style.display = "block";

    scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
        text => {
            stopQuet();
            const raw = text.trim();
            let id = null;
            if (/^\d+$/.test(raw)) {
                id = raw;
            } else {
                try { id = new URL(raw, location.href).searchParams.get("id"); } catch (_) {}
            }
            if (id) {
                input.value = id;
                traCuu(id);
            } else {
                alert("Mã QR không hợp lệ!");
            }
        },
        () => {}
    ).catch(e => {
        alert("Không mở được camera: " + e);
        stopQuet();
    });
}

function stopQuet() {
    const reader = document.getElementById("reader");
    const btn = document.getElementById("btnDung");
    if (!scanner) return;
    const s = scanner;
    scanner = null;
    s.stop()
        .then(() => s.clear())
        .catch(() => {})
        .finally(() => {
            if (reader) reader.style.display = "none";
            if (btn) btn.style.display = "none";
        });
}