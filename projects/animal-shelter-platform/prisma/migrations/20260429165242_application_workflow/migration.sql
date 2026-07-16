-- AlterTable
ALTER TABLE `AdoptionApplication` MODIFY `status` ENUM('NEW', 'IN_REVIEW', 'CONTACTED', 'CALL_SCHEDULED', 'VISIT_SCHEDULED', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE `AdoptionApplicationStatusEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `fromStatus` ENUM('NEW', 'IN_REVIEW', 'CONTACTED', 'CALL_SCHEDULED', 'VISIT_SCHEDULED', 'APPROVED', 'REJECTED', 'CLOSED') NULL,
    `toStatus` ENUM('NEW', 'IN_REVIEW', 'CONTACTED', 'CALL_SCHEDULED', 'VISIT_SCHEDULED', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdoptionApplicationStatusEvent_applicationId_idx`(`applicationId`),
    INDEX `AdoptionApplicationStatusEvent_toStatus_idx`(`toStatus`),
    INDEX `AdoptionApplicationStatusEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdoptionApplicationComment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `authorName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdoptionApplicationComment_applicationId_idx`(`applicationId`),
    INDEX `AdoptionApplicationComment_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdoptionApplicationStatusEvent` ADD CONSTRAINT `AdoptionApplicationStatusEvent_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `AdoptionApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdoptionApplicationComment` ADD CONSTRAINT `AdoptionApplicationComment_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `AdoptionApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
