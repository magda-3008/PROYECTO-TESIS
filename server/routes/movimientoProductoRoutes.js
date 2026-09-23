const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
  calcularConsumoReceta
} = require("../utils/produccion");

//Ruta para registrar movimientos de productos
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

    if (!id_producto || !tipo_movimiento || !motivo || cantidad === undefined) {
      throw new Error("Datos incompletos.");
    }
    const cantidadNum = Number(cantidad);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      throw new Error("La cantidad debe ser mayor a 0.");
    }
    if (tipo_movimiento !== "ENTRADA") {
      throw new Error("Este endpoint solo permite registrar movimientos de entrada.");
    }
    const motivosPermitidos = ["COMPRA", "PRODUCCION", "AJUSTE", "OTRO"];
    if (!motivosPermitidos.includes(motivo)) {
      throw new Error("El motivo de entrada no es válido.");
    }

    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;

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
            `,
      [id_producto]);
    if (resProducto.rows.length === 0) {
      throw new Error("Producto no encontrado.");
    }
    const producto = resProducto.rows[0];

    if (motivo === "COMPRA" && producto.tipo !== "Reventa") {
      throw new Error("El motivo COMPRA solo puede registrarse para productos de tipo Reventa.");
    }
    if (motivo === "PRODUCCION" && producto.tipo !== "Elaborado") {
      throw new Error("El motivo PRODUCCION solo puede registrarse para productos de tipo Elaborado.");
    }

    let stockActual;
    let costoUnitario;

    if (producto.tipo === "Reventa") {
      stockActual = Number(producto.stock_actual_pr || 0);
      costoUnitario = Number(producto.costo_compra || 0);
    }

    else if (producto.tipo === "Elaborado") {
      stockActual = Number(producto.stock_actual_pe || 0);

      const resCosto = await client.query(`
                SELECT costo_unitario_prod
                FROM v_productos_elaborados_costo_actual
                WHERE id_producto = $1
                `,
        [id_producto]);
      costoUnitario = resCosto.rows.length > 0 ? Number(resCosto.rows[0].costo_unitario_prod || 0) : 0;

      if (motivo === "PRODUCCION") {

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

        const consumos = calcularConsumoReceta(resDetalles.rows, cantidadNum, receta.cantidad_producida_base);

        for (const consumo of consumos) {

          if (consumo.id_ma) {

            const resMateriaPrima = await client.query(
              `
            SELECT
                id_ma,
                nombre,
                stock_actual_i
            FROM materia_prima_y_cd
            WHERE id_ma = $1
            FOR UPDATE
            `,
              [consumo.id_ma]
            );

            if (resMateriaPrima.rows.length === 0) {
              throw new Error(
                `La materia prima con ID ${consumo.id_ma} no existe.`
              );
            }

            const materiaPrima = resMateriaPrima.rows[0];

            const stockActual = Number(
              materiaPrima.stock_actual_i || 0
            );

            const cantidadNecesaria = Number(
              consumo.cantidad_necesaria
            );

            console.log(
              `Verificando ${materiaPrima.nombre}:`
            );

            console.log(
              "Stock actual:",
              stockActual
            );

            console.log(
              "Cantidad necesaria:",
              cantidadNecesaria
            );


            if (stockActual < cantidadNecesaria) {

              throw new Error(
                `No hay suficiente "${materiaPrima.nombre}". ` +
                `Disponible: ${stockActual}, ` +
                `necesario: ${cantidadNecesaria}.`
              );
            }
          }


          else if (consumo.id_producto_insumo) {

            const resProductoInsumo = await client.query(
              `
            SELECT
                p.id_producto,
                p.nombre,
                pe.stock_actual_pe
            FROM producto p
            INNER JOIN producto_elaborado pe
                ON p.id_producto = pe.id_producto
            WHERE p.id_producto = $1
            FOR UPDATE OF pe
            `,
              [consumo.id_producto_insumo]
            );

            if (resProductoInsumo.rows.length === 0) {
              throw new Error(
                `El producto utilizado como insumo ` +
                `con ID ${consumo.id_producto_insumo} no existe.`
              );
            }

            const productoInsumo =
              resProductoInsumo.rows[0];

            const stockActual = Number(
              productoInsumo.stock_actual_pe || 0
            );

            const cantidadNecesaria = Number(
              consumo.cantidad_necesaria
            );

            if (stockActual < cantidadNecesaria) {

              throw new Error(
                `No hay suficiente "${productoInsumo.nombre}". ` +
                `Disponible: ${stockActual}, ` +
                `necesario: ${cantidadNecesaria}.`
              );
            }
          }
        }

        // Descontar los insumos utilizados en la producción
        for (const consumo of consumos) {

          const cantidadNecesaria = Number(
            consumo.cantidad_necesaria
          );

          if (consumo.id_ma) {

            const resultadoDescuento = await client.query(
              `
                UPDATE materia_prima_y_cd
                SET stock_actual_i = stock_actual_i - $1
                WHERE id_ma = $2
                  AND stock_actual_i >= $1
                `,
              [
                cantidadNecesaria,
                consumo.id_ma
              ]
            );

            if (resultadoDescuento.rowCount === 0) {
              throw new Error(
                `No fue posible descontar la materia prima con ID ${consumo.id_ma}.`
              );
            }

            console.log(
              `Descontada materia prima ID ${consumo.id_ma}: ${cantidadNecesaria}`
            );
          }

          else if (consumo.id_producto_insumo) {

            await client.query(
              `
            UPDATE producto_elaborado
            SET stock_actual_pe = stock_actual_pe - $1
            WHERE id_producto = $2
            `,
              [
                cantidadNecesaria,
                consumo.id_producto_insumo
              ]
            );

            console.log(
              `Descontado producto insumo ID ${consumo.id_producto_insumo}: ${cantidadNecesaria}`
            );
          }
        }
      }
    }

    else {
      throw new Error("El producto tiene un tipo no válido.");
    }

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

    const costoTotal = cantidadNum * costoUnitario;

    await client.query(`
            INSERT INTO movimiento_producto (
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

    await client.query("COMMIT");
    res.json({
      mensaje: "Entrada registrada correctamente.",
      nuevo_stock_actual: nuevoStock
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al registrar movimiento de producto:", error);
    res.status(500).json({
      mensaje: error.message
    });
  } finally {
    client.release();
  }
});
module.exports = router;
