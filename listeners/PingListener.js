const { PARSER_PLUGIN_NAME } = require('../constants');

function registerPingListener(bot, settings, telegramSender, portalInfo) {
  const botUsernameLower = bot.config.username.toLowerCase();
  const ignoredUsersLower = (settings.ignoredUsers || []).map(u => u.toLowerCase());

  const hasParser = bot.api.installedPlugins.includes(PARSER_PLUGIN_NAME);

  const processMessage = (jsonMsg, sender = 'Неизвестно') => {
    if (!jsonMsg) return;

    const rawMessage = jsonMsg.toString();
    
    const regex = new RegExp(`\\b${botUsernameLower}\\b`, 'i');
    if (!regex.test(rawMessage.toLowerCase())) {
      return;
    }
    
    if (ignoredUsersLower.includes(sender.toLowerCase())) {
      return;
    }

    let formatTemplate;
    const hasAuth = portalInfo.portal !== null;
    
    if (hasParser && hasAuth) {
      formatTemplate = settings.messageFormatFull;
    } else if (hasParser) {
      formatTemplate = settings.messageFormatWithParser;
    } else if (hasAuth) {
      formatTemplate = settings.messageFormatWithAuth;
    } else {
      formatTemplate = settings.messageFormatDefault;
    }

    if (!formatTemplate) {
        bot.sendLog('[TelegramPinger] Шаблон сообщения не найден в настройках. Проверьте package.json.', 'warn');
        return;
    }

    const messageText = formatTemplate
      .replace('{serverHost}', bot.config.server.host)
      .replace('{portal}', portalInfo.portal)
      .replace('{portalCommand}', portalInfo.portal)
      .replace('{sender}', sender)
      .replace('{rawMessage}', rawMessage);

    telegramSender.sendMessage(messageText);
  };
  
  const rawListener = (rawMessageText, jsonMsg) => {
    processMessage(jsonMsg);
  };

  const parsedListener = (data) => {
    processMessage(data.jsonMsg, data.username);
  };

  if (hasParser) {
    bot.events.on('chat:message', parsedListener);
  } else {
    bot.events.on('core:raw_message', rawListener);
  }

  return () => {
    if (hasParser) {
      bot.events.removeListener('chat:message', parsedListener);
    } else {
      bot.events.removeListener('core:raw_message', rawListener);
    }
  };
}

module.exports = { registerPingListener };