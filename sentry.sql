-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 06, 2026 at 10:18 AM
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

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `ADM_ID` int NOT NULL,
  `ADM_NAMA_LENGKAP` varchar(30) NOT NULL,
  `ADM_EMAIL` varchar(50) NOT NULL,
  `ADM_NO_HP` varchar(15) NOT NULL,
  `ADM_PASSWORD` varchar(255) NOT NULL,
  `CREATED_BY` varchar(255) NOT NULL,
  `CREATION_DATE` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `LAST_UPDATED_BY` varchar(255) NOT NULL,
  `LAST_UPDATE_DATE` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`ADM_ID`, `ADM_NAMA_LENGKAP`, `ADM_EMAIL`, `ADM_NO_HP`, `ADM_PASSWORD`, `CREATED_BY`, `CREATION_DATE`, `LAST_UPDATED_BY`, `LAST_UPDATE_DATE`) VALUES
(1, 'paiz', 'paiz@gmail.com', '082144332211', '$2a$10$U6j6B3/qXSv4a726QjOEru5qGFAzFs1yWvyVy3Y3ZkLkYLx2nwbyO', '', '2026-03-12 12:57:01', 'paiz@gmail.com', '2026-03-12 13:43:05'),
(2, 'Admin', 'admin@gmail.com', '081234567890', '$2a$10$XSBN1xnVQ0Rga5w6ElxPceDzUPEH56RYLD5.FV.WBmEIMcJFjUFGO', 'paiz@gmail.com', '2026-03-12 10:36:13', 'paiz@gmail.com', '2026-03-12 10:36:13');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`ADM_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `ADM_ID` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
