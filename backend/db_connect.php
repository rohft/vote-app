<?php
// db_connect.php

// Database configuration
// Change these values to match your Hostinger database details
$host = 'localhost';
$dbname = 'u620305964_voteapp'; // Example database name
$username = 'u620305964_rohft';    // Example username
$password = '!8Q5nZcXE##dgc?'; // Example password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    // Set the PDO error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    // In production, don't show the error details to the user
    die("Connection failed: " . $e->getMessage());
}
?>