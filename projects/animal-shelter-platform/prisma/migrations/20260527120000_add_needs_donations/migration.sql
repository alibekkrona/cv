CREATE TABLE `Need` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(191) NOT NULL,
  `scope` ENUM('SHELTER', 'ANIMAL') NOT NULL DEFAULT 'SHELTER',
  `animalId` INTEGER NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `targetCents` INTEGER NOT NULL,
  `raisedCents` INTEGER NOT NULL DEFAULT 0,
  `status` ENUM('DRAFT', 'ACTIVE', 'FUNDED', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `priority` INTEGER NOT NULL DEFAULT 0,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Need_slug_key`(`slug`),
  INDEX `Need_scope_idx`(`scope`),
  INDEX `Need_animalId_idx`(`animalId`),
  INDEX `Need_status_idx`(`status`),
  INDEX `Need_publishedAt_idx`(`publishedAt`),
  INDEX `Need_priority_idx`(`priority`),
  INDEX `Need_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NeedPhoto` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `needId` INTEGER NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `alt` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `isCover` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `NeedPhoto_needId_idx`(`needId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Donation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `target` ENUM('SHELTER', 'ANIMAL', 'NEED') NOT NULL DEFAULT 'SHELTER',
  `needId` INTEGER NULL,
  `animalId` INTEGER NULL,
  `amountCents` INTEGER NOT NULL,
  `donorName` VARCHAR(191) NULL,
  `donorEmail` VARCHAR(191) NULL,
  `donorPhone` VARCHAR(191) NULL,
  `message` TEXT NULL,
  `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
  `method` ENUM('CARD', 'INVOICE') NOT NULL DEFAULT 'CARD',
  `status` ENUM('PLEDGED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PLEDGED',
  `publicConsent` BOOLEAN NOT NULL DEFAULT true,
  `adminNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Donation_target_idx`(`target`),
  INDEX `Donation_needId_idx`(`needId`),
  INDEX `Donation_animalId_idx`(`animalId`),
  INDEX `Donation_status_idx`(`status`),
  INDEX `Donation_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Need` ADD CONSTRAINT `Need_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `NeedPhoto` ADD CONSTRAINT `NeedPhoto_needId_fkey` FOREIGN KEY (`needId`) REFERENCES `Need`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Donation` ADD CONSTRAINT `Donation_needId_fkey` FOREIGN KEY (`needId`) REFERENCES `Need`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Donation` ADD CONSTRAINT `Donation_animalId_fkey` FOREIGN KEY (`animalId`) REFERENCES `Animal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
