const express = require('express');

const MiniAppApiController = require('../../Controller/Http/MiniAppApiController');

const router = express.Router();

router.get('/api/mini-app/me', MiniAppApiController.me);
router.get('/api/mini-app/dashboard', MiniAppApiController.dashboard);
router.get('/api/mini-app/profile', MiniAppApiController.profile);
router.get('/api/mini-app/market', MiniAppApiController.market);
router.get('/api/mini-app/signals', MiniAppApiController.signals);
router.get('/api/mini-app/signals/:signalId', MiniAppApiController.signalDetails);

module.exports = router;
