<?php
// save_data.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

require_once 'db_connect.php';

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("INSERT INTO app_settings (setting_key, setting_value) VALUES (:key, :value) ON DUPLICATE KEY UPDATE setting_value = :value");
    
    foreach ($data as $key => $value) {
        // Only allow specific keys for security
        if (in_array($key, ['municipalities', 'columnConfigs', 'ethnicityMappings', 'localityConfigs'])) {
            $jsonValue = json_encode($value);
            $stmt->execute([':key' => $key, ':value' => $jsonValue]);
        }
    }
    
    $pdo->commit();
    echo json_encode(['success' => true]);
    
} catch(PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>