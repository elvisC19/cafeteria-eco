const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        process.env[key] = value;
      }
    }
  });
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    const res = await client.query("SELECT id_usuario, nombre, password_hash FROM usuarios WHERE id_usuario = 1");
    const user = res.rows[0];
    console.log("Usuario:", user.nombre);
    console.log("Hash en BD:", user.password_hash);

    // Método 1: SQL crypt
    try {
      const sqlRes = await client.query(
        "SELECT (password_hash = crypt($1, password_hash)) AS valid FROM usuarios WHERE id_usuario = $2",
        ["admin123", user.id_usuario]
      );
      console.log("Método 1 (SQL crypt) válido:", sqlRes.rows[0]?.valid);
    } catch (e) {
      console.error("Método 1 falló:", e.message);
    }

    // Método 2: Node bcryptjs
    try {
      const nodeValid = bcrypt.compareSync("admin123", user.password_hash);
      console.log("Método 2 (Node bcryptjs) válido:", nodeValid);
    } catch (e) {
      console.error("Método 2 falló:", e.message);
    }

    return client.end();
  })
  .catch(err => {
    console.error("Error general:", err.message);
  });
