const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'site')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'site', 'login.html'));
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', site: true, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🌐 Site Jordan Shop na porta ${PORT}`);
});