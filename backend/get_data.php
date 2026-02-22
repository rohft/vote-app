<?php
// get_data.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Configure this for security in production
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0'); // Prevent caching

require_once 'db_connect.php';

try {
    // Prepare SQL to fetch all settings
    $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM app_settings");
    $stmt->execute();
    
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $data = [];
    foreach ($result as $row) {
        // Decode JSON stored in database
        $data[$row['setting_key']] = json_decode($row['setting_value']);
    }
    
    // Return empty object if no data found (first run)
    echo json_encode($data ?: new stdClass());
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>