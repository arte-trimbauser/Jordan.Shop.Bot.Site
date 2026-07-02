// src/events/sistemaCompleto.js - SISTEMA DE AUDIO + EMBEDS + TICKETS + FORMULARIOS
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
    PermissionFlagsBits,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const {
    joinVoiceChannel,
    getVoiceConnection,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    NoSubscriberBehavior,
    demuxProbe
} = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const { createReadStream } = require('node:fs');
const config = require('../config');

const ffmpegPath = require('ffmpeg-static');
console.log('📁 FFmpeg path:', ffmpegPath);

const EMOJIS = {
    pt: "<:Flag_of_Portugal:1492525538416267536>",
    es: "<:Flag_of_Spain:1492525567889641583>",
    en: "<:Flag_of_England:1492526158309359726>"
};

let voiceConnection = null;
let audioPlayer = null;
let currentResource = null;
let currentVolume = 0.5;
let isPlaying = false;

function getAudioPath() {
    const oggPath = path.join(__dirname, '..', '..', 'audio', 'JordanShop.ogg');
    const mp3Path = path.join(__dirname, '..', '..', 'audio', 'JordanShop.mp3');
    if (fs.existsSync(oggPath)) return oggPath;
    if (fs.existsSync(mp3Path)) return mp3Path;
    return null;
}

async function entrarCanalVoz(client) {
    try {
        const guild = client.guilds.cache.first();
        const canal = await guild.channels.fetch(config.CANAL_VOZ_ID);
        if (!canal || canal.type !== ChannelType.GuildVoice) {
            console.log('❌ Canal de voz nao encontrado');
            return;
        }
        const existingConnection = getVoiceConnection(guild.id);
        if (existingConnection) {
            console.log('ℹ️ Bot ja esta num canal de voz');
            return;
        }
        voiceConnection = joinVoiceChannel({
            channelId: canal.id,
            guildId: canal.guild.id,
            adapterCreator: canal.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
        voiceConnection.on(VoiceConnectionStatus.Ready, () => {
            console.log('✅ Bot entrou no canal de voz:', canal.name);
            iniciarAudioAutomatico();
        });
        voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log('⚠️ Bot desconectado do canal de voz');
            isPlaying = false;
            // RECONECTAR AUTOMATICAMENTE
            setTimeout(() => {
                console.log('🔄 A tentar reconectar ao canal de voz...');
                entrarCanalVoz(client);
            }, 5000);
        });
        voiceConnection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log('💥 Conexao de voz destruida');
            isPlaying = false;
            voiceConnection = null;
        });
        voiceConnection.on('error', (err) => {
            console.error('❌ Erro na conexao de voz:', err);
        });
    } catch (err) {
        console.error('❌ Erro ao entrar no canal de voz:', err);
    }
}

async function iniciarAudioAutomatico() {
    const audioPath = getAudioPath();
    if (!audioPath) {
        console.error('❌ Nenhum ficheiro de audio encontrado na pasta /audio/');
        console.log('📂 Pastas disponiveis:', fs.readdirSync(path.join(__dirname, '..', '..')));
        return;
    }
    console.log('🎵 Ficheiro encontrado:', path.basename(audioPath));
    await tocarAudioLoopInfinito(audioPath);
}

async function tocarAudioLoopInfinito(audioPath) {
    try {
        if (!audioPath || !fs.existsSync(audioPath)) {
            console.error(`❌ Ficheiro nao encontrado: ${audioPath}`);
            return false;
        }
        if (isPlaying) {
            console.log('ℹ️ Audio ja esta a tocar');
            return true;
        }
        console.log('🎵 A preparar reproducao de:', path.basename(audioPath));

        if (!audioPlayer) {
            audioPlayer = createAudioPlayer({
                behaviors: { noSubscriber: NoSubscriberBehavior.Play }
            });

            audioPlayer.on(AudioPlayerStatus.Idle, () => {
                console.log("🎵 Musica terminou, reiniciando...");
                isPlaying = false;
                const pathAtual = getAudioPath();
                if (pathAtual) {
                    setTimeout(() => tocarAudioLoopInfinito(pathAtual), 1000);
                }
            });

            audioPlayer.on(AudioPlayerStatus.Playing, () => {
                console.log("🎵 A tocar:", path.basename(audioPath));
            });

            audioPlayer.on(AudioPlayerStatus.Buffering, () => {
                console.log("⏳ A carregar audio...");
            });

            audioPlayer.on('error', (err) => {
                console.error("❌ Erro no player:", err.message);
                isPlaying = false;
                setTimeout(() => {
                    const pathAtual = getAudioPath();
                    if (pathAtual) tocarAudioLoopInfinito(pathAtual);
                }, 5000);
            });
        }

        const stream = createReadStream(audioPath);
        const { stream: probedStream, type } = await demuxProbe(stream);
        console.log(`🔍 Formato detetado: ${type}`);

        currentResource = createAudioResource(probedStream, {
            inputType: type,
            inlineVolume: true
        });

        if (currentResource.volume) {
            currentResource.volume.setVolume(currentVolume);
            console.log(`🔊 Volume definido para ${Math.round(currentVolume * 100)}%`);
        }

        if (voiceConnection) {
            voiceConnection.subscribe(audioPlayer);
            console.log('✅ Player subscrito na conexao de voz');
        } else {
            console.error('❌ Sem conexao de voz para subscrever!');
            return false;
        }

        audioPlayer.play(currentResource);
        isPlaying = true;
        console.log('▶️ Audio iniciado com sucesso');
        return true;

    } catch (err) {
        console.error("❌ Erro ao tocar audio:", err);
        isPlaying = false;
        setTimeout(() => {
            const pathAtual = getAudioPath();
            if (pathAtual) tocarAudioLoopInfinito(pathAtual);
        }, 10000);
        return false;
    }
}

function pararAudio() {
    if (audioPlayer) {
        audioPlayer.stop();
        isPlaying = false;
        console.log("🛑 Audio parado");
        return true;
    }
    return false;
}

function ajustarVolume(nivel) {
    currentVolume = Math.max(0, Math.min(100, nivel)) / 100;
    if (currentResource && currentResource.volume) {
        currentResource.volume.setVolume(currentVolume);
        console.log(`🔊 Volume ajustado para ${Math.round(currentVolume * 100)}%`);
        return true;
    }
    return false;
}

async function registrarComandosVoz(client) {
    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        const comandoEntrar = new SlashCommandBuilder().setName('entrar').setDescription('🔊 Entrar no canal de voz e tocar musica');
        const comandoSair = new SlashCommandBuilder().setName('sair').setDescription('🔇 Sair do canal de voz');
        const comandoReiniciar = new SlashCommandBuilder().setName('reiniciar').setDescription('🔄 Reiniciar a musica no canal de voz');
        const comandoAudio = new SlashCommandBuilder().setName('audio').setDescription('🎵 Controlar musica no canal de voz')
            .addSubcommand(sub => sub.setName('play').setDescription('Tocar musica'))
            .addSubcommand(sub => sub.setName('stop').setDescription('Parar musica'))
            .addSubcommand(sub => sub.setName('volume').setDescription('Ajustar volume')
                .addIntegerOption(opt => opt.setName('nivel').setDescription('Volume 0-100').setRequired(true).setMinValue(0).setMaxValue(100)));

        await guild.commands.create(comandoEntrar);
        await guild.commands.create(comandoSair);
        await guild.commands.create(comandoReiniciar);
        await guild.commands.create(comandoAudio);
        console.log('✅ Comandos de voz registados: /entrar, /sair, /reiniciar, /audio');
    } catch (err) {
        console.error('❌ Erro ao registar comandos de voz:', err);
    }
}

async function handleComandoVoz(interaction) {
    if (!interaction.isChatInputCommand()) return false;
    const { commandName, guild, member } = interaction;

    if (commandName === 'entrar') {
        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply({ content: '❌ Precisas de estar num canal de voz primeiro!', flags: MessageFlags.Ephemeral });
            return true;
        }
        try {
            const existingConnection = getVoiceConnection(guild.id);
            if (existingConnection) {
                await interaction.reply({ content: 'ℹ️ Bot ja esta num canal de voz. Usa `/reiniciar` para reiniciar o audio.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            voiceConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false
            });
            voiceConnection.on(VoiceConnectionStatus.Ready, () => {
                console.log('✅ Bot entrou no canal de voz:', voiceChannel.name);
                iniciarAudioAutomatico();
            });
            voiceConnection.on('error', (err) => {
                console.error('❌ Erro na conexao de voz:', err);
            });
            await interaction.editReply({ content: `🔊 Entrei no canal **${voiceChannel.name}** e estou a tocar musica!` });
        } catch (err) {
            console.error('❌ Erro ao entrar:', err);
            await interaction.editReply({ content: '❌ Erro ao entrar no canal de voz.' });
        }
        return true;
    }

    if (commandName === 'sair') {
        try {
            const connection = getVoiceConnection(guild.id);
            if (!connection) {
                await interaction.reply({ content: '❌ Bot nao esta em nenhum canal de voz.', flags: MessageFlags.Ephemeral });
                return true;
            }
            pararAudio();
            connection.destroy();
            voiceConnection = null;
            await interaction.reply({ content: '🔇 Saí do canal de voz.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            console.error('❌ Erro ao sair:', err);
            await interaction.reply({ content: '❌ Erro ao sair do canal de voz.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (commandName === 'reiniciar') {
        try {
            const connection = getVoiceConnection(guild.id);
            if (!connection) {
                await interaction.reply({ content: '❌ Bot nao esta em nenhum canal de voz. Usa `/entrar` primeiro.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            pararAudio();
            await new Promise(resolve => setTimeout(resolve, 500));
            isPlaying = false;
            const audioPath = getAudioPath();
            if (audioPath) {
                const sucesso = await tocarAudioLoopInfinito(audioPath);
                if (sucesso) await interaction.editReply({ content: '🔄 Audio reiniciado!' });
                else await interaction.editReply({ content: '❌ Erro ao reiniciar audio.' });
            } else {
                await interaction.editReply({ content: '❌ Ficheiro de audio nao encontrado.' });
            }
        } catch (err) {
            console.error('❌ Erro ao reiniciar:', err);
            await interaction.editReply({ content: '❌ Erro ao reiniciar o audio.' });
        }
        return true;
    }

    if (commandName === 'audio') {
        return await handleAudioCommand(interaction);
    }

    return false;
}

async function handleAudioCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const audioPath = getAudioPath();

    switch (subcommand) {
        case 'play':
            if (!audioPath) {
                await interaction.editReply({ content: '❌ Ficheiro de audio nao encontrado na pasta /audio/' });
                return true;
            }
            isPlaying = false;
            const sucesso = await tocarAudioLoopInfinito(audioPath);
            if (sucesso) await interaction.editReply({ content: '🎵 Musica em loop infinito!' });
            else await interaction.editReply({ content: '❌ Erro ao tocar ficheiro. Verifica os logs.' });
            break;
        case 'stop':
            if (pararAudio()) await interaction.editReply({ content: '🛑 Audio parado' });
            else await interaction.editReply({ content: '❌ Nenhum audio a tocar' });
            break;
        case 'volume':
            const nivel = interaction.options.getInteger('nivel');
            if (ajustarVolume(nivel)) await interaction.editReply({ content: `🔊 Volume ajustado para ${nivel}%` });
            else await interaction.editReply({ content: '❌ Nao foi possivel ajustar volume' });
            break;
    }
    return true;
}

const embedsEnviados = new Set();

async function enviarEmbedSuporte(client) {
    try {
        if (embedsEnviados.has(config.CANAL_TICKET_ID)) {
            console.log('ℹ️ Embed de suporte ja enviado anteriormente');
            return;
        }
        const canal = await client.channels.fetch(config.CANAL_TICKET_ID);
        if (!canal) return console.log('❌ Canal de suporte nao encontrado');
        const mensagens = await canal.messages.fetch({ limit: 10 });
        const jaExiste = mensagens.some(m => m.author.id === client.user.id && m.components.length > 0);
        if (jaExiste) {
            console.log('ℹ️ Embed de suporte ja existe no canal');
            embedsEnviados.add(config.CANAL_TICKET_ID);
            return;
        }
        const embed = new EmbedBuilder()
            .setTitle('🎫 Suporte - Jordan Shop')
            .setDescription(
                `**Para criar um ticket escolhe a opcao:**\n` +
                `${EMOJIS.pt} **Suporte**\n\n` +
                `**Para abrir tu ticket elije tu opcion:**\n` +
                `${EMOJIS.es} **Suporte**\n\n` +
                `**To create your ticket select:**\n` +
                `${EMOJIS.en} **Support option**`
            )
            .setColor('#8b0000')
            .setFooter({ text: 'Jordan Shop | Sistema de Suporte' });
        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_suporte_idioma')
            .setPlaceholder('🌐 Seleciona o teu idioma / Selecciona tu idioma / Select your language')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Portugues').setDescription('Suporte em Portugues').setValue('pt').setEmoji('1492525538416267536'),
                new StringSelectMenuOptionBuilder().setLabel('Espanol').setDescription('Soporte en Espanol').setValue('es').setEmoji('1492525567889641583'),
                new StringSelectMenuOptionBuilder().setLabel('English').setDescription('Support in English').setValue('en').setEmoji('1492526158309359726')
            );
        const row = new ActionRowBuilder().addComponents(menu);
        await canal.send({ embeds: [embed], components: [row] });
        embedsEnviados.add(config.CANAL_TICKET_ID);
        console.log('✅ Embed de suporte enviado (primeira vez)');
    } catch (err) {
        console.error('❌ Erro ao enviar embed:', err);
    }
}

async function enviarFormularios(client) {
    try {
        if (embedsEnviados.has(config.CANAL_FORMULARIO_ID)) {
            console.log('ℹ️ Formularios ja enviados anteriormente');
            return;
        }
        const canal = await client.channels.fetch(config.CANAL_FORMULARIO_ID);
        if (!canal) return console.log('❌ Canal de formularios nao encontrado');
        const mensagens = await canal.messages.fetch({ limit: 10 });
        const jaExiste = mensagens.some(m => m.author.id === client.user.id && m.components.length > 0);
        if (jaExiste) {
            console.log('ℹ️ Formularios ja existem no canal');
            embedsEnviados.add(config.CANAL_FORMULARIO_ID);
            return;
        }
        const embed = new EmbedBuilder()
            .setTitle('📋 Centro de Feedback - Jordan Shop')
            .setDescription(
                'Bem-vindo ao centro de feedback! Escolhe uma opcao abaixo:\n\n' +
                `🐛 **Reportar Bug** - Encontras-te algum problema?\n` +
                `💡 **Ideias** - Tens sugestoes para melhorar?\n` +
                `⭐ **Avaliar Bot** - Da-nos a tua opiniao (1-5 estrelas)`
            )
            .setColor('#8b0000')
            .setFooter({ text: 'A tua opiniao e importante!' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('form_bug').setLabel('🐛 Reportar Bug').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('form_ideia').setLabel('💡 Ideias').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('form_avaliar').setLabel('⭐ Avaliar Bot').setStyle(ButtonStyle.Success)
        );
        await canal.send({ embeds: [embed], components: [row] });
        embedsEnviados.add(config.CANAL_FORMULARIO_ID);
        console.log('✅ Formularios enviados (primeira vez)');
    } catch (err) {
        console.error('❌ Erro ao enviar formularios:', err);
    }
}

const ticketsEmCriacao = new Map();

async function criarTicket(interaction, tipo, idioma) {
    const { guild, user, member } = interaction;
    if (ticketsEmCriacao.has(user.id)) {
        return interaction.reply({ content: '⏳ Ja estas a criar um ticket. Aguarda um momento...', flags: MessageFlags.Ephemeral });
    }
    ticketsEmCriacao.set(user.id, true);
    const nomes = {
        pt: { suporte: 'suporte', compra: 'compra', tecnico: 'tecnico' },
        es: { suporte: 'soporte', compra: 'compra', tecnico: 'tecnico' },
        en: { suporte: 'support', compra: 'purchase', tecnico: 'technical' }
    };
    const prefixo = nomes[idioma][tipo];
    const nomeCanal = `ticket-${prefixo}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ticketExistente = guild.channels.cache.find(ch =>
            ch.name.includes(`ticket-${prefixo}-${user.username.toLowerCase()}`) &&
            ch.parentId === config.CATEGORIA_TICKETS_ID
        );
        if (ticketExistente) {
            ticketsEmCriacao.delete(user.id);
            return interaction.editReply({ content: `❌ Ja tens um ticket aberto: ${ticketExistente}` });
        }
        const ticketChannel = await guild.channels.create({
            name: nomeCanal,
            type: ChannelType.GuildText,
            parent: config.CATEGORIA_TICKETS_ID,
            topic: `${user.id}|${tipo}|${idioma}`,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });
        const textos = {
            pt: { titulo: '🎫 Ticket de Suporte', desc: `Ola <@${user.id}>!\n\nObrigado por contactares o suporte. A equipa da Jordan Shop ira ajudar-te brevemente.\n\n**Tipo:** Suporte ${tipo}`, fechar: '🔒 Fechar Ticket' },
            es: { titulo: '🎫 Ticket de Soporte', desc: `¡Hola <@${user.id}>!\n\nGracias por contactar con el soporte. El equipo de Jordan Shop te ayudara pronto.\n\n**Tipo:** Soporte ${tipo}`, fechar: '🔒 Cerrar Ticket' },
            en: { titulo: '🎫 Support Ticket', desc: `Hello <@${user.id}>!\n\nThank you for contacting support. The Jordan Shop team will help you shortly.\n\n**Type:** ${tipo} Support`, fechar: '🔒 Close Ticket' }
        };
        const t = textos[idioma];
        const embed = new EmbedBuilder().setTitle(t.titulo).setDescription(t.desc).setColor('#8b0000');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fechar_ticket').setLabel(t.fechar).setStyle(ButtonStyle.Danger)
        );
        await ticketChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });
        await interaction.editReply({ content: `✅ Ticket criado: ${ticketChannel}` });
    } catch (err) {
        console.error('❌ Erro ao criar ticket:', err);
        if (interaction.deferred) await interaction.editReply({ content: '❌ Erro ao criar ticket. Contacta um administrador.' });
        else await interaction.reply({ content: '❌ Erro ao criar ticket. Contacta um administrador.', flags: MessageFlags.Ephemeral });
    } finally {
        ticketsEmCriacao.delete(user.id);
    }
}

async function handleMenuSuporte(interaction) {
    const idioma = interaction.values[0];
    const textos = {
        pt: { titulo: '🎫 Criar Ticket', desc: 'Escolhe o tipo de suporte:', suporte: 'Suporte Geral', compra: 'Ajuda com Compra', tecnico: 'Problema Tecnico' },
        es: { titulo: '🎫 Crear Ticket', desc: 'Elige el tipo de soporte:', suporte: 'Soporte General', compra: 'Ayuda con Compra', tecnico: 'Problema Tecnico' },
        en: { titulo: '🎫 Create Ticket', desc: 'Choose support type:', suporte: 'General Support', compra: 'Purchase Help', tecnico: 'Technical Issue' }
    };
    const t = textos[idioma];
    const embed = new EmbedBuilder().setTitle(t.titulo).setDescription(t.desc).setColor('#8b0000');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ticket_suporte_${idioma}`).setLabel(t.suporte).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`ticket_compra_${idioma}`).setLabel(t.compra).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket_tecnico_${idioma}`).setLabel(t.tecnico).setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

async function handleFormBug(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const modal = new ModalBuilder().setCustomId('modal_bug').setTitle('🐛 Reportar Bug');
    const input1 = new TextInputBuilder().setCustomId('descricao_bug').setLabel('Descricao do Bug').setPlaceholder('Descreve o bug detalhadamente...').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000);
    const input2 = new TextInputBuilder().setCustomId('canal_bug').setLabel('Canal onde ocorreu (opcional)').setPlaceholder('Ex: geral ou #geral ou ID do canal').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100);
    modal.addComponents(new ActionRowBuilder().addComponents(input1), new ActionRowBuilder().addComponents(input2));
    await interaction.followUp({ content: 'Abre o modal acima!', flags: MessageFlags.Ephemeral });
    await interaction.showModal(modal);
}

async function handleFormIdeia(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const modal = new ModalBuilder().setCustomId('modal_ideia').setTitle('💡 Sugestao');
    const input = new TextInputBuilder().setCustomId('descricao_ideia').setLabel('A tua ideia').setPlaceholder('Descreve a tua sugestao...').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.followUp({ content: 'Abre o modal acima!', flags: MessageFlags.Ephemeral });
    await interaction.showModal(modal);
}

async function handleFormAvaliar(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const embed = new EmbedBuilder().setTitle('⭐ Avalia o Jordan Shop Bot').setDescription('Quantas estrelas das ao nosso servico (bot)?').setColor('#FFD700');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('avaliar_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('avaliar_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('avaliar_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('avaliar_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('avaliar_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleAvaliacaoEstrelas(interaction, estrelas) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const modal = new ModalBuilder().setCustomId(`modal_avaliacao_${estrelas}`).setTitle(`⭐ Avaliacao: ${estrelas} Estrelas`);
    const input = new TextInputBuilder().setCustomId('motivo_avaliacao').setLabel('Comentario (opcional)').setPlaceholder('Conta-nos o que gostaste ou como podemos melhorar...').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.followUp({ content: 'Abre o modal acima!', flags: MessageFlags.Ephemeral });
    await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
    const { customId, fields, user } = interaction;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const LOG_ID = process.env.LOG_CHANNEL_ID || config.LOGS_CHANNEL_ID;
    const logChannel = await interaction.guild.channels.fetch(LOG_ID).catch(() => null);

    if (customId === 'modal_bug') {
        const descricao = fields.getTextInputValue('descricao_bug');
        const canal = fields.getTextInputValue('canal_bug') || 'Nao especificado';
        if (logChannel) {
            const embed = new EmbedBuilder().setTitle('🐛 Novo Bug Reportado').addFields(
                { name: 'Utilizador', value: `<@${user.id}>`, inline: true },
                { name: 'Canal', value: canal, inline: true },
                { name: 'Descricao', value: descricao }
            ).setColor('#FF0000').setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
        await interaction.editReply({ content: '✅ Bug reportado com sucesso! Obrigado.' });
    } else if (customId === 'modal_ideia') {
        const ideia = fields.getTextInputValue('descricao_ideia');
        if (logChannel) {
            const embed = new EmbedBuilder().setTitle('💡 Nova Sugestao').addFields(
                { name: 'Utilizador', value: `<@${user.id}>`, inline: true },
                { name: 'Ideia', value: ideia }
            ).setColor('#5865F2').setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
        await interaction.editReply({ content: '💡 Obrigado pela tua sugestao!' });
    } else if (customId.startsWith('modal_avaliacao_')) {
        const estrelas = customId.split('_')[2];
        const motivo = fields.getTextInputValue('motivo_avaliacao') || 'Sem comentario';
        if (logChannel) {
            const embed = new EmbedBuilder().setTitle('⭐ Nova Avaliacao').addFields(
                { name: 'Utilizador', value: `<@${user.id}>`, inline: true },
                { name: 'Avaliacao', value: '⭐'.repeat(parseInt(estrelas)), inline: true },
                { name: 'Comentario', value: motivo }
            ).setColor('#FFD700').setTimestamp();
            await logChannel.send({ embeds: [embed] });
        }
        await interaction.editReply({ content: `⭐ Obrigado pela tua avaliacao de ${estrelas} estrelas!` });
    }
}

async function handleSistemaInteraction(interaction, client) {
    if (interaction.isChatInputCommand()) {
        const vozCommands = ['entrar', 'sair', 'reiniciar', 'audio'];
        if (vozCommands.includes(interaction.commandName)) {
            await handleComandoVoz(interaction);
            return true;
        }
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_suporte_idioma') {
        await handleMenuSuporte(interaction);
        return true;
    }
    if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
        const parts = interaction.customId.split('_');
        const tipo = parts[1];
        const idioma = parts[2];
        await criarTicket(interaction, tipo, idioma);
        return true;
    }
    if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
        const { channel } = interaction;
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: '❌ Este nao e um canal de ticket.', flags: MessageFlags.Ephemeral });
        }
        await interaction.reply({ content: '🔒 A fechar ticket em 5 segundos...', flags: MessageFlags.Ephemeral });
        setTimeout(() => channel.delete().catch(() => {}), 5000);
        return true;
    }
    if (interaction.isButton()) {
        if (interaction.customId === 'form_bug') { await handleFormBug(interaction); return true; }
        if (interaction.customId === 'form_ideia') { await handleFormIdeia(interaction); return true; }
        if (interaction.customId === 'form_avaliar') { await handleFormAvaliar(interaction); return true; }
        if (interaction.customId.startsWith('avaliar_')) {
            const estrelas = interaction.customId.split('_')[1];
            await handleAvaliacaoEstrelas(interaction, estrelas);
            return true;
        }
    }
    if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
        return true;
    }
    return false;
}

module.exports = {
    entrarCanalVoz,
    enviarEmbedSuporte,
    enviarFormularios,
    handleSistemaInteraction,
    registrarComandosVoz,
    handleAudioCommand,
};
