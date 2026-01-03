export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Daftar semua API Key yang sudah lo masukin di Vercel tadi
  const keys = [
    process.env.GROQ_API_KEY,          // Utama
    process.env.GROQ_API_KEY_BACKUP,   // Cadangan 1
    process.env.GROQ_API_KEY_BACKUP_2, // Cadangan 2
    process.env.GROQ_API_KEY_BACKUP_3  // Cadangan 3 (Kalau ada)
  ];

  let lastError;

  // Sistem bakal coba satu-satu kuncinya
  for (const key of keys) {
    if (!key) continue; // Skip kalau kuncinya kosong

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();

      // Kalau responnya OK (berhasil), langsung kirim ke user dan berhenti cari kunci lain
      if (response.ok) {
        return res.status(200).json(data);
      }

      // Kalau gagal (misal limit), simpan errornya terus lanjut ke kunci cadangan berikutnya
      lastError = data;
      console.log(`API Key limit atau bermasalah, mencoba cadangan...`);

    } catch (error) {
      lastError = { error: error.message };
    }
  }

  // Kalau semua kunci sudah dicoba dan tetep gagal, baru kasih tau user
  res.status(500).json({ 
    error: "Aduh, semua API Key lagi limit nih. Coba lagi bentar ya!", 
    details: lastError 
  });
}
