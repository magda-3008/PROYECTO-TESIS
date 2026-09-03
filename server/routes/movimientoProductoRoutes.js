const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      id_producto,
      tipo_movimiento,
      cantidad,
      observacion
    } = req.body;

    // ---------------- VALIDACIONES GENERALES ----------------

    if (!id_producto || !tipo_movimiento || cantidad === undefined) {
      throw new Error("Datos incompletos.");
    }

    const cantidadNum = Number(cantidad);

    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      throw new Error("La cantidad debe ser mayor a 0.");
    }

    const movimientosPermitidos = [
      "COMPRA",
      "PRODUCCION",
      "ENTRADA"
    ];

    if (!movimientosPermitidos.includes(tipo_movimiento)) {
      throw new Error("Tipo de movimiento no válido.");
    }

    // ---------------- FECHA DEL MOVIMIENTO ----------------

    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;

    // ---------------- OBTENER PRODUCTO ----------------

    const resProducto = await client.query(
      `
            SELECT
                p.id_producto,
                p.nombre,
                p.tipo,
                pr.stock_actual_pr,
                pr.costo_compra,
                pe.stock_actual_pe
            FROM producto p
            LEFT JOIN producto_reventa pr
                ON p.id_producto = pr.id_producto
            LEFT JOIN producto_elaborado pe
                ON p.id_producto = pe.id_producto
            WHERE p.id_producto = $1
            FOR UPDATE
            `,
      [id_producto]
    );

    if (resProducto.rows.length === 0) {
      throw new Error("Producto no encontrado.");
    }

    const producto = resProducto.rows[0];

    // ---------------- VALIDAR TIPO DE MOVIMIENTO ----------------

    if (
      tipo_movimiento === "COMPRA" &&
      producto.tipo !== "Reventa"
    ) {
      throw new Error(
        "El movimiento COMPRA solo puede registrarse para productos de tipo Reventa."
      );
    }

    if (
      tipo_movimiento === "PRODUCCION" &&
      producto.tipo !== "Elaborado"
    ) {
      throw new Error(
        "El movimiento PRODUCCION solo puede registrarse para productos de tipo Elaborado."
      );
    }

    // ---------------- OBTENER STOCK ACTUAL ----------------

    let stockActual;
    let costoUnitario;

    if (producto.tipo === "Reventa") {
      stockActual = Number(producto.stock_actual_pr || 0);
      costoUnitario = Number(producto.costo_compra || 0);
    } else if (producto.tipo === "Elaborado") {
      stockActual = Number(producto.stock_actual_pe || 0);

      const resCosto = await client.query(
        `
                SELECT costo_unitario_prod
                FROM v_productos_elaborados_costo_actual
                WHERE id_producto = $1
                `,
        [id_producto]
      );

      costoUnitario =
        resCosto.rows.length > 0
          ? Number(resCosto.rows[0].costo_unitario_prod || 0)
          : 0;
    } else {
      throw new Error("El producto tiene un tipo no válido.");
    }

    // ---------------- CALCULAR NUEVO STOCK ----------------

    const nuevoStock = stockActual + cantidadNum;

    // ---------------- ACTUALIZAR STOCK ----------------

    if (producto.tipo === "Reventa") {

      await client.query(
        `
                UPDATE producto_reventa
                SET stock_actual_pr = $1
                WHERE id_producto = $2
                `,
        [nuevoStock, id_producto]
      );

    } else {

      await client.query(
        `
                UPDATE producto_elaborado
                SET stock_actual_pe = $1
                WHERE id_producto = $2
                `,
        [nuevoStock, id_producto]
      );
    }

    // ---------------- REGISTRAR MOVIMIENTO ----------------

    const costoTotal = cantidadNum * costoUnitario;

    await client.query(
      `
            INSERT INTO movimiento_producto (
                id_producto,
                anio,
                mes,
                tipo_movimiento,
                cantidad,
                observacion,
                costo_unitario,
                costo_total
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
      [
        id_producto,
        anio,
        mes,
        tipo_movimiento,
        cantidadNum,
        observacion || null,
        costoUnitario,
        costoTotal
      ]
    );

    // ---------------- CONFIRMAR ----------------

    await client.query("COMMIT");

    res.json({
      mensaje: "Movimiento registrado correctamente.",
      nuevo_stock_actual: nuevoStock
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "Error al registrar movimiento de producto:",
      error
    );

    res.status(500).json({
      mensaje: error.message
    });

  } finally {
    client.release();
  }
});

module.exports = router;