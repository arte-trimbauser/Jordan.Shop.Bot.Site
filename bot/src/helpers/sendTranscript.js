const supabase = require('../../database/supabase');
const discordTranscripts = require('discord-html-transcripts');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function sendTranscript(channel, userName) {
    try {
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            filename: `transcript-${channel.name}.html`,
            saveImages: true,
            poweredBy: false
        });

        const fileName = `${channel.id}.html`;
        const filePath = `transcripts/${fileName}`;

        const { error: storageError } = await supabase.storage
            .from('transcripts')
            .upload(filePath, attachment.attachment, {
                contentType: 'text/html',
                upsert: true,
                cacheControl: '3600',
                metadata: { cliente: userName, canal: channel.name }
            });

        if (storageError) console.error("⚠️ Erro Supabase Storage:", storageError.message);

        const logEmbed = new EmbedBuilder()
            .setTitle("📄 Transcrição Arquivada")
            .setColor("#ff0000")
            .addFields(
                { name: "Canal:", value: `\`\`${channel.name}\`\``, inline: true },
                { name: "Fechado por:", value: `\`\`${userName}\`\``, inline: true }
            )
            .setDescription(`🔗 **Ver Online:** [Clique Aqui](https://jordan-shop.onrender.com/transcripts/${channel.id})`)
            .setFooter({ text: "Jordan Shop | Transcript" })
            .setTimestamp();

        const logChannel = await channel.guild.channels.fetch(config.TRANSCRIPT_LOG_CHANNEL_ID).catch(() => null);
        if (logChannel) {
            await logChannel.send({ embeds: [logEmbed], files: [attachment] });
        }

        console.log(`✅ Transcript de ${channel.name} guardado com metadados.`);
        return filePath;
    } catch (err) {
        console.error("❌ Erro no sendTranscript:", err.message);
    }
}

module.exports = sendTranscript;
