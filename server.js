const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const panelState = {
    connected: false,
    connecting: false,
    profile: {
        host: '',
        port: 25565,
        username: 'Semoizm',
        version: ''
    },
    autoMsg: {
        active: false,
        message: '',
        interval: 10
    },
    logs: []
};

let mcBot = null;
let autoMsgInterval = null;
let antiAfkInterval = null;

function formatKickReason(reason) {
    if (!reason) return 'Sebep belirtilmedi.';
    if (typeof reason === 'string') return reason;

    if (typeof reason === 'object') {
        let parts = [];
        if (typeof reason.text === 'string') parts.push(reason.text);
        if (typeof reason.translate === 'string') parts.push(reason.translate);
        if (Array.isArray(reason.extra)) {
            const extraText = reason.extra
                .map((item) => (typeof item === 'string' ? item : formatKickReason(item)))
                .join('');
            if (extraText) parts.push(extraText);
        }
        if (Array.isArray(reason.with)) {
            const withText = reason.with
                .map((item) => (typeof item === 'string' ? item : formatKickReason(item)))
                .join(' ');
            if (withText) parts.push(withText);
        }
        const combined = parts.join(' ').trim();
        if (combined) return combined;
        try {
            return JSON.stringify(reason);
        } catch (_) {
            return 'Bilinmeyen atılma sebebi.';
        }
    }

    return String(reason);
}

function pushLog(entry) {
    panelState.logs.push(entry);
    if (panelState.logs.length > 100) {
        panelState.logs.shift();
    }
    io.emit('log_entry', entry);
}

function broadcastState() {
    io.emit('state_update', {
        connected: panelState.connected,
        connecting: panelState.connecting,
        profile: panelState.profile,
        autoMsg: {
            active: panelState.autoMsg.active,
            message: panelState.autoMsg.message,
            interval: panelState.autoMsg.interval
        }
    });
}

function clearAutoMsg(emitSys = false) {
    if (autoMsgInterval) {
        clearInterval(autoMsgInterval);
        autoMsgInterval = null;
    }
    const wasActive = panelState.autoMsg.active;
    panelState.autoMsg.active = false;
    if (emitSys && wasActive) {
        pushLog({ type: 'sys', text: 'Oto-mesaj durduruldu.' });
    }
    broadcastState();
}

function clearAntiAfk() {
    if (antiAfkInterval) {
        clearInterval(antiAfkInterval);
        antiAfkInterval = null;
    }
    if (mcBot) {
        try {
            mcBot.setControlState('jump', false);
        } catch (_) {}
    }
}

function startAntiAfk() {
    clearAntiAfk();

    antiAfkInterval = setInterval(() => {
        if (!mcBot || !panelState.connected) return;

        const yaw = (Math.random() - 0.5) * Math.PI;
        const pitch = (Math.random() - 0.5) * 0.35;

        try {
            const lookPromise = mcBot.look(yaw, pitch, false);
            if (lookPromise && typeof lookPromise.catch === 'function') {
                lookPromise.catch(() => {});
            }
        } catch (_) {}

        if (Math.random() > 0.55) {
            try {
                mcBot.setControlState('jump', true);
                setTimeout(() => {
                    if (mcBot && panelState.connected) {
                        try {
                            mcBot.setControlState('jump', false);
                        } catch (_) {}
                    }
                }, 220);
            } catch (_) {}
        }
    }, 25000);
}

io.on('connection', (socket) => {
    socket.emit('init_state', {
        connected: panelState.connected,
        connecting: panelState.connecting,
        profile: panelState.profile,
        autoMsg: {
            active: panelState.autoMsg.active,
            message: panelState.autoMsg.message,
            interval: panelState.autoMsg.interval
        },
        logs: panelState.logs
    });

    socket.on('connect_bot', (data = {}) => {
        if (mcBot || panelState.connecting) {
            pushLog({ type: 'sys', text: 'Bot zaten aktif veya bağlanıyor! Önce çıkış yapın.' });
            return;
        }

        const host = (data.host || '').trim();
        const port = parseInt(data.port, 10) || 25565;
        const username = (data.username || 'Semoizm').trim() || 'Semoizm';
        const versionStr = data.version ? String(data.version).trim() : '';
        const version = versionStr !== '' ? versionStr : false;

        if (!host) {
            pushLog({ type: 'sys', text: 'Hata: Sunucu IP adresi boş olamaz.' });
            return;
        }

        panelState.profile = { host, port, username, version: versionStr };
        panelState.connecting = true;
        panelState.connected = false;
        broadcastState();

        pushLog({ type: 'sys', text: `${host}:${port} sunucusuna (${username}) bağlanılıyor...` });

        try {
            mcBot = mineflayer.createBot({
                host,
                port,
                username,
                version
            });
        } catch (err) {
            mcBot = null;
            panelState.connecting = false;
            panelState.connected = false;
            clearAntiAfk();
            clearAutoMsg(false);
            broadcastState();
            pushLog({ type: 'sys', text: `Bot başlatılamadı: ${err.message}` });
            return;
        }

        mcBot.on('login', () => {
            panelState.connecting = false;
            panelState.connected = true;
            panelState.profile.username = mcBot.username || username;
            broadcastState();
            startAntiAfk();
            pushLog({ type: 'sys', text: `${panelState.profile.username} sunucuya başarıyla giriş yaptı! (Anti-AFK aktif)` });
        });

        mcBot.on('kicked', (reason) => {
            const cleanReason = formatKickReason(reason);
            pushLog({ type: 'sys', text: `Sunucudan atıldın! Sebep: ${cleanReason}` });
        });

        mcBot.on('messagestr', (message, position) => {
            if (position === 'game_info' || !message || !message.trim()) return;
            const activeName = panelState.profile.username;
            if (
                message.includes(`<${activeName}>`) ||
                message.includes(`${activeName} `) ||
                message.includes(`${activeName}:`)
            ) {
                return;
            }
            pushLog({ type: 'mc', text: message });
        });

        mcBot.on('error', (err) => {
            pushLog({ type: 'sys', text: `Bağlantı Hatası: ${err.message}` });
        });

        mcBot.on('end', (reason) => {
            clearAntiAfk();
            mcBot = null;
            panelState.connecting = false;
            panelState.connected = false;
            clearAutoMsg(false);
            broadcastState();
            const endInfo = reason ? ` (${formatKickReason(reason)})` : '';
            pushLog({ type: 'sys', text: `Bot sunucudan düştü veya ayrıldı.${endInfo}` });
        });
    });

    socket.on('disconnect_bot', () => {
        clearAntiAfk();
        if (mcBot) {
            try {
                mcBot.quit();
            } catch (_) {}
            mcBot = null;
        }
        panelState.connecting = false;
        panelState.connected = false;
        clearAutoMsg(false);
        broadcastState();
        pushLog({ type: 'sys', text: 'Bot sunucudan manuel olarak çıkarıldı.' });
    });

    socket.on('web_message', (text) => {
        if (!text || typeof text !== 'string') return;
        const clean = text.trim();
        if (!clean) return;

        if (!mcBot || !panelState.connected || !mcBot.chat) {
            pushLog({ type: 'sys', text: 'Hata: Mesaj göndermek için botun sunucuya bağlı olması gerekir.' });
            return;
        }

        mcBot.chat(clean);
        pushLog({ type: 'self', botName: panelState.profile.username, text: clean });
    });

    socket.on('start_auto_msg', (data = {}) => {
        if (!mcBot || !panelState.connected || !mcBot.chat) {
            pushLog({ type: 'sys', text: 'Hata: Oto-mesaj için önce sunucuya bağlanın.' });
            return;
        }

        const message = (data.message || '').trim();
        const intervalSec = parseInt(data.interval, 10);

        if (!message || isNaN(intervalSec) || intervalSec < 1) {
            pushLog({ type: 'sys', text: 'Hata: Geçerli bir mesaj ve süre girin.' });
            return;
        }

        clearAutoMsg(false);
        panel