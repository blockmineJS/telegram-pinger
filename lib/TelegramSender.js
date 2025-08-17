const https = require('https');

function createTelegramSender(token, chatId, logFunction) {
  async function sendMessage(text) {
    if (!token || !chatId) {
      log('[TelegramPinger] Токен или ID чата не указаны.', 'warn');
      return;
    }

    const postData = JSON.stringify({
      chat_id: chatId,
      text: text,
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          log(`[TelegramPinger] Ошибка API Telegram: Статус ${res.statusCode}`, 'error');
          res.on('data', (chunk) => log(`[TelegramPinger] Ответ: ${chunk}`, 'error'));
        }
        resolve();
      });

      req.on('error', (e) => {
        log(`[TelegramPinger] Ошибка отправки запроса в Telegram: ${e.message}`, 'error');
        resolve();
      });

      req.write(postData);
      req.end();
    });
  }

  return { sendMessage };
}

module.exports = { createTelegramSender };