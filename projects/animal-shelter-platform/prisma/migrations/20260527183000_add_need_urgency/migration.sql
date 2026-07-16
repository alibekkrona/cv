ALTER TABLE `Need` ADD COLUMN `isUrgent` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `Need_isUrgent_idx` ON `Need`(`isUrgent`);
