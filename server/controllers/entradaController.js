const pool = require('../config/db');

const registrarEntradaProducto = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id_producto, anio, mes, tipo_movimiento, cantidad, observacion } = req.body;

    // ---------- Validaciones básicas ----------
    if (!id_producto || !anio || !mes || !tipo_movimiento || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Datos de entrada incompletos o inválidos.' });
    }

    await client.query('BEGIN');

    // ---------- 1. Obtener producto con bloqueo ----------
    const resProducto = await client.query(
      `SELECT id_producto, tipo, unidades_por_lote, stock_actual
       FROM producto
       WHERE id_producto = $1
       FOR UPDATE`,
      [id_producto]
    );

    if (resProducto.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const producto = resProducto.rows[0];

    // ---------- 2. Validar compatibilidad tipo_movimiento vs tipo de producto ----------
    const movimientosPermitidos = {
      Reventa: ['COMPRA', 'AJUSTE', 'OTRO'],
      Elaborado: ['PRODUCCION', 'AJUSTE', 'OTRO']
    };

    if (!movimientosPermitidos[producto.tipo]?.includes(tipo_movimiento)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `El tipo de movimiento "${tipo_movimiento}" no es válido para productos de tipo "${producto.tipo}".`
      });
    }

    // ---------- 3. Calcular cantidad final (para producción: lotes * unidades_por_lote) ----------
    let cantidadFinal = Number(cantidad);
    if (tipo_movimiento === 'PRODUCCION') {
      const unidadesPorLote = Number(producto.unidades_por_lote) || 1;
      cantidadFinal = cantidad * unidadesPorLote;
    }

    // ---------- 4. Asegurar existencia de fila en inventario_mensual_producto ----------
    // Si no existe, se crea con stock_inicial = stock_actual y stock_actual = stock_actual
    // Si existe, no se modifica (ON CONFLICT DO NOTHING)
    await client.query(
      `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
      [anio, mes, id_producto, producto.stock_actual]
    );

    // ---------- 5. Registrar movimiento detallado ----------
    const resMovimiento = await client.query(
      `INSERT INTO movimiento_producto
         (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_producto, anio, mes, tipo_movimiento, cantidadFinal, observacion || null]
    );

    // ---------- 6. Actualizar stock mensual ----------
    const resStockMensual = await client.query(
      `UPDATE inventario_mensual_producto
       SET stock_actual = stock_actual + $1
       WHERE anio = $2 AND mes = $3 AND id_producto = $4
       RETURNING stock_actual`,
      [cantidadFinal, anio, mes, id_producto]
    );

    // ---------- 7. Actualizar stock global del producto ----------
    await client.query(
      `UPDATE producto
       SET stock_actual = stock_actual + $1
       WHERE id_producto = $2`,
      [cantidadFinal, id_producto]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      mensaje: 'Entrada registrada exitosamente.',
      movimiento: resMovimiento.rows[0],
      stock_mes_actual: resStockMensual.rows[0].stock_actual
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar entrada:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  } finally {
    client.release();
  }
};

module.exports = { registrarEntradaProducto };