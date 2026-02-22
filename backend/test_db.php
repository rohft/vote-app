<?php
// backend/test_db.php
require_once 'db_connect.php';

try {
    $stmt = $pdo->query("SELECT 'Connected successfully' as msg");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo $row['msg'];
    
    echo "<br>Checking tables...<br>";
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    if (empty($tables)) {
        echo "No tables found! Did you import database.sql?";
    } else {
        echo "Tables found: " . implode(", ", $tables);
        
        // Check if data exists
        $stmt = $pdo->query("SELECT setting_key FROM app_settings");
        $keys = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "<br>Keys in app_settings: " . implode(", ", $keys);
    }
    
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>