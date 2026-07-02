module.exports = (client) => {
    client.on('error', (err) => {
        console.error('[CLIENT ERROR]', err);
    });

    client.on('shardError', (err) => {
        console.error('[SHARD ERROR]', err);
    });

    client.on('warn', (warn) => {
        console.warn('[CLIENT WARN]', warn);
    });
};
