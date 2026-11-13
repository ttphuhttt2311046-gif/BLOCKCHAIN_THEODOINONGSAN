const RPC_URL = window.APP_CONFIG.RPC_URL;
const CONTRACT_ADDRESS = window.APP_CONFIG.CONTRACT_ADDRESS;
const API_URL = "api.php";
let abi = null;
let scanner = null;
let trackingMap = null;

// Phải giống hệt api.php: sha256(product_id . location . status . timestamp), có 0x
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
  const key = String(dbId || "").trim();
  if (!key) {
    out.innerHTML = `<span class="bad">Vui lòng nhập mã lô hàng</span>`;
    return;
  }
  out.textContent = "Đang tải...";
  hideMap();
  try {
    // 1. Lô hàng + lịch sử từ Database
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "history", id: key }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Không thể tải dữ liệu lô hàng");
    }
    const db = await res.json();
    if (!db.product) throw new Error(db.message || "Không tìm thấy lô hàng");
    if (db.product.chain_id == null || db.product.chain_id === "") {
      throw new Error("Lô hàng chưa được ghi lên blockchain");
    }

    // 2. Lịch sử trên blockchain (chỉ đọc, không cần MetaMask)
    if (!RPC_URL || !CONTRACT_ADDRESS) {
      throw new Error("Thiếu RPC_URL hoặc CONTRACT_ADDRESS trong file .env ở thư mục gốc");
    }
    if (!abi) abi = window.APP_CONFIG.CONTRACT_ABI;
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const chain = await contract.getProductHistory(String(db.product.chain_id));

    if (chain.length !== db.history.length) {
      throw new Error(`Số mốc không khớp: DB ${db.history.length}, chain ${chain.length}`);
    }

    // --- ĐÂY LÀ ĐOẠN CODE MỚI THÊM VÀO ĐỂ BẮT GIAN LẬN SẢN PHẨM ---
    if (db.product.data_hash && chain.length > 0) {
      const dbProductHash = String(db.product.data_hash).toLowerCase();
      const chainProductHash = String(chain[0].dataHash).toLowerCase();

      if (dbProductHash !== chainProductHash) {
        throw new Error("CẢNH BÁO GIẢ MẠO: Thông tin lô hàng (Tên/Mô tả) đã bị chỉnh sửa trái phép so với bản gốc trên Blockchain!");
      }
    }
    // -----------------------------------------------------------

    // 3. Băm lại từng dòng DB, so với hash và địa điểm trên chain
    let allOk = true;
    const items = db.history.map((row, i) => {
      const c = chain[i];
      const computed = computeHash(row);
      const ok = computed === row.data_hash.toLowerCase()
        && computed === String(c.dataHash).toLowerCase();
      allOk = allOk && ok;
      return `<li class="tl-item ${ok ? "tl-ok" : "tl-bad"}">
        <b>${esc(new Date(row.ts * 1000).toLocaleString("vi-VN"))}</b><br>
        ${esc(row.location)} — ${esc(row.status)}<br>
        <small>${ok ? "Đã xác minh trên blockchain" : "Không khớp blockchain"}</small>
      </li>`;
    }).join("");

    out.innerHTML = `<h3>${esc(db.product.name)}</h3>
      <p class="${allOk ? "ok" : "bad"}">${allOk ? "Toàn bộ hành trình đã được xác minh" : "Có mốc không khớp với blockchain"}</p>
      <ol class="timeline">${items}</ol>
      <p><a href="https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener">Xem hợp đồng trên Etherscan</a></p>`;
    renderMap(db.history);
  } catch (e) {
    out.innerHTML = `<span class="bad">Lỗi: ${esc(e.message)}</span>`;
    hideMap();
  }
}

function hideMap() {
  const mapDiv = document.getElementById("map");
  if (trackingMap) {
    trackingMap.remove();
    trackingMap = null;
  }
  mapDiv.textContent = "";
  mapDiv.style.display = "none";
}

function renderMap(history) {
  const mapDiv = document.getElementById("map");
  const points = history
    .filter(row => row.lat !== null && row.lng !== null && Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng)))
    .map(row => [Number(row.lat), Number(row.lng)]);

  if (points.length === 0) {
    hideMap();
    return;
  }
  if (!window.L) {
    mapDiv.textContent = "Không tải được thư viện bản đồ. Hãy kiểm tra kết nối mạng.";
    mapDiv.style.display = "block";
    return;
  }

  mapDiv.style.display = "block";
  trackingMap = L.map(mapDiv).setView(points[0], 6);
 L.tileLayer('http://mt0.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}', {
  attribution: '&copy; Google Maps',
  maxZoom: 19,
}).addTo(trackingMap);

  const polyline = L.polyline(points, { color: "#17734f", weight: 4, opacity: 0.8 }).addTo(trackingMap);
  let pointIndex = 0;
  history.forEach((row, index) => {
    if (row.lat === null || row.lng === null || !Number.isFinite(Number(row.lat)) || !Number.isFinite(Number(row.lng))) {
      return;
    }
    const point = points[pointIndex++];
    L.marker(point).addTo(trackingMap)
      .bindPopup(`<b>Trạm ${index + 1}: ${esc(row.location)}</b><br>${esc(row.status)}`);
  });
  
  // Xử lý fitBounds tránh lỗi khi chỉ có 1 tọa độ
  if (points.length > 1) {
    trackingMap.fitBounds(polyline.getBounds(), { padding: [24, 24] });
  } else {
    trackingMap.setView(points[0], 13);
  }
  
  // Tăng thời gian chờ để DOM render xong kích thước mapDiv
  setTimeout(() => {
    if (trackingMap) {
      trackingMap.invalidateSize();
    }
  }, 300);
}

// Mở trang bằng link dạng index.html?id=5 (link trong QR)
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("pid");
  const id = new URLSearchParams(location.search).get("id");
  if (id) { input.value = id; traCuu(id.trim()); }
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") traCuu(input.value.trim());
  });
});

// Quét QR bằng camera
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
      let id = raw;
      try {
        id = new URL(raw, location.href).searchParams.get("id") || raw;
      } catch (_) {}
      if (id) {
        input.value = id;
        traCuu(id.trim());
      } else {
        alert("Mã QR không phải của hệ thống này");
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
      reader.style.display = "none";
      btn.style.display = "none";
    });
}