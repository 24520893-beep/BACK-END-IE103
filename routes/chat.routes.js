const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Endpoint: POST /api/chat
router.post('/', chatController.chatWithAI);

module.exports = router;