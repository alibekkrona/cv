const express = require('express');

const MiniAppAdminApiController = require('../../Controller/Http/MiniAppAdminApiController');

const router = express.Router();

router.get('/api/mini-app/admin/users', MiniAppAdminApiController.users);
router.post('/api/mini-app/admin/users/:telegramId/approve', MiniAppAdminApiController.approve);
router.post('/api/mini-app/admin/users/:telegramId/reject', MiniAppAdminApiController.reject);
router.delete('/api/mini-app/admin/users/:telegramId', MiniAppAdminApiController.remove);

router.get('/api/mini-app/admin/signals', MiniAppAdminApiController.signals);
router.post('/api/mini-app/admin/signals', MiniAppAdminApiController.createSignal);
router.patch('/api/mini-app/admin/signals/:signalId', MiniAppAdminApiController.updateSignal);
router.post('/api/mini-app/admin/signals/:signalId/publish', MiniAppAdminApiController.publishSignal);
router.post('/api/mini-app/admin/signals/:signalId/close', MiniAppAdminApiController.closeSignal);
router.post('/api/mini-app/admin/signals/:signalId/cancel', MiniAppAdminApiController.cancelSignal);

module.exports = router;
