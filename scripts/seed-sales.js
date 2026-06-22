// ============================================================================
// CHARCAS CAPITAL - Script para sembrar datos de ventas (7 días)
// Permite visualizar los gráficos y el punto de equilibrio en el Dashboard.
// ============================================================================

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log('🚀 Iniciando simulación y sembrado de ventas para Charcas Capital...');

// 1. Cargar variables de entorno desde .env.local
const envPath = path.join(__dirname, '../.env.local');
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
  console.log('✅ Archivo .env.local cargado con éxito.');
} else {
  console.warn('⚠️ Advertencia: No se encontró el archivo .env.local.');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Error: La variable DATABASE_URL no está configurada.');
  process.exit(1);
}

async function runSeed() {
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos.');

    // 2. Obtener insumos y productos
    const prodResult = await client.query('SELECT id_producto, nombre_producto, precio_venta, categoria FROM productos');
    const products = prodResult.rows;
    if (products.length === 0) {
      console.error('❌ Error: No hay productos en la base de datos. Ejecute setup-db.js primero.');
      process.exit(1);
    }

    // Obtener un usuario y una mesa para asociar los pedidos
    const userResult = await client.query('SELECT id_usuario FROM usuarios LIMIT 1');
    const userId = userResult.rows[0]?.id_usuario || null;

    const mesaResult = await client.query('SELECT id_mesa FROM mesas LIMIT 1');
    const mesaId = mesaResult.rows[0]?.id_mesa || null;

    console.log(`📊 Productos disponibles: ${products.length}. Sembrando datos...`);

    // 3. Limpiar pedidos de prueba anteriores (opcional, para evitar saturar)
    // Descomente si prefiere limpiar las ventas de los últimos 7 días antes de sembrar.
    await client.query("DELETE FROM detalle_pedido WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE tipo_servicio = 'Comer en el Lugar' AND total_pago > 0 AND fecha_hora >= NOW() - INTERVAL '7 days')");
    await client.query("DELETE FROM pedidos WHERE tipo_servicio = 'Comer en el Lugar' AND total_pago > 0 AND fecha_hora >= NOW() - INTERVAL '7 days'");
    console.log('🧹 Limpieza de pedidos de prueba anteriores completada.');

    let totalPedidosGenerados = 0;
    let montoTotalGenerado = 0;

    // 4. Generar ventas para los últimos 7 días
    for (let d = 6; d >= 0; d--) {
      // Fecha en huso horario boliviano (UTC-4)
      // Restamos 'd' días a la fecha de hoy
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - d);
      const dateStr = targetDate.toISOString().split('T')[0];

      // Número aleatorio de pedidos por día (entre 6 y 14 pedidos)
      const numPedidos = Math.floor(Math.random() * 9) + 6; 
      console.log(`📅 Creando ${numPedidos} pedidos para el día: ${dateStr}...`);

      for (let p = 0; p < numPedidos; p++) {
        // Métodos de pago
        const metodoPago = Math.random() > 0.4 ? 'Efectivo' : 'Pago QR Simple';
        const tipoServicio = 'Comer en el Lugar';
        const estadoPedido = 'Entregado';
        const estadoPago = 'Pagado';

        // Hora aleatoria de atención comercial (entre 08:30 y 21:30)
        const hour = Math.floor(Math.random() * 13) + 8; // 8 a 20
        const minute = Math.floor(Math.random() * 60);
        
        const orderTime = new Date(targetDate);
        orderTime.setHours(hour, minute, 0, 0);

        // Crear pedido
        const pedidoInsert = await client.query(
          `INSERT INTO pedidos (id_usuario, id_mesa, tipo_servicio, estado_pedido, metodo_pago, estado_pago, total_pago, fecha_hora)
           VALUES ($1, $2, $3, $4, $5, $6, 0, $7) RETURNING id_pedido`,
          [userId, mesaId, tipoServicio, estadoPedido, metodoPago, estadoPago, orderTime]
        );
        const pedidoId = pedidoInsert.rows[0].id_pedido;

        // Agregar de 1 a 3 productos al detalle del pedido
        const numProductos = Math.floor(Math.random() * 3) + 1;
        let totalPago = 0;

        // Mezclar productos aleatoriamente
        const selectedProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, numProductos);

        for (const prod of selectedProducts) {
          const cantidad = Math.floor(Math.random() * 2) + 1; // 1 o 2 unidades
          const precio = parseFloat(prod.precio_venta);
          const subtotal = cantidad * precio;
          totalPago += subtotal;

          await client.query(
            `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, subtotal, observaciones)
             VALUES ($1, $2, $3, $4, NULL)`,
            [pedidoId, prod.id_producto, cantidad, subtotal]
          );
        }

        // Actualizar el total_pago en el pedido cabecera
        await client.query(
          `UPDATE pedidos SET total_pago = $1 WHERE id_pedido = $2`,
          [totalPago, pedidoId]
        );

        totalPedidosGenerados++;
        montoTotalGenerado += totalPago;
      }
    }

    console.log('\n================================================================');
    console.log('🎉 SEMBRADO DE VENTAS COMPLETADO CON ÉXITO');
    console.log('================================================================');
    console.log(`Pedidos creados:   ${totalPedidosGenerados}`);
    console.log(`Ventas totales:    Bs. ${montoTotalGenerado.toFixed(2)}`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Error durante el sembrado de ventas:');
    console.error(error.message);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada.');
  }
}

runSeed();
