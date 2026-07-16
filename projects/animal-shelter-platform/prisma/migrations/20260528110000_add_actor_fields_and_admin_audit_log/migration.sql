ALTER TABLE `Animal`
  ADD COLUMN `createdByUserId` INTEGER NULL,
  ADD COLUMN `updatedByUserId` INTEGER NULL;

ALTER TABLE `AdoptionApplicationStatusEvent`
  ADD COLUMN `actorUserId` INTEGER NULL;

ALTER TABLE `Need`
  ADD COLUMN `createdByUserId` INTEGER NULL,
  ADD COLUMN `updatedByUserId` INTEGER NULL;

ALTER TABLE `NeedAudit`
  ADD COLUMN `createdByUserId` INTEGER NULL;

ALTER TABLE `LostFoundReport`
  ADD COLUMN `createdByUserId` INTEGER NULL,
  ADD COLUMN `updatedByUserId` INTEGER NULL;

CREATE TABLE `AdminAuditLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `actorUserId` INTEGER NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` INTEGER NULL,
  `beforeJson` JSON NULL,
  `afterJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AdminAuditLog_actorUserId_idx`(`actorUserId`),
  INDEX `AdminAuditLog_action_idx`(`action`),
  INDEX `AdminAuditLog_entityType_idx`(`entityType`),
  INDEX `AdminAuditLog_entityId_idx`(`entityId`),
  INDEX `AdminAuditLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Animal_createdByUserId_idx` ON `Animal`(`createdByUserId`);
CREATE INDEX `Animal_updatedByUserId_idx` ON `Animal`(`updatedByUserId`);
CREATE INDEX `AdoptionApplicationStatusEvent_actorUserId_idx` ON `AdoptionApplicationStatusEvent`(`actorUserId`);
CREATE INDEX `Need_createdByUserId_idx` ON `Need`(`createdByUserId`);
CREATE INDEX `Need_updatedByUserId_idx` ON `Need`(`updatedByUserId`);
CREATE INDEX `NeedAudit_createdByUserId_idx` ON `NeedAudit`(`createdByUserId`);
CREATE INDEX `LostFoundReport_createdByUserId_idx` ON `LostFoundReport`(`createdByUserId`);
CREATE INDEX `LostFoundReport_updatedByUserId_idx` ON `LostFoundReport`(`updatedByUserId`);

ALTER TABLE `Animal`
  ADD CONSTRAINT `Animal_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Animal_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdoptionApplicationStatusEvent`
  ADD CONSTRAINT `AdoptionApplicationStatusEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Need`
  ADD CONSTRAINT `Need_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Need_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `NeedAudit`
  ADD CONSTRAINT `NeedAudit_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `LostFoundReport`
  ADD CONSTRAINT `LostFoundReport_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `LostFoundReport_updatedByUserId_fkey` FOREIGN KEY (`updatedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdminAuditLog`
  ADD CONSTRAINT `AdminAuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
