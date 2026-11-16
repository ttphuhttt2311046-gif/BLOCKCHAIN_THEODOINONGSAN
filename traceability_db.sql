-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1:3306
-- Thời gian đã tạo: Th10 16, 2026 lúc 02:39 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `traceability_db`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `chain_id` int(11) DEFAULT NULL,
  `farmer_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `data_hash` varchar(66) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `chain_id`, `farmer_id`, `created_at`, `data_hash`) VALUES
(1, 'Cam Sành', 'cam loại 1', NULL, 1, '2026-11-02 07:20:06', NULL),
(18, 'Nho', 'Nho Không hạt tím', 2, 1, '2026-11-10 08:49:06', NULL),
(19, 'Bưởi', 'Bưởi 5 88roi', 3, 1, '2026-11-11 02:13:01', '0x59f45aac6a6fa58328d3d209e80115d2b492248e0ea065c453e3c6d04e3802ac'),
(20, 'CAM SÀNH', 'cam sành loại 2', 4, 1, '2026-11-13 03:08:50', '0xcea5bdf32da9c41ef032f4b85542ea9091d3316474d4b0ef22ec09db61376539'),
(21, 'ổi', 'ổi ruột hồng loại 1', 5, 1, '2026-11-13 04:21:09', '0x0169472c77b0f40635e745b64b9b0c7311ceb3a3c58572d887cdec60a029bc67'),
(22, 'vải', 'vải thái nguyên', 6, 1, '2026-11-13 13:22:43', '0x3c334bae5ea8f808d6b7cbfce9559a02a65634876221097acaa55663898cce26'),
(23, 'Dưa', 'dưa 1', 7, 1, '2026-11-13 13:55:09', '0x8a11ca346d3e74c6266a5104fa94bf58d57e451a5410e4247b0cd9497c3ab62e'),
(24, 'Bưởi Da Xanh', 'Bưởi da xanh loại 1', 8, 1, '2026-11-16 13:20:54', '0xfc06976e79cc21e532dc5e63ad1b1464ad04c5094c974ab85d976b1e95a798ca');

--
-- Bẫy `products`
--
DELIMITER $$
CREATE TRIGGER `before_product_insert` BEFORE INSERT ON `products` FOR EACH ROW BEGIN
    -- Vì lúc tạo mới ID tự tăng chưa được sinh ra, ta băm name và description
    SET NEW.data_hash = CONCAT('0x', SHA2(CONCAT(NEW.name, '-', IFNULL(NEW.description, '')), 256));
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `before_product_update` BEFORE UPDATE ON `products` FOR EACH ROW BEGIN
    -- Khi cập nhật đã có ID, ta ghép cả ID, name và description để băm
    SET NEW.data_hash = CONCAT('0x', SHA2(CONCAT(NEW.id, '-', NEW.name, '-', IFNULL(NEW.description, '')), 256));
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tracking_history`
--

CREATE TABLE `tracking_history` (
  `id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `data_hash` varchar(66) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `lat` decimal(10,8) DEFAULT NULL,
  `lng` decimal(11,8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `tracking_history`
--

INSERT INTO `tracking_history` (`id`, `product_id`, `location`, `status`, `data_hash`, `updated_by`, `updated_at`, `lat`, `lng`) VALUES
(1, 1, 'Nông trại', 'Khởi tạo', '0x7a29901bf92030e0f24eb63ab986987d1348cc2bd8e907d6ee6cc8043c0e7157', 1, '2026-11-02 07:20:06', NULL, NULL),
(2, 3, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x99de19c1a5a1d35a2e36f30ff94c59e3b7a09f7162bf67e135e621b8b8ae1027', 2, '2026-11-02 07:20:41', NULL, NULL),
(3, 3, 'Nông trại', 'Khởi tạo', '0xc2e84f74414fe9bf08c0e1f6c2387e2e507014fd0d5f02cadcec5b40648fc704', 1, '2026-11-02 07:50:13', NULL, NULL),
(4, 4, 'Siêu thị phân phối', 'Đang vận chuyển', '0xe2dec1642a595069eaa5e18cbbbc76da31be4ff22908cdef18e8f20ab1f81e99', 2, '2026-11-02 07:50:43', NULL, NULL),
(5, 5, 'Nông trại', 'Khởi tạo', '0x16244e59db42b106900a7dfcae4dfc63e3c5eb7eeea1e010f948f101dda859d4', 1, '2026-11-02 08:14:15', NULL, NULL),
(6, 5, 'Nông trại Đồng Tháp', 'Đã nhập kho', '0x9284eb4eaf4345c73ca5ac9422330194b74efc9b936303a8e7f65addbd9bb91c', 2, '2026-11-02 08:14:38', NULL, NULL),
(7, 5, 'Siêu thị phân phối', 'Đã nhập kho', '0x71c38651ca45120e633171b6936963db931a845447346f15f59cde22ffbd90c6', 2, '2026-11-02 08:16:23', NULL, NULL),
(8, 6, 'Nông trại', 'Khởi tạo', '0xb0d13e6620bb434451828e2558b490c45cd94ff5dd566450b2237410e9d3a67c', 1, '2026-11-02 08:21:08', NULL, NULL),
(9, 6, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xaf8311dec91960634740d1f871e9d632dbc89fff80834d1ecb7dde072a5e9b12', 2, '2026-11-02 08:21:46', NULL, NULL),
(10, 7, 'Cơ sở sản xuất', 'Khởi tạo', '0x2e850600fdda786cc288428f33fdcf4d4340cffd89e2834dc537d48bc526e528', 1, '2026-11-02 08:24:42', NULL, NULL),
(11, 7, 'Nông trại Đồng Tháp', 'Đã thu hoạch', '0x60b06125bb11f8bb8ba114365615859465ccc434dfdce43c63cdcc2655ff84ac', 2, '2026-11-02 08:25:08', NULL, NULL),
(12, 8, 'Cơ sở sản xuất', 'Khởi tạo', '0xe3b4a532fa7e04c649c932f58507d386c0fd76ba201306c07a5bfab22cdc0a05', 1, '2026-11-02 08:37:08', NULL, NULL),
(13, 8, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xcefaa48eea607f8483d9e33d9ac617280eeb6188c2dcf0e5946105733bd9884e', 2, '2026-11-02 08:37:38', NULL, NULL),
(14, 9, 'Cơ sở sản xuất', 'Khởi tạo', '0x8f481eb50172c6fa90e4b22d5757775a5dd0ed1fa2f07adf833c2af003d06200', 1, '2026-11-06 01:03:01', NULL, NULL),
(15, 9, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xf95cb18c10da2dc58cef881ff0ac695d71482750ac352d95770320b6f948464d', 2, '2026-11-06 01:03:28', NULL, NULL),
(16, 10, 'Cơ sở sản xuất', 'Khởi tạo', '0xa13c28a002661f12f6ecaf89ea87c9ccba9644549945a6312c4609cdcb6f4730', 1, '2026-11-06 01:41:57', 9.78061461, 105.73650673),
(17, 10, 'Trạm trung chuyển Cần Thơ', 'Đã thu hoạch', '0xc3ca26412f21784f9449385468ef2eff810f86d134a2717a7630479e281f2385', 2, '2026-11-06 01:42:32', 9.78063070, 105.73643194),
(18, 10, 'Kho lạnh TP.HCM', 'Đã nhập kho', '0xe670cd4e815a4bf6a14832d87268c92eadfbc13a30a8e42530e34ed7a6abc71b', 2, '2026-11-06 01:43:30', NULL, NULL),
(19, 11, 'Cơ sở sản xuất', 'Khởi tạo', '0x0c5fc4206b04c8e0fb0e9b60af093d55e27f835679530d0bbab627038d881d48', 1, '2026-11-06 02:04:47', 9.78061069, 105.73643604),
(20, 11, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x4176d3635ff13c7534a4b8c3d5ce2337f484a1ede398f0ba24fc9cb3ca34773d', 2, '2026-11-06 02:05:51', 9.78062010, 105.73646800),
(21, 12, 'Cơ sở sản xuất', 'Khởi tạo', '0x82e9b1ef41b0de0e51ddbdb03a19c00c0f84b9bd21bd6b5877212d5c4018ee9a', 1, '2026-11-07 04:23:22', 9.78069126, 105.73638743),
(22, 13, 'Cơ sở sản xuất', 'Khởi tạo', '0xf8935e654b1ed7729281dea869e303c0a062a454ddb6da57f1904dd7dc964e21', 1, '2026-11-08 13:33:25', 9.76588400, 105.69795200),
(23, 13, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0x247ee16f6d1b326f539bc0aafc933ec842c200508539f44214fc8e491a3bb0b4', 2, '2026-11-08 13:34:38', 9.76588809, 105.69796308),
(24, 13, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0x94f8a6b04899c7ca5964d84ec10059e7bf275145389e6490a28bf5b9f2de6d49', 2, '2026-11-08 13:34:42', 9.76588809, 105.69796308),
(25, 13, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0xb6d6351a9c1a0fb09bc6de3b5a55858aa0e96ac879bbed3154d91b3bc9be3e1b', 2, '2026-11-08 13:34:54', 9.76588809, 105.69796308),
(26, 13, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0xfa2e2e0ad524b88b11cdc99b2c825fdfcc3bb51887e6a74d78f5812ad7d4d969', 2, '2026-11-08 13:35:25', NULL, NULL),
(27, 13, 'Kho lạnh TP.HCM', 'Đang vận chuyển', '0xf3f1477f89b1b32bf12dd5d3c3e9f2ed861b8a89f9956f71f9b3036f256c26c2', 2, '2026-11-08 13:35:40', NULL, NULL),
(28, 13, 'Kho lạnh TP.HCM', 'Đang vận chuyển', '0x3427cd91cf81306ed8e7144f6b4707b1d06ec0b4ffc29e8c0191173fc8355239', 2, '2026-11-08 13:36:01', 9.76588809, 105.69796308),
(29, 12, 'Nông trại Đồng Tháp', 'Đã nhập kho', '0x847c54487419bb7ee9c43c320f4c84e5167952d44a8de9c332083145e78e9ff3', 2, '2026-11-08 13:37:15', 9.76588809, 105.69796308),
(30, 13, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x68c48f3579426a22333a0e50c832c63cbfa5c8eb7c703831ee836868f4816708', 2, '2026-11-08 13:38:03', 9.76588809, 105.69796308),
(31, 13, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xc0b5376c768a2d780f959be1bbf8961590bbb9d5672cf12bfc52099c9da3039e', 2, '2026-11-08 13:38:15', 9.76588809, 105.69796308),
(32, 13, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0xb5a1d9757f56932f57676f5c4902677c42befbd35f2da777b6b2f4565b24dae5', 2, '2026-11-08 13:38:41', 9.76588809, 105.69796308),
(33, 13, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0x3483fa610fbffe15fabaa4bd8a380ff80e75f105cc3a13e2b5be5a7ceb5bf884', 2, '2026-11-08 13:39:04', 9.76588809, 105.69796308),
(34, 13, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0x1f0f996d87c0e6a9d9fc63a5fdf05e067e891c4b2a127df826a13111b121ee54', 2, '2026-11-08 13:50:29', 9.76588809, 105.69796308),
(35, 13, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0xb51b3ffb0050fe1cd9708e0745efa71ea51ad8df81dfdba6853b2d9dcdd40952', 2, '2026-11-08 13:53:31', 9.76588809, 105.69796308),
(36, 13, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0xfb52fc276978c7e75cded4cb561bfe7ee4ffa613bc8f2d662778c7d4e015667c', 2, '2026-11-08 14:03:07', 9.76588809, 105.69796308),
(37, 13, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0x0904e08438b7fb49f73f92ca88ee76cb761f9ed0d97ccfe12675c38d027f3fa9', 2, '2026-11-08 14:04:01', 9.76588809, 105.69796308),
(38, 13, 'Trạm trung chuyển Cần Thơ', 'Đã thu hoạch', '0x438387727d81db8343a1f89ddb66b004551d7ced1568b44669c2d1367dfe4c27', 2, '2026-11-08 14:09:56', 9.76588400, 105.69795200),
(39, 13, 'Trạm trung chuyển Cần Thơ', 'Đã thu hoạch', '0xada8e87d2c31d6d1636332ab5c35f09b7521e0e9aa03fa17e99551153df3b613', 2, '2026-11-08 14:10:01', 9.76588400, 105.69795200),
(40, 9, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x46b81f41dd59a404b14b536091328b8e6888e87a02b7ef775eceaeefa990ff02', 2, '2026-11-08 14:21:55', NULL, NULL),
(41, 9, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xf571bde6c2c0beb167b7827d1df16b1f4327f49de8afa1ddd1ab0050f64cfe88', 2, '2026-11-08 14:23:56', NULL, NULL),
(42, 13, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x7157f016426c2e8545acb99dbba80905c59ac886856e158a77847677f33f3b75', 2, '2026-11-08 14:25:16', NULL, NULL),
(43, 13, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xd3421b0d4cdb223f7810a0748eef6481b20acc69ecaa283b6b6a2948d8055399', 2, '2026-11-08 14:25:21', NULL, NULL),
(44, 14, 'Cơ sở sản xuất', 'Khởi tạo', '0x5d7307b0afc3e85ee6c61f32c3eab4cc41a92585c88b0b6e58b87763ea7d8379', 1, '2026-11-08 14:26:20', 9.76588400, 105.69795200),
(45, 14, 'Trạm trung chuyển Cần Thơ', 'Đã thu hoạch', '0xa59b57074adef26617d25b1c9b9ade453ca4574274a5c9c639fece43d51dd153', 2, '2026-11-08 14:26:51', NULL, NULL),
(46, 14, 'Trạm trung chuyển Cần Thơ', 'Đã thu hoạch', '0xb3b2ec90e5172caa3b49265d87c21cfa02416cb7f76262f794a8d7256af6588c', 2, '2026-11-08 14:26:56', 9.76588400, 105.69795200),
(47, 14, 'Trạm trung chuyển Cần Thơ', 'Đã thu hoạch', '0x6fc3d1b50d100ae3d50b1bf3ad5b82baf6e462e69d5512ca7c3ae737efea7911', 2, '2026-11-08 14:26:59', 9.76588400, 105.69795200),
(48, 15, 'Cơ sở sản xuất', 'Khởi tạo', '0x92c229ea39de95444d2be4c00326a27cfec001b8557f02b1af37ee1510865f66', 1, '2026-11-10 06:40:54', 9.76588809, 105.69796308),
(49, 13, 'Nông trại Đồng Tháp', 'Đã thu hoạch', '0x8f58e165d97596680c75179b6205433187b61674f96e72d7d2540e7da82f7393', 2, '2026-11-10 06:41:30', 9.76588809, 105.69796308),
(50, 14, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0x8286b3904bc39fe0afcb56a0f929df30e1940f2daddd298c967aeea170cd7057', 2, '2026-11-10 06:41:39', 9.76588809, 105.69796308),
(51, 14, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0xc8dc03529c8699d5693a80408253158eb9b30e26f426fb9f143e5dc929ba32fc', 2, '2026-11-10 06:41:44', 9.76588809, 105.69796308),
(52, 15, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0x4e98f7cea9cac860f5d6cbe9a351e35e58e242c1139d6dc509d9e77505b5d3fb', 2, '2026-11-10 06:42:00', 9.76588809, 105.69796308),
(53, 15, 'Nông trại Đồng Tháp', 'Đang vận chuyển', '0x28941320b20b6422ea2884ea1674f2d8d747cde91c32ecae22b3f710d3c86625', 2, '2026-11-10 06:42:07', 9.76588809, 105.69796308),
(54, 14, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x222c6b24f23ecf0dafbd9c9b3900ec0eafc511619d186beea89c83b6e5711211', 2, '2026-11-10 06:44:30', NULL, NULL),
(55, 16, 'Cơ sở sản xuất', 'Khởi tạo', '0x284512d06794d38e7f23a27d7323656942ae761c7686bd2822785b83e288a7be', 1, '2026-11-10 07:00:18', NULL, NULL),
(56, 16, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x137197b94c2329fab5a49f56d4a6b65ffb49b61214dbe16f13671db9a0bdbf95', 2, '2026-11-10 07:00:46', 9.76588400, 105.69795200),
(57, 16, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0xd4916ad0ba6644a3b03fb36ea5cfdac43f26fd797b1cca3ffd591d4427b33186', 2, '2026-11-10 07:01:00', 9.76588400, 105.69795200),
(58, 16, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0x137b80e6b233eacc9592553bd7227c4cd7e9e4a328d1f0a6a2e07e1aa8dc0275', 2, '2026-11-10 07:04:16', 9.76588400, 105.69795200),
(59, 16, 'Trạm trung chuyển Cần Thơ', 'Đã nhập kho', '0x6b88e77b9917923861f1c6400942b97d42da5b4c84fe2d66d98eaec13b1b228f', 2, '2026-11-10 07:04:58', 9.76588400, 105.69795200),
(60, 16, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x55bbc45521bd9160c71079b45087f123b77cb9b7c4be6009e3fb6a8198eed153', 2, '2026-11-10 08:43:50', NULL, NULL),
(61, 15, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x01394679c1f434eaf2f22e6036e92cfc860692d38fdbcfaeca0d61ebc687225a', 2, '2026-11-10 08:43:58', NULL, NULL),
(62, 16, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x23418a862777708134150f166e6896c924907982f3552ee8446b1d44c28a9c5e', 2, '2026-11-10 08:44:34', NULL, NULL),
(63, 17, 'Cơ sở sản xuất', 'Khởi tạo', '0x04805ee3734b7df1dba9ce7d84b0554a76876c1b9be26a52ef78d4f3bd95c5ea', 1, '2026-11-10 08:45:06', NULL, NULL),
(64, 1, 'Trạm trung chuyển Cần Thơ', 'Đang vận chuyển', '0x8185a5d0e60634dad11a71568b27760006ea9088c282a55089de6396881a5dc8', 2, '2026-11-10 08:45:40', 9.78055957, 105.73609325),
(65, 18, 'Cơ sở sản xuất', 'Khởi tạo', '0x953b418978d34435f27710d1da3898eeeb395fb7b73b2e103488e7f545e65804', 1, '2026-11-10 08:49:06', NULL, NULL),
(66, 18, 'Nông trại Đồng Tháp', 'Đã thu hoạch', '0xc6ed3d43eba0f1784761d75f990e88d7cee9e6a065cc07aee0d72f2d233389d0', 2, '2026-11-10 08:49:47', 9.78060627, 105.73629042),
(67, 18, 'Siêu thị phân phối', 'Đã nhập kho', '0xbb5571eef9e95bcef75fe06967d279afe351c7c09781e5957f7faf0d17d9091f', 2, '2026-11-10 09:43:41', 9.78057464, 105.73604168),
(68, 18, 'Tọa độ: 9.7806, 105.7361', 'Đang vận chuyển', '0xa86e1a8c5c916866a4acca60faf0f2466c042429d3b867a8b1f18a41d7ddf8ea', 2, '2026-11-10 10:23:16', 9.78062230, 105.73613097),
(69, 18, 'Hiệp Hưng, Cần Thơ', 'Đang vận chuyển', '0x288af1b13ab35549a4c4a1d65a19bb6a1e3eb8adf3a1a56901eefe326e95bc98', 2, '2026-11-10 10:44:41', 9.78068995, 105.73614801),
(70, 18, 'Cái Khế, Cần Thơ', 'Đang vận chuyển', '0x24cc5b939029f76ec235d153f4d2f4a65d44ff491f26f69db17c0fe303df43d8', 2, '2026-11-11 01:51:27', 10.04734688, 105.76739761),
(71, 19, 'Cơ sở sản xuất', 'Khởi tạo', '0x2915ceb23cb5fe81e4f686495b5ca28c02f7afc9d99fab80287123938cf477ec', 1, '2026-11-11 02:13:01', 10.04733873, 105.76746951),
(72, 20, 'Cơ sở sản xuất', 'Khởi tạo', '0x8de5dea2f80fa00fdf91be04ccc485071d8bc477d4d61d465aa6c88f9aa54362', 1, '2026-11-13 03:08:50', NULL, NULL),
(73, 20, 'Hiệp Hưng, 2Cần Thơ', 'Đang vận chuyển', '0x4f731bb1ca93c7a2534e832ad975712db0ad7810f9f7fbe1dbb66b5e7c0d1033', 2, '2026-11-13 03:09:49', 9.78055789, 105.73623948),
(74, 21, 'Cơ sở sản hà nộixuất', 'Khởi tạo', '0xcb7051b0831e54cfe25afbee73e09c29975891e68429de24e7a908c3b55eca91', 1, '2026-11-13 04:21:09', NULL, NULL),
(75, 20, 'Hiệp Hưng, Cần Thơ', 'Đang vận chuyển', '0x15ff7dc474bebba772dcf27df8297e4038a7f89b9f76d863d64cd8cef3c7b4ea', 2, '2026-11-13 04:22:18', 9.78064265, 105.73627678),
(76, 22, 'Cơ sở sản 1xuất', 'Khởi tạo', '0x4e8194e875493366e71fe1cd58f30665c70238e91efbae36cdae159ce7f20afb', 1, '2026-11-13 13:22:43', 9.76588809, 105.69796308),
(77, 22, 'Chợ Cần Thơ', 'Đang vận chuyển', '21121', 2, '2026-11-13 13:30:34', NULL, NULL),
(78, 22, 'Cần Thơ', 'Đã nhập kho', '0x351e5e9dfbe6ea210a947dff46ca6bcbfc16a88b20fd8016053912144ee4b01f', 2, '2026-11-13 13:35:12', 9.76588809, 105.69796308),
(79, 23, 'Cơ sở sản nnnxuất', 'Khởi jktạo', '0xa8dffbfdc217fb72a46e0d04db5a603a94aa7b5d8e8e9835ede932d1812120eb', 1, '2026-11-13 13:55:09', NULL, NULL),
(80, 24, 'Cơ sở sản xuất', 'Khởi tạo', '0x7745bb48e94417eb3bbb379193cb6a7de29bdf7e62970856507308a3400aa5c1', 1, '2026-11-16 13:20:54', 9.76588400, 105.69795200),
(81, 24, 'Hiệp Hưng, Cần Thơ', 'Đang vận chuyển', '0xbe81c834a377bded274f3a4b27e124372a05a92fb188d08586c4c156f5e10419', 2, '2026-11-16 13:22:20', 9.76588400, 105.69795200);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `wallet_address` varchar(100) NOT NULL,
  `nonce` varchar(100) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role` enum('pending','farmer','transporter','admin') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `wallet_address`, `nonce`, `full_name`, `role`) VALUES
(4, '0x85B5cad95779e01D218e42f4B05BFc985398a2f6', '0749cb441d89c47052480a764198ae68', NULL, 'farmer'),
(5, '0x39A4A05BF95637A6843aF0cEA30d9011B9ca8682', '6f1952adc8d4076934040bfa48bb00f9', NULL, 'admin'),
(6, '0xAF44397A1c6FF0a6b8e9d601B79FCC4f3fe26177', '755ef570991387a5cb174016897aae05', NULL, 'transporter'),
(7, '0xb208093091cdbb5869dc66ad17D40B856059c292', 'ad162522140a4c9be08942502e59a314', NULL, 'farmer');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `tracking_history`
--
ALTER TABLE `tracking_history`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `wallet_address` (`wallet_address`),
  ADD UNIQUE KEY `wallet_address_2` (`wallet_address`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT cho bảng `tracking_history`
--
ALTER TABLE `tracking_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
