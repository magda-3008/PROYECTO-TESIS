function calcularConsumoReceta(
    detallesReceta,
    cantidadProducir,
    cantidadProducidaBase
) {
    const cantidad = Number(cantidadProducir);
    const base = Number(cantidadProducidaBase);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error(
            "La cantidad a producir debe ser mayor que 0."
        );
    }

    if (!Number.isFinite(base) || base <= 0) {
        throw new Error(
            "La cantidad producida base de la receta no es válida."
        );
    }

    if (!Array.isArray(detallesReceta) || detallesReceta.length === 0) {
        throw new Error(
            "El producto no tiene ingredientes registrados en su receta."
        );
    }

    const factorProduccion = cantidad / base;

    return detallesReceta.map((detalle) => {
        const cantidadBase = Number(detalle.cantidad_utilizada);

        if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) {
            throw new Error(
                `La cantidad utilizada del ingrediente ${detalle.id_detalle_receta} no es válida.`
            );
        }

        const cantidadNecesaria =
            cantidadBase * factorProduccion;

        if (
            !Number.isFinite(cantidadNecesaria) ||
            cantidadNecesaria <= 0
        ) {
            throw new Error(
                `No fue posible calcular el consumo del ingrediente ${detalle.id_detalle_receta}.`
            );
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


//Registra la primera producción de un producto elaborado que se acaba de insertar al sistema:
//esto sucede debido a que un producto elaborado solo se inserta cuando ya ha sido producido por primera vez
async function registrarPrimeraProduccion(
    cliente,
    idProducto,
    detallesReceta,
    cantidadProducir,
    cantidadProducidaBase
) {
    const cantidad = Number(cantidadProducir);
    const base = Number(cantidadProducidaBase);
    const idProductoNumerico = Number(idProducto);

    if (!Number.isFinite(idProductoNumerico) || idProductoNumerico <= 0) {
        throw new Error(
            "El producto elaborado seleccionado no es válido."
        );
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error(
            "La cantidad inicial del producto elaborado debe ser mayor que 0."
        );
    }

    if (!Number.isFinite(base) || base <= 0) {
        throw new Error(
            "La cantidad producida base de la receta no es válida."
        );
    }

    const consumo = calcularConsumoReceta(
        detallesReceta,
        cantidad,
        base
    );

    for (const ingrediente of consumo) {

        //Materia prima
        if (ingrediente.id_ma !== null) {

            const resultadoMateriaPrima = await cliente.query(`
                SELECT
                    id_ma,
                    nombre,
                    stock_actual_i
                FROM materia_prima_y_cd
                WHERE id_ma = $1
                FOR UPDATE;
            `, [
                Number(ingrediente.id_ma)
            ]);

            if (resultadoMateriaPrima.rowCount === 0) {
                throw new Error(
                    "Una de las materias primas de la receta no existe."
                );
            }

            const materiaPrima =
                resultadoMateriaPrima.rows[0];

            const stockActual =
                Number(materiaPrima.stock_actual_i);

            const cantidadNecesaria =
                Number(ingrediente.cantidad_necesaria);

            if (
                !Number.isFinite(stockActual) ||
                stockActual < 0
            ) {
                throw new Error(
                    `El stock de "${materiaPrima.nombre}" no es válido.`
                );
            }

            if (stockActual < cantidadNecesaria) {
                throw new Error(
                    `No hay suficiente "${materiaPrima.nombre}" para realizar la producción. ` +
                    `Stock disponible: ${stockActual}. ` +
                    `Cantidad necesaria: ${cantidadNecesaria}.`
                );
            }

            const resultadoDescuento = await cliente.query(`
                UPDATE materia_prima_y_cd
                SET stock_actual_i = stock_actual_i - $1
                WHERE id_ma = $2
                  AND stock_actual_i >= $1
                RETURNING stock_actual_i;
            `, [
                cantidadNecesaria,
                Number(ingrediente.id_ma)
            ]);

            if (resultadoDescuento.rowCount === 0) {
                throw new Error(
                    `No fue posible descontar la materia prima "${materiaPrima.nombre}".`
                );
            }
        }

        //Producto elaborado como insumo
        else if (ingrediente.id_producto_insumo !== null) {

            const resultadoProductoInsumo =
                await cliente.query(`
                    SELECT
                        p.id_producto,
                        p.nombre,
                        p.tipo,
                        pe.stock_actual_pe
                    FROM producto p
                    INNER JOIN producto_elaborado pe
                        ON p.id_producto = pe.id_producto
                    WHERE p.id_producto = $1
                    FOR UPDATE OF pe;
                `, [
                    Number(ingrediente.id_producto_insumo)
                ]);

            if (resultadoProductoInsumo.rowCount === 0) {
                throw new Error(
                    "Uno de los productos elaborados utilizados como insumo no existe."
                );
            }

            const productoInsumo =
                resultadoProductoInsumo.rows[0];

            if (productoInsumo.tipo !== "Elaborado") {
                throw new Error(
                    `El producto "${productoInsumo.nombre}" no puede utilizarse como insumo porque no es un producto elaborado.`
                );
            }

            const stockActual =
                Number(productoInsumo.stock_actual_pe);

            const cantidadNecesaria =
                Number(ingrediente.cantidad_necesaria);

            if (
                !Number.isFinite(stockActual) ||
                stockActual < 0
            ) {
                throw new Error(
                    `El stock del producto "${productoInsumo.nombre}" no es válido.`
                );
            }

            if (stockActual < cantidadNecesaria) {
                throw new Error(
                    `No hay suficiente "${productoInsumo.nombre}" para realizar la producción. ` +
                    `Stock disponible: ${stockActual}. ` +
                    `Cantidad necesaria: ${cantidadNecesaria}.`
                );
            }

            const resultadoDescuento =
                await cliente.query(`
                    UPDATE producto_elaborado
                    SET stock_actual_pe = stock_actual_pe - $1
                    WHERE id_producto = $2
                      AND stock_actual_pe >= $1
                    RETURNING stock_actual_pe;
                `, [
                    cantidadNecesaria,
                    Number(ingrediente.id_producto_insumo)
                ]);

            if (resultadoDescuento.rowCount === 0) {
                throw new Error(
                    `No fue posible descontar el producto elaborado "${productoInsumo.nombre}".`
                );
            }
        }
    }

    //Obtener costo unitario del producto
    const resultadoCosto = await cliente.query(`
        SELECT costo_unitario_prod
        FROM v_productos_elaborados_costo_actual
        WHERE id_producto = $1;
    `, [
        idProductoNumerico
    ]);

    let costoUnitario = 0;

    if (resultadoCosto.rowCount > 0) {
        costoUnitario =
            Number(resultadoCosto.rows[0].costo_unitario_prod);

        if (!Number.isFinite(costoUnitario)) {
            costoUnitario = 0;
        }
    }


    const resultadoMovimiento = await cliente.query(`
        INSERT INTO movimiento_producto (
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
        VALUES (
            $1,
            CURRENT_TIMESTAMP,
            EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::integer,
            EXTRACT(MONTH FROM CURRENT_TIMESTAMP)::integer,
            'ENTRADA',
            $2,
            $3,
            $4,
            'PRODUCCION',
            $5
        )
        RETURNING *;
    `, [
        idProductoNumerico,
        cantidad,
        costoUnitario,
        costoUnitario * cantidad,
        "Producción inicial registrada junto con el producto."
    ]);


    return {
        cantidadProducida: cantidad,
        costoUnitario,
        costoTotal: costoUnitario * cantidad,
        consumo,
        movimiento: resultadoMovimiento.rows[0]
    };
}


module.exports = {
    calcularConsumoReceta,
    registrarPrimeraProduccion
};