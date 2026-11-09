-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Nov 09, 2026 at 12:27 PM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `traceability_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `chain_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `farmer_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `chain_id`, `farmer_id`, `created_at`) VALUES
(1, 'Xoài cát Hòa Lộc', 'Loại 1', '1', 1, '2026-11-08 12:16:35'),
(2, 'Xoài', 'Xoài cát loại a', '2', 1, '2026-11-09 11:18:37');

-- --------------------------------------------------------

--
-- Table structure for table `tracking_history`
--

DROP TABLE IF EXISTS `tracking_history`;
CREATE TABLE IF NOT EXISTS `tracking_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `data_hash` varchar(66) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tracking_history`
--

INSERT INTO `tracking_history` (`id`, `product_id`, `location`, `status`, `data_hash`, `updated_by`, `updated_at`, `lat`, `lng`) VALUES
(1, 1, 'Cơ sở sản xuất', 'Khởi tạo', '0x101ba30d397eeedc473c73a5d50cbe7579482a71985ffb623e3d59f142df0b4e', 1, '2026-11-08 12:16:35', NULL, NULL),
(2, 1, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xd60dbfdd91857e8e6adacd1bf7db4417811dcb30f75325b1fbfd2c1ea5d74c21', 2, '2026-11-08 12:18:55', NULL, NULL),
(3, 2, 'Cơ sở sản xuất', 'Khởi tạo', '0x31843cb803ea8543215d094c9d516aca8d13208489459b6b1161b9c6ae8f1d67', 1, '2026-11-09 11:18:37', 9.990357, 105.760257),
(4, 2, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0xe0a64f48ccc430a93df7051a69e0f55ceb7b8916795fc31d1fa0e528c1bdb3f5', 2, '2026-11-09 11:22:13', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wallet_address` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `nonce` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wallet_address` (`wallet_address`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `wallet_address`, `full_name`, `role`, `nonce`) VALUES
(1, '0x127fA0a12254b7e39ABECfDed3A5227AD1206F25', NULL, 'admin', '49a5a83d2d9b413ff887cf18077f51f6'),
(2, '0x9c97f83B42D97a8cCA6d211eB7EBBa26E8f41BAC', NULL, 'transporter', 'e09626872b015444d0ea9057b193aca5');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
