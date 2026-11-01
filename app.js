const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const CONTRACT_ADDRESS = "0xF33310DF8c1cdCc625160192724314Bb075a71DB"; // địa chỉ sau khi người 1 deploy lại
const API_URL = "api.php";
let abi = null;
let scanner = null;

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
  if (!/^\d+$/.test(dbId)) {
    out.innerHTML = `<span class="bad">Vui lòng nhập mã lô hàng là số</span>`;
    return;
  }
  out.textContent = "Đang tải...";
  try {
    // 1. Lô hàng + lịch sử từ Database
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "history", id: dbId }),
    });
    const db = await res.json();
    if (!db.product) throw new Error(db.message || "Không tìm thấy lô hàng");
    if (db.product.chain_id == null) throw new Error("Lô hàng chưa được ghi lên blockchain");

    // 2. Lịch sử trên blockchain (chỉ đọc, không cần MetaMask)
    if (!abi) abi = await (await fetch("SupplyChainABI.json")).json();
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const chain = await contract.getProductHistory(db.product.chain_id);

    if (chain.length !== db.history.length) {
      throw new Error(`Số mốc không khớp: DB ${db.history.length}, chain ${chain.length}`);
    }

    // 3. Băm lại từng dòng DB, so với hash và địa điểm trên chain
    let allOk = true;
    const items = db.history.map((row, i) => {
      const c = chain[i];
      const computed = computeHash(row);
      const ok = computed === row.data_hash.toLowerCase()
              && computed === String(c.dataHash).toLowerCase()
              && c.location === row.location;
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
  } catch (e) {
    out.innerHTML = `<span class="bad">Lỗi: ${esc(e.message)}</span>`;
  }
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