const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id_producto, tipo_movimiento, cantidad, observacion } = req.body;

    if (!id_producto || !tipo_movimiento || !cantidad || cantidad <= 0) {
      throw new Error("Datos incompletos o inválidos.");
    }

    const ahora = new Date();
    const anio = req.body.anio || ahora.getFullYear();
    const mes = req.body.mes || ahora.getMonth() + 1;

    switch (tipo_movimiento) {
      case "COMPRA":
        await registrarCompra(
          client,
          id_producto,
          cantidad,
          observacion,
          anio,
          mes,
        );
        break;
      case "PRODUCCION":
        await registrarProduccion(
          client,
          id_producto,
          cantidad,
          observacion,
          anio,
          mes,
        );
        break;
      case "ENTRADA":
        await registrarEntrada(
          client,
          id_producto,
          cantidad,
          observacion,
          anio,
          mes,
        );
        break;
      default:
        throw new Error("Tipo de movimiento no válido.");
    }

    await client.query("COMMIT");
    res.json({
      mensaje: "Movimiento registrado correctamente.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en /api/entrada:", error);
    res.status(500).json({
      mensaje: error.message,
    });
  } finally {
    client.release();
  }
});

// ---------- COMPRA ----------
async function registrarCompra(
  client,
  idProducto,
  cantidad,
  observacion,
  anio,
  mes,
) {
  const resProducto = await client.query(
    `SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
    [idProducto],
  );
  if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");
  if (resProducto.rows[0].tipo !== "Reventa") {
    throw new Error("El producto no es de tipo Reventa.");
  }

  const cantidadFinal = Number(cantidad);

  // Obtener el costo unitario de la vista para productos de reventa/inventario
  const resCosto = await client.query(
    `SELECT costo FROM v_productos_inventario WHERE id_producto = $1`,
    [idProducto],
  );
  const costoUnitario =
    resCosto.rows.length > 0 ? Number(resCosto.rows[0].costo || 0) : 0;
  const costoTotal = cantidadFinal * costoUnitario;

  await client.query(
    `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
    [anio, mes, idProducto],
  );

  // GUARDAR costo_unitario Y costo_total EN movimiento_producto
  await client.query(
    `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, costo_unitario, costo_total, observacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      idProducto,
      anio,
      mes,
      "COMPRA",
      cantidadFinal,
      costoUnitario,
      costoTotal,
      observacion || null,
    ],
  );

  await client.query(
    `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
    [cantidadFinal, anio, mes, idProducto],
  );
}

// ---------- PRODUCCIÓN ----------
async function registrarProduccion(
  client,
  idProducto,
  cantidadUnidades,
  observacion,
  anio,
  mes,
) {
  const resProducto = await client.query(
    `SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
    [idProducto],
  );
  if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");
  if (resProducto.rows[0].tipo !== "Elaborado") {
    throw new Error("El producto no es de tipo Elaborado.");
  }

  const cantidadUnidadesNum = Number(cantidadUnidades);
  if (isNaN(cantidadUnidadesNum) || cantidadUnidadesNum <= 0) {
    throw new Error("La cantidad de unidades producidas debe ser mayor a 0.");
  }

  // Corregido: Obtener costo unitario desde v_productos_elaborados_costo_actual o v_productos_inventario
  const resCosto = await client.query(
    `SELECT costo_unitario_prod FROM v_productos_elaborados_costo_actual WHERE id_producto = $1`,
    [idProducto],
  );

  // Leemos el alias exacto 'costo_unitario_prod' que trajiste en el SELECT
  const costoUnitario =
    resCosto.rows.length > 0
      ? Number(resCosto.rows[0].costo_unitario_prod || 0)
      : 0;
  const costoTotalMovimiento = cantidadUnidadesNum * costoUnitario;

  await client.query(
    `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
    [anio, mes, idProducto],
  );

  // GUARDAR costo_unitario Y costo_total EN movimiento_producto
  await client.query(
    `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, costo_unitario, costo_total, observacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      idProducto,
      anio,
      mes,
      "PRODUCCION",
      cantidadUnidadesNum,
      costoUnitario,
      costoTotalMovimiento,
      observacion || null,
    ],
  );

  await client.query(
    `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
    [cantidadUnidadesNum, anio, mes, idProducto],
  );
}

// ---------- ENTRADA (Ajuste/Otro) ----------
async function registrarEntrada(
  client,
  idProducto,
  cantidad,
  observacion,
  anio,
  mes,
) {
  const resProducto = await client.query(
    `SELECT id_producto FROM producto WHERE id_producto = $1 FOR UPDATE`,
    [idProducto],
  );
  if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");

  const cantidadFinal = Number(cantidad);

  const resCosto = await client.query(
    `SELECT costo FROM v_productos_inventario WHERE id_producto = $1`,
    [idProducto],
  );
  const costoUnitario =
    resCosto.rows.length > 0 ? Number(resCosto.rows[0].costo || 0) : 0;
  const costoTotal = cantidadFinal * costoUnitario;

  await client.query(
    `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
    [anio, mes, idProducto],
  );

  // GUARDAR costo_unitario Y costo_total EN movimiento_producto
  await client.query(
    `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, costo_unitario, costo_total, observacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      idProducto,
      anio,
      mes,
      "ENTRADA",
      cantidadFinal,
      costoUnitario,
      costoTotal,
      observacion || null,
    ],
  );

  await client.query(
    `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
    [cantidadFinal, anio, mes, idProducto],
  );
}

module.exports = router;
