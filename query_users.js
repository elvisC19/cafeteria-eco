const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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
  .then(() => client.query("SELECT id_usuario, nombre, rol, activo, password_hash FROM usuarios"))
  .then(res => {
    console.log("=== USUARIOS REGISTRADOS EN LA BASE DE DATOS ===");
    console.log(res.rows);
    return client.end();
  })
  .catch(err => {
    console.error("Error al obtener usuarios:", err.message);
  });
