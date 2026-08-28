// api/callback.js
module.exports = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/login.html?error=no_code');

  try {
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://jordan-shop-bot-site.vercel.app/api/callback'
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (!tokenRes.ok) return res.redirect('/login.html?error=auth_failed');

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) return res.redirect('/login.html?error=auth_failed');

    const userData = await userRes.json();

    // Buscar membro na guild para obter o nickname
    const GUILD_ID = '1393629457599828040';
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userData.id}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    let displayName = userData.global_name || userData.username;
    if (memberRes.ok) {
      const memberData = await memberRes.json();
      if (memberData.nick) displayName = memberData.nick;
    }

    const staffAutorizado = {
      "924344854232834068": "Jordan Costa",
      "996454465555136675": "Arteex26",
      "1476260824669618307": "lucasvieira",
      "1138795786507919410": "migueldodrip",
      "886007990942052362": "pincher11"
    };

    if (!staffAutorizado[userData.id]) {
      return res.redirect('/login.html?error=nao_autorizado');
    }

    const tokenSessao = Math.random().toString(36).substring(2);
    return res.redirect(`/loja.html?user=${encodeURIComponent(displayName)}&token=${tokenSessao}`);
  } catch (error) {
    console.error('Callback error:', error);
    return res.redirect('/login.html?error=auth_failed');
  }
};
