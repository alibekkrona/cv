CREATE TABLE `DesignSettings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `activeTheme` VARCHAR(191) NOT NULL DEFAULT 'youtube',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `DesignSettings` (`activeTheme`, `updatedAt`)
VALUES ('youtube', CURRENT_TIMESTAMP(3));
