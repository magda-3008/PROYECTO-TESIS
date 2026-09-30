const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
  calcularConsumoReceta
} = require("../utils/produccion");
// =========================================================
// RUTA PARA REGISTRAR MOVIMIENTOS DE PRODUCTOS
// =========================================================
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      id_producto,
      tipo_movimiento,
      motivo,
      cantidad,
      observacion
    } = req.body;
    // =====================================================
    // VALIDACIONES GENERALES
    // =====================================================
    if (!id_producto || !tipo_movimiento || !motivo || cantidad === undefined) {
      throw new Error("Datos incompletos.");
    }
    const cantidadNum = Number(cantidad);
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      throw new Error("La cantidad debe ser mayor a 0.");
    }
    // Actualmente este endpoint registra ENTRADAS.
    if (tipo_movimiento !== "ENTRADA") {
      throw new Error("Este endpoint solo permite registrar movimientos de entrada.");
    }
    // =====================================================
    // MOTIVOS PERMITIDOS
    // =====================================================
    const motivosPermitidos = ["COMPRA", "PRODUCCION", "AJUSTE", "OTRO"];
    if (!motivosPermitidos.includes(motivo)) {
      throw new Error("El motivo de entrada no es válido.");
    }
    // =====================================================
    // FECHA DEL MOVIMIENTO
    // =====================================================
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;
    // =====================================================
    // OBTENER PRODUCTO
    // =====================================================
    const resProducto = await client.query(`
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
    FOR UPDATE OF p
    `, [id_producto]);
    if (resProducto.rows.length === 0) {
      throw new Error("Producto no encontrado.");
    }
    const producto = resProducto.rows[0];
    // =====================================================
    // VALIDAR COMPATIBILIDAD DEL MOTIVO
    // =====================================================
    if (motivo === "COMPRA" && producto.tipo !== "Reventa") {
      throw new Error("El motivo COMPRA solo puede registrarse para productos de tipo Reventa.");
    }
    if (motivo === "PRODUCCION" && producto.tipo !== "Elaborado") {
      throw new Error("El motivo PRODUCCION solo puede registrarse para productos de tipo Elaborado.");
    }
    // =====================================================
    // VARIABLES DEL PRODUCTO PRINCIPAL
    // =====================================================
    let stockActual;
    let costoUnitario;
    // =====================================================
    // PRODUCTO DE REVENTA
    // =====================================================
    if (producto.tipo === "Reventa") {
      stockActual = Number(producto.stock_actual_pr || 0);
      costoUnitario = Number(producto.costo_compra || 0);
    }
    // =====================================================
    // PRODUCTO ELABORADO
    // =====================================================
    else if (producto.tipo === "Elaborado") {
      stockActual = Number(producto.stock_actual_pe || 0);
      // -------------------------------------------------
      // OBTENER COSTO ACTUAL DEL PRODUCTO ELABORADO
      // -------------------------------------------------
      const resCosto = await client.query(`
                SELECT
                    costo_unitario_prod

                FROM v_productos_elaborados_costo_actual

                WHERE id_producto = $1
                `,
        [id_producto]);
      costoUnitario = resCosto.rows.length > 0 ? Number(resCosto.rows[0].costo_unitario_prod || 0) : 0;
      // =================================================
      // PRODUCCIÓN DE PRODUCTO ELABORADO
      // =================================================
      if (motivo === "PRODUCCION") {
        // =============================================
        // OBTENER RECETA
        // =============================================
        const resReceta = await client.query(`
                    SELECT
                        id_receta,
                        cantidad_producida_base

                    FROM receta

                    WHERE id_producto = $1

                    LIMIT 1
                    `,
          [id_producto]);
        if (resReceta.rows.length === 0) {
          throw new Error("El producto elaborado no tiene una receta registrada.");
        }
        const receta = resReceta.rows[0];
        // =============================================
        // OBTENER DETALLES DE RECETA
        // =============================================
        const resDetalles = await client.query(`
                    SELECT
                        id_detalle_receta,
                        id_receta,
                        id_ma,
                        id_producto_insumo,
                        cantidad_utilizada,
                        cantidad_ingresada,
                        unidad_ingresada

                    FROM detalle_receta

                    WHERE id_receta = $1

                    ORDER BY id_detalle_receta
                    `,
          [receta.id_receta]);
        if (resDetalles.rows.length === 0) {
          throw new Error("La receta no tiene ingredientes registrados.");
        }
        // =============================================
        // CALCULAR CONSUMOS
        // =============================================
        const consumos = calcularConsumoReceta(resDetalles.rows, cantidadNum, receta.cantidad_producida_base);
        // =================================================
        // PRIMERA FASE:
        // VALIDAR TODO EL STOCK ANTES DE DESCONTAR
        // =================================================
        for (const consumo of consumos) {
          // =============================================
          // MATERIA PRIMA
          // =============================================
          if (consumo.id_ma) {
            const resMateriaPrima = await client.query(`
                                SELECT
                                    id_ma,
                                    nombre,
                                    stock_actual_i

                                FROM materia_prima_y_cd

                                WHERE id_ma = $1

                                FOR UPDATE
                                `,
              [consumo.id_ma]);
            if (resMateriaPrima.rows.length === 0) {
              throw new Error(`La materia prima con ID ${consumo.id_ma} no existe.`);
            }
            const materiaPrima = resMateriaPrima.rows[0];
            const stockMP = Number(materiaPrima.stock_actual_i || 0);
            const cantidadNecesaria = Number(consumo.cantidad_necesaria);
            if (!Number.isFinite(stockMP) || stockMP < 0) {
              throw new Error(`El stock de "${materiaPrima.nombre}" no es válido.`);
            }
            if (stockMP < cantidadNecesaria) {
              throw new Error(`No hay suficiente "${materiaPrima.nombre}". ` + `Disponible: ${stockMP}, ` + `necesario: ${cantidadNecesaria}.`);
            }
          }
          // =============================================
          // PRODUCTO ELABORADO COMO INSUMO
          // =============================================
          else if (consumo.id_producto_insumo) {
            const resProductoInsumo = await client.query(`
                                SELECT
                                    p.id_producto,
                                    p.nombre,
                                    p.tipo,
                                    pe.stock_actual_pe

                                FROM producto p

                                INNER JOIN producto_elaborado pe
                                    ON p.id_producto = pe.id_producto

                                WHERE p.id_producto = $1

                                FOR UPDATE OF pe
                                `,
              [
                consumo.id_producto_insumo
              ]);
            if (resProductoInsumo.rows.length === 0) {
              throw new Error(`El producto utilizado como insumo ` + `con ID ${consumo.id_producto_insumo} no existe.`);
            }
            const productoInsumo = resProductoInsumo.rows[0];
            if (productoInsumo.tipo !== "Elaborado") {
              throw new Error(`El producto "${productoInsumo.nombre}" ` + `no puede utilizarse como insumo porque ` + `no es un producto elaborado.`);
            }
            const stockProductoInsumo = Number(productoInsumo.stock_actual_pe || 0);
            const cantidadNecesaria = Number(consumo.cantidad_necesaria);
            if (!Number.isFinite(stockProductoInsumo) || stockProductoInsumo < 0) {
              throw new Error(`El stock del producto "${productoInsumo.nombre}" no es válido.`);
            }
            if (stockProductoInsumo < cantidadNecesaria) {
              throw new Error(`No hay suficiente "${productoInsumo.nombre}". ` + `Disponible: ${stockProductoInsumo}, ` + `necesario: ${cantidadNecesaria}.`);
            }
          }
        }
        // =================================================
        // SEGUNDA FASE:
        // DESCONTAR Y REGISTRAR CONSUMOS
        // =================================================
        for (const consumo of consumos) {
          const cantidadNecesaria = Number(consumo.cantidad_necesaria);
          // =================================================
          // CONSUMO DE MATERIA PRIMA
          // =================================================
          if (consumo.id_ma) {
            // ---------------------------------------------
            // Obtener datos de costo de la materia prima
            // ---------------------------------------------
            const resMateriaPrima = await client.query(`
                                SELECT
                                    id_ma,
                                    nombre,
                                    stock_actual_i,
                                    costo_total_ingrediente,
                                    unidad_por_paquete

                                FROM materia_prima_y_cd

                                WHERE id_ma = $1

                                FOR UPDATE
                                `,
              [consumo.id_ma]);
            if (resMateriaPrima.rows.length === 0) {
              throw new Error(`La materia prima con ID ${consumo.id_ma} no existe.`);
            }
            const materiaPrima = resMateriaPrima.rows[0];
            // ---------------------------------------------
            // Calcular costo unitario de la MP
            // ---------------------------------------------
            const costoTotalPaquete = Number(materiaPrima.costo_total_ingrediente || 0);
            const unidadesPorPaquete = Number(materiaPrima.unidad_por_paquete || 1);
            let costoUnitarioMP = 0;
            if (Number.isFinite(costoTotalPaquete) && Number.isFinite(unidadesPorPaquete) && unidadesPorPaquete > 0) {
              costoUnitarioMP = costoTotalPaquete / unidadesPorPaquete;
            }
            const costoTotalMP = cantidadNecesaria * costoUnitarioMP;
            // ---------------------------------------------
            // Descontar stock
            // ---------------------------------------------
            const resultadoDescuento = await client.query(`
                                UPDATE materia_prima_y_cd

                                SET stock_actual_i =
                                    stock_actual_i - $1

                                WHERE id_ma = $2

                                  AND stock_actual_i >= $1

                                RETURNING stock_actual_i
                                `,
              [
                cantidadNecesaria,
                consumo.id_ma
              ]);
            if (resultadoDescuento.rowCount === 0) {
              throw new Error(`No fue posible descontar la materia prima "${materiaPrima.nombre}".`);
            }
            // ---------------------------------------------
            // Registrar movimiento de consumo de MP
            // ---------------------------------------------
            await client.query(`
                            INSERT INTO movimiento_materia_prima
                            (
                                id_ma,
                                fecha,
                                anio,
                                mes,
                                tipo_movimiento,
                                cantidad,
                                costo_unitario,
                                costo_total,
                                motivo,
                                observacion
                            )

                            VALUES
                            (
                                $1,
                                CURRENT_TIMESTAMP,
                                EXTRACT(
                                    YEAR FROM CURRENT_TIMESTAMP
                                )::integer,

                                EXTRACT(
                                    MONTH FROM CURRENT_TIMESTAMP
                                )::integer,

                                'SALIDA',
                                $2,
                                $3,
                                $4,
                                'CONSUMO',
                                $5
                            )
                            `,
              [
                Number(consumo.id_ma),
                cantidadNecesaria,
                costoUnitarioMP,
                costoTotalMP, `Consumo para producir ${cantidadNum} unidades de "${producto.nombre}".`
              ]);
            console.log(`Descontada materia prima ID ${consumo.id_ma}: ${cantidadNecesaria}`);
          }
          // =================================================
          // CONSUMO DE PRODUCTO ELABORADO
          // =================================================
          else if (consumo.id_producto_insumo) {
            // ---------------------------------------------
            // Obtener producto insumo y su costo
            // ---------------------------------------------
            const resProductoInsumo = await client.query(`
                                SELECT
                                    p.id_producto,
                                    p.nombre,
                                    p.tipo,
                                    pe.stock_actual_pe

                                FROM producto p

                                INNER JOIN producto_elaborado pe
                                    ON p.id_producto = pe.id_producto

                                WHERE p.id_producto = $1

                                FOR UPDATE OF pe
                                `,
              [
                consumo.id_producto_insumo
              ]);
            if (resProductoInsumo.rows.length === 0) {
              throw new Error(`El producto utilizado como insumo ` + `con ID ${consumo.id_producto_insumo} no existe.`);
            }
            const productoInsumo = resProductoInsumo.rows[0];
            // ---------------------------------------------
            // Obtener costo del producto insumo
            // ---------------------------------------------
            const resCostoInsumo = await client.query(`
                                SELECT
                                    costo_unitario_prod

                                FROM v_productos_elaborados_costo_actual

                                WHERE id_producto = $1
                                `,
              [
                consumo.id_producto_insumo
              ]);
            let costoUnitarioInsumo = 0;
            if (resCostoInsumo.rows.length > 0) {
              costoUnitarioInsumo = Number(resCostoInsumo.rows[0].costo_unitario_prod || 0);
            }
            const costoTotalInsumo = cantidadNecesaria * costoUnitarioInsumo;
            // ---------------------------------------------
            // Descontar stock del producto insumo
            // ---------------------------------------------
            const resultadoDescuento = await client.query(`
                                UPDATE producto_elaborado

                                SET stock_actual_pe =
                                    stock_actual_pe - $1

                                WHERE id_producto = $2

                                  AND stock_actual_pe >= $1

                                RETURNING stock_actual_pe
                                `,
              [
                cantidadNecesaria,
                consumo.id_producto_insumo
              ]);
            if (resultadoDescuento.rowCount === 0) {
              throw new Error(`No fue posible descontar el producto elaborado "${productoInsumo.nombre}".`);
            }
            // ---------------------------------------------
            // Registrar movimiento del producto insumo
            // ---------------------------------------------
            await client.query(`
                            INSERT INTO movimiento_producto
                            (
                                id_producto,
                                fecha,
                                anio,
                                mes,
                                tipo_movimiento,
                                cantidad,
                                costo_unitario,
                                costo_total,
                                motivo,
                                observacion
                            )

                            VALUES
                            (
                                $1,
                                CURRENT_TIMESTAMP,
                                EXTRACT(
                                    YEAR FROM CURRENT_TIMESTAMP
                                )::integer,

                                EXTRACT(
                                    MONTH FROM CURRENT_TIMESTAMP
                                )::integer,

                                'SALIDA',
                                $2,
                                $3,
                                $4,
                                'CONSUMO',
                                $5
                            )
                            `,
              [
                Number(consumo.id_producto_insumo),
                cantidadNecesaria,
                costoUnitarioInsumo,
                costoTotalInsumo, `Consumo como insumo para producir ${cantidadNum} unidades de "${producto.nombre}".`
              ]);
            console.log(`Descontado producto insumo ID ${consumo.id_producto_insumo}: ${cantidadNecesaria}`);
          }
        }
      }
    }
    // =====================================================
    // VALIDAR TIPO DE PRODUCTO
    // =====================================================
    else {
      throw new Error("El producto tiene un tipo no válido.");
    }
    // =====================================================
    // ACTUALIZAR STOCK DEL PRODUCTO PRINCIPAL
    // =====================================================
    const nuevoStock = stockActual + cantidadNum;
    if (producto.tipo === "Reventa") {
      await client.query(`
                UPDATE producto_reventa

                SET stock_actual_pr = $1

                WHERE id_producto = $2
                `,
        [
          nuevoStock,
          id_producto
        ]);
    } else {
      await client.query(`
                UPDATE producto_elaborado

                SET stock_actual_pe = $1

                WHERE id_producto = $2
                `,
        [
          nuevoStock,
          id_producto
        ]);
    }
    // =====================================================
    // CALCULAR COSTO TOTAL DEL MOVIMIENTO PRINCIPAL
    // =====================================================
    const costoTotal = cantidadNum * costoUnitario;
    // =====================================================
    // REGISTRAR MOVIMIENTO DEL PRODUCTO PRINCIPAL
    // =====================================================
    await client.query(`
            INSERT INTO movimiento_producto
            (
                id_producto,
                anio,
                mes,
                tipo_movimiento,
                motivo,
                cantidad,
                observacion,
                costo_unitario,
                costo_total
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9
            )
            `,
      [
        id_producto,
        anio,
        mes,
        tipo_movimiento,
        motivo,
        cantidadNum,
        observacion || null,
        costoUnitario,
        costoTotal
      ]);
    // =====================================================
    // CONFIRMAR TRANSACCIÓN
    // =====================================================
    await client.query("COMMIT");
    // =====================================================
    // RESPUESTA
    // =====================================================
    res.json({
      mensaje: "Entrada registrada correctamente.",
      nuevo_stock_actual: nuevoStock
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al registrar movimiento de producto:", error);
    res.status(500).json({
      mensaje: error.message || "No se pudo registrar el movimiento."
    });
  } finally {
    client.release();
  }
});
module.exports = router;
