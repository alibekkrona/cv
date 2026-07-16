-- Backfill one initial history event for applications that existed before workflow history.
INSERT INTO `AdoptionApplicationStatusEvent` (`applicationId`, `fromStatus`, `toStatus`, `note`, `createdAt`)
SELECT a.`id`, NULL, a.`status`, 'Начальное состояние заявки', a.`createdAt`
FROM `AdoptionApplication` a
WHERE NOT EXISTS (
    SELECT 1
    FROM `AdoptionApplicationStatusEvent` e
    WHERE e.`applicationId` = a.`id`
);
