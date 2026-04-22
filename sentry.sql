CREATE DATABASE IF NOT EXISTS sentry;
USE sentry;

-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 19, 2026 at 01:53 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sentry`
--

-- --------------------------------------------------------
-- Table structure for table `admin`
-- --------------------------------------------------------

CREATE TABLE `admin` (
  `adm_id` int NOT NULL AUTO_INCREMENT,
  `adm_nama_lengkap` varchar(30) NOT NULL,
  `adm_email` varchar(50) NOT NULL,
  `adm_no_hp` varchar(15) NOT NULL,
  `adm_password` varchar(255) NOT NULL,
  `adm_role` enum('staff','admin') NOT NULL DEFAULT 'staff',
  `created_by` varchar(255) NOT NULL,
  `creation_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated_by` varchar(255) NOT NULL,
  `last_update_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`adm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin`
(`adm_id`, `adm_nama_lengkap`, `adm_email`, `adm_no_hp`, `adm_password`, `adm_role`, `created_by`, `creation_date`, `last_updated_by`, `last_update_date`)
VALUES
(1, 'paiz', 'paiz@gmail.com', '082144332211', '$2a$10$U6j6B3/qXSv4a726QjOEru5qGFAzFs1yWvyVy3Y3ZkLkYLx2nwbyO', 'staff', '', '2026-03-12 12:57:01', 'paiz@gmail.com', '2026-03-12 13:43:05'),
(2, 'Admin', 'admin@gmail.com', '081234567890', '$2a$10$XSBN1xnVQ0Rga5w6ElxPceDzUPEH56RYLD5.FV.WBmEIMcJFjUFGO', 'admin', 'paiz@gmail.com', '2026-03-12 10:36:13', 'paiz@gmail.com', '2026-03-12 10:36:13'),
(3, 'caca', 'caca@gmail.com', '088812001230', '$2b$10$IrqMpjwMIgn1P6CdJTqKuO38jyyZDO3RS4v/Mh4TTb042..S./dPS', 'staff', 'Admin', '2026-04-15 14:02:20', 'Admin', '2026-04-15 14:02:20'),
(4, 'WIsud', 'wisud@gmail.com', '0970972333333', '$2b$10$9IEF.mLmb4vgK0h.E0l2xurfgZXj5SeYdmYy.xMzlvENC3FRHjz.u', 'staff', 'Admin', '2026-04-15 14:02:54', 'Admin', '2026-04-15 14:02:54');

-- --------------------------------------------------------
-- Table structure for table `data_kelurahan`
-- --------------------------------------------------------

CREATE TABLE `data_kelurahan` (
  `kelurahan_id` int NOT NULL AUTO_INCREMENT,
  `nama_kelurahan` varchar(100) NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `creation_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated_by` varchar(255) NOT NULL,
  `last_update_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`kelurahan_id`),
  UNIQUE KEY `nama_kelurahan` (`nama_kelurahan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `data_kelurahan`
--

INSERT INTO `data_kelurahan`
(`kelurahan_id`, `nama_kelurahan`, `created_by`, `creation_date`, `last_updated_by`, `last_update_date`)
VALUES
(1, 'Lowokwaru Updated', 'paiz', '2026-04-14 00:18:20', 'paiz', '2026-04-14 09:08:07'),
(2, 'Rampal Celaket', 'paiz', '2026-04-14 00:55:05', 'paiz', '2026-04-14 00:55:05'),
(3, 'Samaan', 'paiz', '2026-04-14 09:11:52', 'paiz', '2026-04-14 09:11:52'),
(4, 'Kedung Kandang', 'paiz', '2026-04-14 09:12:15', 'paiz', '2026-04-14 09:12:15'),
(5, 'Miss you', 'paiz', '2026-04-15 02:03:25', 'paiz', '2026-04-15 02:03:25');

-- --------------------------------------------------------
-- Table structure for table `data_keyword`
-- --------------------------------------------------------

CREATE TABLE `data_keyword` (
  `keyword_id` int NOT NULL AUTO_INCREMENT,
  `keyword` varchar(255) NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `creation_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated_by` varchar(255) NOT NULL,
  `last_update_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`keyword_id`),
  UNIQUE KEY `keyword` (`keyword`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `data_keyword`
(`keyword_id`, `keyword`, `created_by`, `creation_date`, `last_updated_by`, `last_update_date`)
VALUES
(1, 'you said that i was too late', 'paiz', '2026-04-15 02:03:36', 'paiz', '2026-04-15 02:03:36'),
(2, 'i was wrong that i can fix you', 'paiz', '2026-04-15 02:04:21', 'paiz', '2026-04-15 02:04:21'),
(3, 'it''s hard to take', 'paiz', '2026-04-15 02:04:34', 'paiz', '2026-04-15 02:04:34'),
(4, 'i wish that i can fix you', 'paiz', '2026-04-15 03:58:18', 'paiz', '2026-04-15 03:58:18'),
(5, 'baby tell me that you is mine', 'paiz', '2026-04-15 03:58:33', 'paiz', '2026-04-15 03:58:33');

-- --------------------------------------------------------
-- Table structure for table `osint_settings`
-- --------------------------------------------------------

CREATE TABLE `osint_settings` (
  `osint_settings_id` int NOT NULL AUTO_INCREMENT,
  `set_jumlah_postingan` int NOT NULL DEFAULT 0,
  `set_jumlah_like` int NOT NULL DEFAULT 0,
  `set_jumlah_comment` int NOT NULL DEFAULT 0,
  `set_jumlah_share` int NOT NULL DEFAULT 0,
  `created_by` varchar(255) NOT NULL,
  `creation_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated_by` varchar(255) NOT NULL,
  `last_update_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`osint_settings_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `osint_settings`
--

INSERT INTO `osint_settings`
(`osint_settings_id`, `set_jumlah_postingan`, `set_jumlah_like`, `set_jumlah_comment`, `set_jumlah_share`, `created_by`, `creation_date`, `last_updated_by`, `last_update_date`)
VALUES
(1, 50, 20, 10, 5, 'paiz', '2026-04-15 04:01:46', 'paiz', '2026-04-15 04:01:46'),
(2, 2, 0, 0, 0, 'paiz', '2026-04-15 04:02:00', 'paiz', '2026-04-15 04:02:00'),
(3, 5, 0, 0, 0, 'paiz', '2026-04-15 04:02:35', 'paiz', '2026-04-15 04:02:35'),
(4, 0, 7, 0, 0, 'paiz', '2026-04-15 04:02:44', 'paiz', '2026-04-15 04:02:44'),
(5, 4, 0, 0, 0, 'paiz', '2026-04-15 05:26:33', 'paiz', '2026-04-15 05:26:33'),
(6, 0, 6, 0, 0, 'paiz', '2026-04-15 05:26:38', 'paiz', '2026-04-15 05:26:38'),
(7, 0, 0, 7, 0, 'paiz', '2026-04-15 05:26:41', 'paiz', '2026-04-15 05:26:41'),
(8, 0, 0, 0, 7, 'paiz', '2026-04-15 05:26:45', 'paiz', '2026-04-15 05:26:45'),
(9, 11, 20, 11, 7, 'paiz', '2026-04-15 05:26:58', 'paiz', '2026-04-15 09:36:51');

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;