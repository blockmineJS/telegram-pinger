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

  const hasAuthPlugin = bot.api.installedPlugins.includes(AUTH_PLUGIN_NAME);

  const portalListener = async (payload) => {
    if (payload && payload.command && typeof payload.command === 'string') {
      const portalCommand = payload.command.trim();
      portalInfo.portal = portalCommand;
      await store.set('last_portal_command', portalCommand);
      log(`[TelegramPinger] Получена и сохранена команда входа на портал: ${portalCommand}`);
    }
  };

  if (hasAuthPlugin) {
    bot.events.on('auth:portal_joined', portalListener);
  }
  
  cleanupPingListener = registerPingListener(bot, settings, telegramSender, portalInfo);

  bot.once('end', () => {
    if (cleanupPingListener) {
      cleanupPingListener();
    }
    if (hasAuthPlugin) {
      bot.events.removeListener('auth:portal_joined', portalListener);
    }
    log('[TelegramPinger] Плагин выгружен, все слушатели событий удалены.');
  });

  log('[TelegramPinger] Плагин успешно загружен и готов к работе.');
}

module.exports = { onLoad };