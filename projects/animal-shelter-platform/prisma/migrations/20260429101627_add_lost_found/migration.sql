-- CreateTable
CREATE TABLE `LostFoundReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `type` ENUM('LOST', 'FOUND') NOT NULL,
    `status` ENUM('SUBMITTED', 'PUBLISHED', 'MATCHED', 'CLOSED', 'ARCHIVED') NOT NULL DEFAULT 'SUBMITTED',
    `species` ENUM('DOG', 'CAT', 'OTHER') NOT NULL,
    `sex` ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `size` ENUM('SMALL', 'MEDIUM', 'LARGE', 'UNKNOWN') NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `locationText` VARCHAR(191) NULL,
    `eventDate` DATETIME(3) NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NULL,
    `adminNote` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LostFoundReport_slug_key`(`slug`),
    INDEX `LostFoundReport_type_idx`(`type`),
    INDEX `LostFoundReport_status_idx`(`status`),
    INDEX `LostFoundReport_species_idx`(`species`),
    INDEX `LostFoundReport_publishedAt_idx`(`publishedAt`),
    INDEX `LostFoundReport_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LostFoundPhoto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportId` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `alt` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LostFoundPhoto_reportId_idx`(`reportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LostFoundPhoto` ADD CONSTRAINT `LostFoundPhoto_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `LostFoundReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
