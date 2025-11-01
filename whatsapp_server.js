// === Импорт библиотек ===
import fetch from "node-fetch";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import chalk from "chalk";

const { Client, LocalAuth } = pkg;

// === Конфигурация ===
const API_URL = "https://alerts.com.ua/api/states"; // открытый API
const CHAT_ID = "120567895675554505@g.us"; // <-- ID группы WhatsApp

// === Настройка WhatsApp клиента ===
console.clear();
console.log(chalk.cyan("🚀 Запуск WhatsApp клиента..."));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", (qr) => {
  console.log(chalk.yellow("📱 Отсканируй QR-код WhatsApp:"));
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log(chalk.green("✅ WhatsApp клиент готов!"));
  startMonitoring();
});

// === Получение тревог ===
async function getAlerts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      console.log(chalk.red(`⚠️ Ошибка ${response.status}: ${await response.text()}`));
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error(chalk.red("❌ Ошибка при запросе:"), e.message);
    return null;
  }
}

let wasAlert = false;

// === Мониторинг тревог ===
async function startMonitoring() {
  console.log(chalk.blue("🔁 Мониторинг тревог (обновление каждые 30 сек)..."));

  while (true) {
    const data = await getAlerts();

    if (data && Array.isArray(data.states)) {
      const region = data.states.find(r =>
        r.name === "Запорізька область" || r.name_en === "Zaporizhia oblast"
      );

      if (region) {
        if (region.alert && !wasAlert) {
          const msg = `🟥 ${new Date().toLocaleTimeString()} Повітряна тривога в Запорізькій області.`;
          await client.sendMessage(CHAT_ID, msg);
          console.log(chalk.green(`📩 Відправлено у ${CHAT_ID}: ${msg}`));
          wasAlert = true;
        }

        if (!region.alert && wasAlert) {
          const msg = `🟢 ${new Date().toLocaleTimeString()} Відбій повітряної тривоги в Запорізькій області.`;
          await client.sendMessage(CHAT_ID, msg);
          console.log(chalk.yellow(`📩 Відправлено у ${CHAT_ID}: ${msg}`));
          wasAlert = false;
        }
      } else {
        console.log(chalk.gray("ℹ️ Область не найдена в ответе API."));
      }
    }

    await new Promise(r => setTimeout(r, 30000)); // пауза 30 секунд
  }
}

client.initialize();

