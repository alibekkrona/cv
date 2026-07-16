ALTER TABLE `Need`
  MODIFY `status` ENUM('DRAFT', 'ACTIVE', 'FUNDED', 'FULFILLED', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE `NeedAudit` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `needId` INTEGER NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `NeedAudit_needId_idx`(`needId`),
  INDEX `NeedAudit_publishedAt_idx`(`publishedAt`),
  INDEX `NeedAudit_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NeedAuditPhoto` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `auditId` INTEGER NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `alt` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `isCover` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `NeedAuditPhoto_auditId_idx`(`auditId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `NeedAudit`
  ADD CONSTRAINT `NeedAudit_needId_fkey`
  FOREIGN KEY (`needId`) REFERENCES `Need`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `NeedAuditPhoto`
  ADD CONSTRAINT `NeedAuditPhoto_auditId_fkey`
  FOREIGN KEY (`auditId`) REFERENCES `NeedAudit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
