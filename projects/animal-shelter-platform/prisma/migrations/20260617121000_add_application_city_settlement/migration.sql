ALTER TABLE `AdoptionApplication`
  ADD COLUMN `cityId` INTEGER NULL;

CREATE INDEX `AdoptionApplication_cityId_idx` ON `AdoptionApplication`(`cityId`);

UPDATE `AdoptionApplication`
SET `cityId` = (SELECT `id` FROM `Settlement` WHERE `slug` = 'kharkiv' LIMIT 1)
WHERE `city` = 'Харьков' OR `city` IS NULL OR `city` = '';

ALTER TABLE `AdoptionApplication`
  ADD CONSTRAINT `AdoptionApplication_cityId_fkey`
  FOREIGN KEY (`cityId`) REFERENCES `Settlement`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
