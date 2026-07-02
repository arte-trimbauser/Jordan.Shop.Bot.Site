const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config");

const COR_NX = 0x660000;
const LOGS_CHANNEL_ID = config.LOGS_CHANNEL_ID;

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author?.bot || !message.guild) return;
        if (!message.channel.name?.startsWith("ticket-")) return;
        if (!config.STAFF_ROLES.some(id => message.member?.roles?.cache?.has(id))) return;

        try {
            const topic = message.channel.topic;
            if (!topic) return;

            const clienteId = topic.split("|")[0];
            const cliente = await client.users.fetch(clienteId).catch(() => null);
            if (!cliente) return;

            const canalLogs = await client.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
            if (canalLogs) {
                const embedLog = new EmbedBuilder()
                    .setColor(COR_NX)
                    .setTitle("📨 Notificacao de Ticket Enviada")
                    .setDescription([
                        `**Staff:** <@${message.author.id}> (${message.author.username})`,
                        `**Cliente:** <@${cliente.id}> (${cliente.username})`,
                        `**Canal:** <#${message.channel.id}> (\`${message.channel.name}\`)`,
                        `**Mensagem:** [Ver mensagem](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`
                    ].join('\n'))
                    .setTimestamp();
                await canalLogs.send({ embeds: [embedLog] }).catch(() => {});
            }

            const embedDM = new EmbedBuilder()
                .setColor(COR_NX)
                .setDescription([
                    `👋 | Ola **${cliente.username}**,`,
                    ``,
                    `🔔 | Seu ticket recebeu uma atualizacao.`,
                    ``,
                    `> 📋 Ticket: \`${message.channel.name}\``,
                    `> ⏰ Atualizado: `
                ].join('\n'))
                .setTimestamp();

            const botaoIr = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("🔗 Ir para o Ticket")
                    .setURL(`https://discord.com/channels/${message.guild.id}/${message.channel.id}`)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🔗')
            );

            await cliente.send({
                content: `<@${cliente.id}>`,
                embeds: [embedDM],
                components: [botaoIr]
            }).then(() => {
                console.log(`[TICKET NOTIFY] DM enviada com sucesso para ${cliente.username} (${clienteId})`);
            }).catch((err) => {
                console.log(`[DM FECHADA] Nao consegui avisar o ${cliente.username} (${clienteId}) — DMs fechadas.`);
                if (canalLogs) {
                    canalLogs.send(`⚠️ **DM Fechada:** Nao consegui notificar <@${cliente.id}> (${cliente.username}) no ticket \`${message.channel.name}\`.`).catch(() => {});
                }
            });
        } catch (err) {
            console.error("Erro ao processar notificacao de staff:", err);
        }
    });
};
