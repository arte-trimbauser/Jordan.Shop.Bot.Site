// Lista de transcripts para a área Staff.
// A fonte dos transcripts pode ser ligada aqui mais tarde sem alterar o frontend.
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Não existem transcripts armazenados neste repositório neste momento.
  // Devolver [] evita que o frontend trate a ausência da fonte como erro de API.
  return res.status(200).json([]);
};
