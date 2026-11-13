<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Phương thức không được hỗ trợ']);
    exit;
}

require '../db.php'; 

$data = json_decode(file_get_contents('php://input'));
if (!is_object($data)) {
    http_response_code(400);
    echo json_encode(['message' => 'Dữ liệu gửi lên không hợp lệ']);
    exit;
}

$action = isset($data->action) ? (string)$data->action : '';

function api_fail($message, $status = 400)
{
    http_response_code($status);
    echo json_encode(['message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function api_find_product($conn, $key)
{
    if ($key === '') {
        return null;
    }

    if (ctype_digit($key)) {
        $stmt = $conn->prepare('SELECT id, name, chain_id FROM products WHERE id = ? OR chain_id = ? LIMIT 1');
    } else {
        $stmt = $conn->prepare('SELECT id, name, chain_id FROM products WHERE chain_id = ? LIMIT 1');
    }
    if (!$stmt) {
        api_fail('Lỗi truy vấn lô hàng', 500);
    }

    if (ctype_digit($key)) {
        $stmt->bind_param('ss', $key, $key);
    } else {
        $stmt->bind_param('s', $key);
    }
    if (!$stmt->execute()) {
        $stmt->close();
        api_fail('Lỗi tìm lô hàng', 500);
    }
    $product = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $product ?: null;
}

function api_coordinate($data, $key)
{
    if (!isset($data->$key) || $data->$key === '') {
        return null;
    }
    if (!is_numeric($data->$key)) {
        api_fail('Tọa độ không hợp lệ');
    }
    return (float)$data->$key;
}

function api_insert_history($conn, $productId, $location, $status, $hash, $updatedBy, $timestamp, $lat, $lng)
{
    $stmt = $conn->prepare(
        'INSERT INTO tracking_history (product_id, location, status, data_hash, updated_by, updated_at, lat, lng)
         VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?, ?)'
    );
    if (!$stmt) {
        api_fail('Lỗi tạo truy vấn lịch sử', 500);
    }

    $stmt->bind_param('isssiidd', $productId, $location, $status, $hash, $updatedBy, $timestamp, $lat, $lng);
    if (!$stmt->execute()) {
        $stmt->close();
        api_fail('Lỗi ghi lịch sử lô hàng', 500);
    }
    $stmt->close();
}

if ($action === 'create') {
    $name = trim((string)($data->name ?? ''));
    if ($name === '') {
        api_fail('Vui lòng nhập tên lô hàng');
    }

    $description = (string)($data->description ?? '');
    $chainId = isset($data->chain_id) && (string)$data->chain_id !== ''
        ? (string)$data->chain_id
        : null;
    $lat = api_coordinate($data, 'lat');
    $lng = api_coordinate($data, 'lng');

    $conn->begin_transaction();
    $stmt = $conn->prepare('INSERT INTO products (name, description, chain_id, farmer_id) VALUES (?, ?, ?, 1)');
    if (!$stmt) {
        $conn->rollback();
        api_fail('Lỗi tạo truy vấn lô hàng', 500);
    }
    $stmt->bind_param('sss', $name, $description, $chainId);
    if (!$stmt->execute()) {
        $stmt->close();
        $conn->rollback();
        api_fail('Lỗi tạo lô hàng', 500);
    }
    $productId = (int)$conn->insert_id;
    $stmt->close();

    if ($chainId === null) {
        $chainId = (string)$productId;
        $stmt = $conn->prepare('UPDATE products SET chain_id = ? WHERE id = ?');
        if (!$stmt) {
            $conn->rollback();
            api_fail('Lỗi cập nhật mã blockchain', 500);
        }
        $stmt->bind_param('si', $chainId, $productId);
        if (!$stmt->execute()) {
            $stmt->close();
            $conn->rollback();
            api_fail('Lỗi cập nhật mã blockchain', 500);
        }
        $stmt->close();
    }

    $location = 'Cơ sở sản xuất';
    $status = 'Khởi tạo';
    $timestamp = time();
    $hash = '0x' . hash('sha256', $productId . $location . $status . $timestamp);
    api_insert_history($conn, $productId, $location, $status, $hash, 1, $timestamp, $lat, $lng);

    if (!$conn->commit()) {
        $conn->rollback();
        api_fail('Không thể lưu lô hàng', 500);
    }

    echo json_encode([
        'status' => 'success',
        'id' => $productId,
        'chain_id' => $chainId,
        'hash' => $hash,
        'location' => $location,
    ], JSON_UNESCAPED_UNICODE);
} elseif ($action === 'update') {
    $key = trim((string)($data->id ?? ''));
    $product = api_find_product($conn, $key);
    if (!$product) {
        api_fail('Không tìm thấy lô hàng để cập nhật', 404);
    }

    $location = trim((string)($data->location ?? ''));
    $status = trim((string)($data->status ?? ''));
    if ($location === '' || $status === '') {
        api_fail('Vui lòng nhập địa điểm và trạng thái');
    }

    $lat = api_coordinate($data, 'lat');
    $lng = api_coordinate($data, 'lng');
    $productId = (int)$product['id'];
    $chainId = $product['chain_id'] !== null ? (string)$product['chain_id'] : (string)$productId;
    $timestamp = time();
    $hash = '0x' . hash('sha256', $productId . $location . $status . $timestamp);

    api_insert_history($conn, $productId, $location, $status, $hash, 2, $timestamp, $lat, $lng);
    echo json_encode(['hash' => $hash, 'chain_id' => $chainId], JSON_UNESCAPED_UNICODE);
} elseif ($action === 'confirm_blockchain' || $action === 'setChain') {
    $id = filter_var($data->id ?? null, FILTER_VALIDATE_INT);
    $chainId = trim((string)($data->chain_id ?? ''));
    if (!$id || $chainId === '') {
        api_fail('Mã lô hàng hoặc mã blockchain không hợp lệ');
    }

    $stmt = $conn->prepare('UPDATE products SET chain_id = ? WHERE id = ?');
    if (!$stmt) {
        api_fail('Lỗi truy vấn cập nhật mã blockchain', 500);
    }
    $stmt->bind_param('si', $chainId, $id);
    if (!$stmt->execute()) {
        $stmt->close();
        api_fail('Lỗi cập nhật mã blockchain', 500);
    }
    $affectedRows = $stmt->affected_rows;
    $stmt->close();
    if ($affectedRows === 0) {
        $check = $conn->prepare('SELECT id FROM products WHERE id = ? LIMIT 1');
        if (!$check) {
            api_fail('Lỗi kiểm tra lô hàng', 500);
        }
        $check->bind_param('i', $id);
        $check->execute();
        $exists = $check->get_result()->num_rows > 0;
        $check->close();
        if (!$exists) {
            api_fail('Không tìm thấy lô hàng', 404);
        }
    }
    echo json_encode(['ok' => true]);
} elseif ($action === 'history') {
    $key = trim((string)($data->id ?? ''));
    $product = api_find_product($conn, $key);
    if (!$product) {
        api_fail('Không tìm thấy lô hàng', 404);
    }

    $productId = (int)$product['id'];
    $stmt = $conn->prepare(
        'SELECT product_id, location, status, data_hash, lat, lng, UNIX_TIMESTAMP(updated_at) AS ts
         FROM tracking_history WHERE product_id = ? ORDER BY id ASC'
    );
    if (!$stmt) {
        api_fail('Lỗi truy vấn lịch sử', 500);
    }
    $stmt->bind_param('i', $productId);
    if (!$stmt->execute()) {
        $stmt->close();
        api_fail('Lỗi đọc lịch sử lô hàng', 500);
    }
    $result = $stmt->get_result();
    $history = [];
    while ($row = $result->fetch_assoc()) {
        $row['product_id'] = (int)$row['product_id'];
        $row['ts'] = (int)$row['ts'];
        $history[] = $row;
    }
    $stmt->close();
    echo json_encode(['product' => $product, 'history' => $history], JSON_UNESCAPED_UNICODE);
} else {
    api_fail('Hành động không hợp lệ');
}

$conn->close();
