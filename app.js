const RPC_URL = "https://rpc.sepolia.org";
const CONTRACT_ADDRESS = "0x1aCe4389468e76dfB88fF8D81808364b006CBa26";      // địa chỉ sau khi người 1 deploy lại
const API_URL = "api.php";
let abi = null;

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

    // 2. Hash trên blockchain (chỉ đọc, không cần MetaMask)
    if (!abi) abi = await (await fetch("SupplyChainABI.json")).json();
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const chain = await contract.getProductHistory(db.product.chain_id);

    if (chain.length !== db.history.length) {
      throw new Error(`Số mốc không khớp: DB ${db.history.length}, chain ${chain.length}`);
    }

    // 3. Băm lại từng dòng DB, so với hash chain
    let allOk = true;
    const items = db.history.map((row, i) => {
      const computed = computeHash(row);
      const onChain = String(chain[i].dataHash).toLowerCase();
      const ok = computed === row.data_hash.toLowerCase() && computed === onChain;
      allOk = allOk && ok;
      return `<div class="item">
        <b>${esc(new Date(row.ts * 1000).toLocaleString("vi-VN"))}</b> — ${esc(row.location)}<br>
        Trạng thái: ${esc(row.status)}<br>
        <span class="${ok ? "ok" : "bad"}">${ok ? "✅ Đã xác minh" : "⚠️ Dữ liệu có thể bị chỉnh sửa"}</span>
      </div>`;
    }).join("");

    out.innerHTML = `<h3>${esc(db.product.name)}</h3>
      <p class="${allOk ? "ok" : "bad"}">${allOk ? "Toàn bộ hành trình đã được xác minh" : "Có mốc không khớp với blockchain"}</p>
      ${items}`;
  } catch (e) {
    out.innerHTML = `<span class="bad">Lỗi: ${esc(e.message)}</span>`;
  }
}