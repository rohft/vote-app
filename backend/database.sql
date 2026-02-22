-- database.sql
-- Run this SQL in your Hostinger phpMyAdmin to create the table

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
