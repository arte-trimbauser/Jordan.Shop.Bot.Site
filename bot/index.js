// bot/index.js - Jordan Shop Bot
require('dotenv').config();

const { Client, GatewayIntentBits, Partials, REST, Routes, ActivityType, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ========== ANTI-CRASH ==========
process.on('unhandledRejection', (err) => {
    console.error('[ANTI-CRASH] Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
    console.error('[ANTI-CRASH] Uncaught Exception:', err);
});

// ========== KEEP-ALIVE SERVER ==========
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        bot: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Keep-alive server na porta ${PORT}`);
});

// Auto-ping a cada 10 minutos
setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    axios.get(`${url}/health`).catch(() => {});
}, 10 * 60 * 1000);

// ========== DISCORD CLIENT ==========
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageTyping
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// Carrinho global
client.carrinhos = new Map();

// ========== LIMPAR CACHE PERIODICAMENTE ==========
setInterval(() => {
    const agora = Date.now();
    let limpos = 0;
    for (const [userId, carrinho] of client.carrinhos) {
        if (carrinho.lastUpdated && agora - carrinho.lastUpdated > 24 * 60 * 60 * 1000) {
            client.carrinhos.delete(userId);
            limpos++;
        }
    }
    if (limpos > 0) console.log(`🧹 Cache limpo. Carrinhos removidos: ${limpos}`);
}, 60 * 60 * 1000);

// ========== CARREGAR HANDLERS ==========
function loadHandlers() {
    const handlersDir = path.join(__dirname, 'src', 'events');
    if (!fs.existsSync(handlersDir)) {
        console.log('⚠️ Pasta src/events nao encontrada.');
        return;
    }
    const eventFiles = fs.readdirSync(handlersDir).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        try {
            const event = require(path.join(handlersDir, file));
            if (typeof event === 'function') {
                event(client);
                console.log(`✅ Event handler carregado: ${file}`);
            }
        } catch (err) {
            console.error(`❌ Erro ao carregar ${file}:`, err.message);
        }
    }
}

// ========== REGISTAR SLASH COMMANDS ==========
async function registarComandos() {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
    try {
        const commandsPath = path.join(__dirname, 'src', 'commands');
        if (!fs.existsSync(commandsPath)) {
            console.log('⚠️ Pasta src/commands nao encontrada.');
            return;
        }
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commands = [];
        for (const file of commandFiles) {
            try {
                const cmd = require(path.join(commandsPath, file));
                if (cmd.data) {
                    commands.push(cmd.data.toJSON());
                    console.log(`📋 Comando carregado: ${cmd.data.name}`);
                }
            } catch (err) {
                console.error(`❌ Erro no comando ${file}:`, err.message);
            }
        }
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID || "1393629457599828040"),
            { body: commands }
        );
        console.log(`✅ ${commands.length} comandos slash registados!`);
    } catch (err) {
        console.error("❌ Erro ao registar slash commands:", err.message);
    }
}

// ========== EVENTOS DO CLIENT ==========
client.once('ready', async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    await registarComandos();
    try {
        const readyHandler = require('./src/events/ready');
        if (typeof readyHandler === 'function') readyHandler(client);
    } catch (e) {
        // ready.js e opcional
    }
});

loadHandlers();

// ========== LOGIN ==========
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN nao definido no .env!');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error('❌ Erro ao fazer login:', err.message);
    process.exit(1);
});
