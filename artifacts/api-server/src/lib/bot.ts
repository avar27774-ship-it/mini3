import { db } from "@workspace/db";
import { authCodes } from "@workspace/db/schema";
import { eq, and, gt, isNull, desc } from "drizzle-orm";
import { logger } from "./logger";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function setupWebhook() {
  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, skipping webhook setup");
    return;
  }
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    logger.warn("APP_URL not set, skipping webhook setup");
    return;
  }
  try {
    const webhookUrl = `${appUrl}/api/bot/webhook`;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
    });
    const data = await res.json();
    if (data.ok) {
      logger.info({ webhookUrl }, "Telegram webhook set successfully");
    } else {
      logger.error({ data }, "Failed to set Telegram webhook");
    }
  } catch (err) {
    logger.error(err, "Error setting Telegram webhook");
  }
}

async function sendMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function handleBotUpdate(update: any) {
  try {
    const message = update?.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const from = message.from;
    const text = message.text.trim();
    const telegramUsername = (from?.username || "").toLowerCase().replace(/^@/, "");

    if (text.startsWith("/start") || text.startsWith("/code")) {
      // FIX: извлекаем username из параметра /start USERNAME
      // Ссылка с сайта: t.me/bot?start=USERNAME
      const param = text.split(" ")[1]?.toLowerCase().replace(/^@/, "") || "";

      // Целевой username: из параметра (если есть), иначе свой
      const targetUsername = param || telegramUsername;

      if (!targetUsername) {
        await sendMessage(chatId, "❌ Не удалось определить пользователя.\n\nВернитесь на сайт и нажмите кнопку <b>«Получить код»</b> — она откроет бота автоматически.");
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      // Ищем свежий неиспользованный код
      const [authCode] = await db
        .select()
        .from(authCodes)
        .where(
          and(
            eq(authCodes.telegramUsername, targetUsername),
            gt(authCodes.expiresAt, now),
            isNull(authCodes.usedAt)
          )
        )
        .orderBy(desc(authCodes.createdAt))
        .limit(1);

      if (!authCode) {
        const appUrl = process.env.APP_URL || "сайт";
        await sendMessage(
          chatId,
          `❌ Код не найден или истёк.\n\n` +
          `Вернитесь на <a href="${appUrl}">${appUrl}</a>, введите @${targetUsername} и нажмите «Получить код», затем снова откройте бота.`
        );
        return;
      }

      // Сохраняем telegramId чтобы привязать аккаунт
      await db
        .update(authCodes)
        .set({ telegramId: String(from.id) })
        .where(eq(authCodes.id, authCode.id));

      const minutesLeft = Math.ceil((authCode.expiresAt - now) / 60);

      await sendMessage(
        chatId,
        `✅ Ваш код для регистрации на Minions Market:\n\n` +
        `<b>${authCode.code}</b>\n\n` +
        `Введите его на сайте в поле «Код». Действует ещё ${minutesLeft} мин.\n\n` +
        `⚠️ Никому не сообщайте этот код.`
      );
      return;
    }

    // Любое другое сообщение
    const appUrl = process.env.APP_URL || "сайт";
    await sendMessage(
      chatId,
      `👋 Привет! Я бот для регистрации на Minions Market.\n\n` +
      `Чтобы получить код:\n` +
      `1. Перейдите на <a href="${appUrl}">${appUrl}</a>\n` +
      `2. Введите ваш Telegram @username\n` +
      `3. Нажмите кнопку <b>«Получить код»</b> — она откроет меня автоматически`
    );
  } catch (err) {
    logger.error(err, "Bot update error");
  }
}

  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, skipping webhook setup");
    return;
  }
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    logger.warn("APP_URL not set, skipping webhook setup");
    return;
  }
  try {
    const webhookUrl = `${appUrl}/api/bot/webhook`;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
    });
    const data = await res.json();
    if (data.ok) {
      logger.info({ webhookUrl }, "Telegram webhook set successfully");
    } else {
      logger.error({ data }, "Failed to set Telegram webhook");
    }
  } catch (err) {
    logger.error(err, "Error setting Telegram webhook");
  }
}

async function sendMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function handleBotUpdate(update: any) {
  try {
    const message = update?.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const from = message.from;
    const text = message.text.trim();
    const username = (from?.username || "").toLowerCase().replace(/^@/, "");

    // /start или /code — выдать код по username
    if (text === "/start" || text.startsWith("/code")) {
      if (!username) {
        await sendMessage(chatId, "❌ У вас нет username в Telegram. Установите его в настройках и попробуйте снова.");
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      // Ищем свежий неиспользованный код для этого username
      const [authCode] = await db
        .select()
        .from(authCodes)
        .where(
          and(
            eq(authCodes.telegramUsername, username),
            gt(authCodes.expiresAt, now),
            isNull(authCodes.usedAt)
          )
        )
        .orderBy(desc(authCodes.createdAt))
        .limit(1);

      if (!authCode) {
        await sendMessage(
          chatId,
          "❌ Код не найден или истёк.\n\nСначала введите ваш @username на сайте, затем нажмите «Получить код»."
        );
        return;
      }

      // Сохраняем telegramId в коде, чтобы привязать аккаунт
      await db
        .update(authCodes)
        .set({ telegramId: String(from.id) })
        .where(eq(authCodes.id, authCode.id));

      const minutesLeft = Math.ceil((authCode.expiresAt - now) / 60);

      await sendMessage(
        chatId,
        `✅ Ваш код подтверждения:\n\n<b>${authCode.code}</b>\n\nВведите его на сайте. Код действует ещё ${minutesLeft} мин.`
      );
      return;
    }

    // Любое другое сообщение — подсказка
    await sendMessage(
      chatId,
      "👋 Привет! Я бот для авторизации на Minions Market.\n\n1. Перейдите на сайт и введите ваш @username\n2. Нажмите «Получить код»\n3. Вернитесь сюда и напишите /start"
    );
  } catch (err) {
    logger.error(err, "Bot update error");
  }
}
