CREATE TABLE `Region` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `countryCode` VARCHAR(191) NOT NULL DEFAULT 'UA',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Region_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Settlement` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `regionId` INTEGER NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'CITY',
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Settlement_slug_key`(`slug`),
  INDEX `Settlement_regionId_idx`(`regionId`),
  INDEX `Settlement_isActive_idx`(`isActive`),
  INDEX `Settlement_sortOrder_idx`(`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LostFoundReport`
  ADD COLUMN `cityId` INTEGER NULL;

CREATE INDEX `LostFoundReport_cityId_idx` ON `LostFoundReport`(`cityId`);

INSERT INTO `Region` (`slug`, `name`, `countryCode`, `updatedAt`)
VALUES ('kharkiv-oblast', 'Харьковская область', 'UA', CURRENT_TIMESTAMP(3));

INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'kharkiv', 'Харьков', 'CITY', 10, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'derhachi', 'Дергачи', 'CITY', 20, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'pisochyn', 'Песочин', 'SETTLEMENT', 30, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'merefa', 'Мерефа', 'CITY', 40, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'zmiiv', 'Змиев', 'CITY', 50, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'liubotyn', 'Люботин', 'CITY', 60, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'chuhuiv', 'Чугуев', 'CITY', 70, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'balakliia', 'Балаклея', 'CITY', 80, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'valky', 'Валки', 'CITY', 90, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'bohodukhiv', 'Богодухов', 'CITY', 100, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'izium', 'Изюм', 'CITY', 110, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'kupiansk', 'Купянск', 'CITY', 120, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'lozova', 'Лозовая', 'CITY', 130, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'krasnohrad', 'Красноград', 'CITY', 140, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'pervomaiskyi', 'Первомайский', 'CITY', 150, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'zolochev', 'Золочев', 'SETTLEMENT', 160, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'nova-vodolaha', 'Новая Водолага', 'SETTLEMENT', 170, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'vysokyi', 'Высокий', 'SETTLEMENT', 180, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'babai', 'Бабаи', 'SETTLEMENT', 190, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'solonytsivka', 'Солоницевка', 'SETTLEMENT', 200, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'mala-danylivka', 'Малая Даниловка', 'SETTLEMENT', 210, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'ruska-lozova', 'Русская Лозовая', 'VILLAGE', 220, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'bezliudivka', 'Безлюдовка', 'SETTLEMENT', 230, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'rohan', 'Рогань', 'SETTLEMENT', 240, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'korotych', 'Коротыч', 'SETTLEMENT', 250, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';
INSERT INTO `Settlement` (`regionId`, `slug`, `name`, `type`, `sortOrder`, `updatedAt`)
SELECT `id`, 'pokotylivka', 'Покотиловка', 'SETTLEMENT', 260, CURRENT_TIMESTAMP(3) FROM `Region` WHERE `slug` = 'kharkiv-oblast';

UPDATE `LostFoundReport`
SET `cityId` = (SELECT `id` FROM `Settlement` WHERE `slug` = 'kharkiv' LIMIT 1)
WHERE `city` = 'Харьков' OR `city` IS NULL OR `city` = '';

ALTER TABLE `Settlement`
  ADD CONSTRAINT `Settlement_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LostFoundReport`
  ADD CONSTRAINT `LostFoundReport_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `Settlement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
