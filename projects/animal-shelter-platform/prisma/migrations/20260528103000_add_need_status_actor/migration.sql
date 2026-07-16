ALTER TABLE `Need`
  ADD COLUMN `statusChangedByUserId` INTEGER NULL,
  ADD COLUMN `statusChangedAt` DATETIME(3) NULL;

CREATE INDEX `Need_statusChangedByUserId_idx` ON `Need`(`statusChangedByUserId`);
CREATE INDEX `Need_statusChangedAt_idx` ON `Need`(`statusChangedAt`);

ALTER TABLE `Need`
  ADD CONSTRAINT `Need_statusChangedByUserId_fkey`
  FOREIGN KEY (`statusChangedByUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
