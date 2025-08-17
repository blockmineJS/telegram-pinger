const { PARSER_PLUGIN_NAME } = require('../constants');

function registerPingListener(bot, settings, telegramSender, portalInfo) {
  const botUsernameLower = bot.config.username.toLowerCase();
  const ignoredUsersLower = (settings.ignoredUsers || []).map(u => u.toLowerCase());
  const hasParser = bot.api.installedPlugins.includes(PARSER_PLUGIN_NAME);

  const senderCache = new Map();
  const CACHE_TTL = 500;

  const parsedListener = (data) => {
    const rawMessage = data.jsonMsg ? data.jsonMsg.toString() : data.raw;
    if (rawMessage && data.username) {
      senderCache.set(rawMessage, data.username);
      setTimeout(() => senderCache.delete(rawMessage), CACHE_TTL);
    }
  };

  const rawListener = (rawMessageText, jsonMsg) => {
    const rawMessage = jsonMsg ? jsonMsg.toString() : rawMessageText;
    if (!rawMessage) return;

    const sender = senderCache.get(rawMessage) || 'Неизвестно';
    
    if (senderCache.has(rawMessage)) {
        senderCache.delete(rawMessage);
    }

    if (sender.toLowerCase() === botUsernameLower) {
      return;
    }

    const regex = new RegExp(`\\b${botUsernameLower}\\b`, 'i');
    if (!regex.test(rawMessage.toLowerCase())) {
      return;
    }

    if (ignoredUsersLower.includes(sender.toLowerCase())) {
      return;
    }

    let formatTemplate;
    const hasAuth = portalInfo.portal !== null;
    const senderIsKnown = sender !== 'Неизвестно';
    
    if (senderIsKnown && hasAuth) {
      formatTemplate = settings.messageFormatFull;
    } else if (senderIsKnown) {
      formatTemplate = settings.messageFormatWithParser;
    } else if (hasAuth) {
      formatTemplate = settings.messageFormatWithAuth;
    } else {
      formatTemplate = settings.messageFormatDefault;
    }

    if (!formatTemplate) {
        bot.sendLog('[TelegramPinger] Шаблон сообщения не найден в настройках.', 'warn');
        return;
    }

    const messageText = formatTemplate
      .replace('{serverHost}', bot.config.server.host)
      .replace('{portalCommand}', portalInfo.portal)
      .replace('{sender}', sender)
      .replace('{rawMessage}', rawMessage);

    telegramSender.sendMessage(messageText);
  };

  bot.events.on('core:raw_message', rawListener);
  if (hasParser) {
    bot.events.on('chat:message', parsedListener);
  }

  return () => {
    bot.events.removeListener('core:raw_message', rawListener);
    if (hasParser) {
      bot.events.removeListener('chat:message', parsedListener);
    }
  };
}

module.exports = { registerPingListener };
