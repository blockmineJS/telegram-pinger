const { createTelegramSender } = require('./lib/TelegramSender.js');
const { registerPingListener } = require('./listeners/PingListener.js');
const { AUTH_PLUGIN_NAME } = require('./constants');

async function onLoad(bot, { settings, store }) {
  const log = bot.sendLog;

  const token = settings.telegramBotToken;
  const chatId = settings.telegramChatId;

  if (!token || !chatId) {
    log('[TelegramPinger] Токен бота или ID чата не указаны в настройках. Плагин не будет работать.', 'error');
    return;
  }
  
  const telegramSender = createTelegramSender(token, chatId, log);
  
  const portalInfo = { portal: await store.get('last_portal_command') || null };
  if (portalInfo.portal) {
    log(`[TelegramPinger] Загружена сохраненная команда входа на портал: ${portalInfo.portal}`);
  }

  let cleanupPingListener = null;
  let isListenerActive = false;

  const hasAuthPlugin = bot.api.installedPlugins.includes(AUTH_PLUGIN_NAME);

  const activateListener = () => {
    if (isListenerActive) return;
    cleanupPingListener = registerPingListener(bot, settings, telegramSender, portalInfo);
    isListenerActive = true;
    log('[TelegramPinger] Слушатель сообщений активирован.');
  };

  const portalListener = async (payload) => {
    if (payload && payload.command && typeof payload.command === 'string') {
      const portalCommand = payload.command.trim();
      portalInfo.portal = portalCommand;
      await store.set('last_portal_command', portalCommand);
      log(`[TelegramPinger] Получена и сохранена команда входа на портал: ${portalCommand}`);
      activateListener();
    } else {
        log(`[TelegramPinger] Событие auth:portal_joined получено, но не удалось извлечь команду. Payload: ${JSON.stringify(payload)}`, 'warn');
    }
  };

  if (hasAuthPlugin) {
    bot.events.on('auth:portal_joined', portalListener);
    log('[TelegramPinger] Плагин авторизации найден. Ожидание входа на портал для активации...');
  } else {
    activateListener();
  }

  bot.once('end', () => {
    if (cleanupPingListener) {
      cleanupPingListener();
    }
    if (hasAuthPlugin) {
      bot.events.removeListener('auth:portal_joined', portalListener);
    }
    log('[TelegramPinger] Плагин выгружен, все слушатели событий удалены.');
  });

  log('[TelegramPinger] Плагин успешно загружен.');
}

module.exports = { onLoad };
