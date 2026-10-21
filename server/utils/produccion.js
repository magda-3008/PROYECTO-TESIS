"use strict";

function formatearCantidadMensaje(cantidad, unidad) {
    const valor = Number(cantidad);

    if (!Number.isFinite(valor)) {
        return `${cantidad} ${unidad}`;
    }

    if (Number.isInteger(valor)) {
        return `${valor} ${unidad}`;
    }

    if (valor % 1 === 0.5) {
        const entero = Math.floor(valor);

        if (entero === 0) {
            return `1/2 ${unidad}`;
        }

        return `${entero} 1/2 ${unidad}`;
    }

    return `${valor} ${unidad}`;
}

// Calcula cuánto se necesita consumir de cada ingrediente para producir una determinada cantidad de producto.
function calcularConsumoReceta(detallesReceta, cantidadProducir, cantidadProducidaBase) {
    const cantidad = Number(cantidadProducir);
    const base = Number(cantidadProducidaBase);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error("La cantidad a producir debe ser mayor que 0.");
    }
    if (!Number.isFinite(base) || base <= 0) {
        throw new Error("La cantidad producida base de la receta no es válida.");
    }
    if (!Array.isArray(detallesReceta) || detallesReceta.length === 0) {
        throw new Error("El producto no tiene ingredientes registrados en su receta.");
    }
    const factorProduccion = cantidad / base;
    return detallesReceta.map((detalle) => {
        const cantidadBase = Number(detalle.cantidad_utilizada);
        if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) {
            throw new Error(`La cantidad utilizada del ingrediente ${detalle.id_detalle_receta} no es válida.`);
        }
        const cantidadNecesaria = cantidadBase * factorProduccion;
        if (!Number.isFinite(cantidadNecesaria) || cantidadNecesaria <= 0) {
            throw new Error(`No fue posible calcular el consumo del ingrediente ${detalle.id_detalle_receta}.`);
        }
        return {
            id_detalle_receta: detalle.id_detalle_receta,
            id_ma: detalle.id_ma || null,
            id_producto_insumo: detalle.id_producto_insumo || null,
            cantidad_utilizada_base: cantidadBase,
            cantidad_necesaria: cantidadNecesaria,
            cantidad_ingresada: detalle.cantidad_ingresada,
            unidad_ingresada: detalle.unidad_ingresada
        };
    });
}
/**
 * Registra la primera producción de un producto elaborado
 * que acaba de ser creado.
 *
 * Esta función:
 * 1. Valida el producto y la cantidad.
 * 2. Calcula el consumo de la receta.
 * 3. Descuenta las materias primas utilizadas.
 * 4. Descuenta productos elaborados utilizados como insumos.
 * 5. Registra los movimientos de consumo.
 * 6. Aumenta producto.stock_actual del producto producido.
 * 7. Registra el movimiento de producción.
 *
 * IMPORTANTE:
 * El stock de productos elaborados se encuentra exclusivamente
 * en producto.stock_actual.
 */
async function registrarPrimeraProduccion(cliente, idProducto, detallesReceta, cantidadProducir, cantidadProducidaBase) {
    const cantidad = Number(cantidadProducir);
    const base = Number(cantidadProducidaBase);
    const idProductoNumerico = Number(idProducto);

    if (!Number.isInteger(idProductoNumerico) || idProductoNumerico <= 0) {
        throw new Error("El producto elaborado seleccionado no es válido.");
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error("La cantidad inicial del producto elaborado debe ser un número entero mayor que 0.");
    }
    if (!Number.isInteger(base) || base <= 0) {
        throw new Error("La cantidad producida base de la receta debe ser un número entero mayor que 0.");
    }

    const resultadoProducto = await cliente.query(`
        SELECT
            p.id_producto,
            p.nombre,
            p.tipo,
            p.stock_actual,
            pe.se_elabora_al_momento
        FROM producto p
        INNER JOIN producto_elaborado pe
            ON p.id_producto = pe.id_producto
        WHERE p.id_producto = $1
        FOR UPDATE OF p
        `,
        [idProductoNumerico]);
    if (resultadoProducto.rowCount === 0) {
        throw new Error("El producto elaborado no existe.");
    }
    const producto = resultadoProducto.rows[0];
    if (producto.tipo !== "Elaborado") {
        throw new Error("El producto seleccionado no es un producto elaborado.");
    }
    // Un producto elaborado al momento no acumula inventario de producto terminado.
    if (producto.se_elabora_al_momento === true) {
        throw new Error('Este producto se elabora al momento y no puede registrar una producción inicial.');
    }
    const nombreProducto = producto.nombre;

    const consumo = calcularConsumoReceta(detallesReceta, cantidad, base);

    for (const ingrediente of consumo) {
        if (ingrediente.id_ma !== null) {
            const resultadoMateriaPrima = await cliente.query(`
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
                [
                    Number(ingrediente.id_ma)
                ]);
            if (resultadoMateriaPrima.rowCount === 0) {
                throw new Error("Una de las materias primas de la receta no existe.");
            }
            const materiaPrima = resultadoMateriaPrima.rows[0];
            const stockActual = Number(materiaPrima.stock_actual_i);
            const cantidadNecesaria = Number(ingrediente.cantidad_necesaria);
            if (!Number.isFinite(stockActual) || stockActual < 0) {
                throw new Error(`El stock de "${materiaPrima.nombre}" no es válido.`);
            }
            if (stockActual < cantidadNecesaria) {
                throw new Error(`No hay suficiente stock de "${materiaPrima.nombre}" para realizar la producción`);
            }

            // Calcular costo unitario de la materia prima
            const costoTotalPaquete = Number(materiaPrima.costo_total_ingrediente || 0);
            const unidadesPorPaquete = Number(materiaPrima.unidad_por_paquete || 1);
            let costoUnitarioMP = 0;
            if (Number.isFinite(costoTotalPaquete) && Number.isFinite(unidadesPorPaquete) && unidadesPorPaquete > 0) {
                costoUnitarioMP = costoTotalPaquete / unidadesPorPaquete;
            }
            const costoTotalMP = cantidadNecesaria * costoUnitarioMP;

            // Descontar materia prima
            const resultadoDescuento = await cliente.query(`
                    UPDATE materia_prima_y_cd
                    SET stock_actual_i =
                        stock_actual_i - $1
                    WHERE id_ma = $2
                      AND stock_actual_i >= $1
                    RETURNING stock_actual_i
                    `,
                [
                    cantidadNecesaria,
                    Number(ingrediente.id_ma)
                ]);
            if (resultadoDescuento.rowCount === 0) {
                throw new Error(`No fue posible descontar la materia prima "${materiaPrima.nombre}".`);
            }

            // Registrar movimiento de consumo de MP
            await cliente.query(`
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
                    Number(ingrediente.id_ma),
                    cantidadNecesaria,
                    costoUnitarioMP,
                    costoTotalMP, `Consumo para producir ${cantidad} unidades de "${nombreProducto}".`
                ]);
        }

        else if (ingrediente.id_producto_insumo !== null) {
            const resultadoProductoInsumo = await cliente.query(`
                    SELECT
                        p.id_producto,
                        p.nombre,
                        p.tipo,
                        p.stock_actual,
                        pe.se_elabora_al_momento
                    FROM producto p
                    INNER JOIN producto_elaborado pe
                        ON p.id_producto = pe.id_producto
                    WHERE p.id_producto = $1
                    FOR UPDATE OF p
                    `,
                [
                    Number(ingrediente.id_producto_insumo)
                ]);
            if (resultadoProductoInsumo.rowCount === 0) {
                throw new Error("Uno de los productos elaborados utilizados como insumo no existe.");
            }
            const productoInsumo = resultadoProductoInsumo.rows[0];
            if (productoInsumo.tipo !== "Elaborado") {
                throw new Error(`El producto "${productoInsumo.nombre}" no puede utilizarse como insumo porque no es un producto elaborado.`);
            }
            // Un producto elaborado al momento no puede mantenerse como producto terminado en inventario,
            // por lo que no puede utilizarse como insumo almacenado.
            if (productoInsumo.se_elabora_al_momento === true) {
                throw new Error(`El producto "${productoInsumo.nombre}" se elabora al momento y no puede utilizarse como insumo almacenado.`);
            }
            const stockActual = Number(productoInsumo.stock_actual);
            const cantidadNecesaria = Number(ingrediente.cantidad_necesaria);
            if (!Number.isFinite(stockActual) || stockActual < 0) {
                throw new Error(`El stock del producto "${productoInsumo.nombre}" no es válido.`);
            }
            if (stockActual < cantidadNecesaria) {
                throw new Error(`No hay suficiente "${productoInsumo.nombre}" para realizar la producción. ` + `Stock disponible: ${stockActual}. ` + `Cantidad necesaria: ${cantidadNecesaria}.`);
            }

            const resultadoCostoInsumo = await cliente.query(`
                    SELECT
                        costo_unitario_prod
                    FROM v_productos_elaborados_costo_actual
                    WHERE id_producto = $1
                    `,
                [
                    Number(ingrediente.id_producto_insumo)
                ]);
            let costoUnitarioInsumo = 0;
            if (resultadoCostoInsumo.rowCount > 0) {
                costoUnitarioInsumo = Number(resultadoCostoInsumo.rows[0].costo_unitario_prod || 0);
            }
            const costoTotalInsumo = cantidadNecesaria * costoUnitarioInsumo;

            const resultadoDescuento = await cliente.query(`
                    UPDATE producto
                    SET stock_actual =
                        stock_actual - $1
                    WHERE id_producto = $2
                      AND stock_actual >= $1
                    RETURNING stock_actual
                    `,
                [
                    cantidadNecesaria,
                    Number(ingrediente.id_producto_insumo)
                ]);
            if (resultadoDescuento.rowCount === 0) {
                throw new Error(`No fue posible descontar el producto elaborado "${productoInsumo.nombre}".`);
            }

            await cliente.query(`
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
                    Number(ingrediente.id_producto_insumo),
                    cantidadNecesaria,
                    costoUnitarioInsumo,
                    costoTotalInsumo, `Consumo como insumo para producir ${cantidad} unidades de "${nombreProducto}".`
                ]);
        }
    }

    const resultadoCosto = await cliente.query(`
        SELECT
            costo_unitario_prod
        FROM v_productos_elaborados_costo_actual
        WHERE id_producto = $1
        `,
        [
            idProductoNumerico
        ]);
    let costoUnitario = 0;
    if (resultadoCosto.rowCount > 0) {
        costoUnitario = Number(resultadoCosto.rows[0].costo_unitario_prod);
        if (!Number.isFinite(costoUnitario)) {
            costoUnitario = 0;
        }
    }
    const costoTotalProduccion = costoUnitario * cantidad;

    const resultadoStock = await cliente.query(`
        UPDATE producto
        SET stock_actual =
            stock_actual + $1
        WHERE id_producto = $2
        RETURNING stock_actual
        `,
        [
            cantidad,
            idProductoNumerico
        ]);
    if (resultadoStock.rowCount === 0) {
        throw new Error("No fue posible actualizar el stock del producto producido.");
    }
    const nuevoStock = resultadoStock.rows[0].stock_actual;

    const resultadoMovimiento = await cliente.query(`
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
                'ENTRADA',
                $2,
                $3,
                $4,
                'PRODUCCION',
                $5
            )
            RETURNING *
            `,
        [
            idProductoNumerico,
            cantidad,
            costoUnitario,
            costoTotalProduccion, "Producción inicial registrada junto con el producto."
        ]);

    return {
        cantidadProducida: cantidad,
        stockActual: nuevoStock,
        costoUnitario: costoUnitario,
        costoTotal: costoTotalProduccion,
        consumo: consumo,
        movimiento: resultadoMovimiento.rows[0]
    };
}
module.exports = {
    calcularConsumoReceta,
    registrarPrimeraProduccion
};
