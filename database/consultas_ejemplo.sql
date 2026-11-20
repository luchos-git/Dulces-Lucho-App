-- explicación del archivo: reúne consultas para revisar productos, usuarios, ventas, cupones y ejemplos de operaciones sql
-- =============================================================================
--  DULCES LUCHO — CONSULTAS DE EJEMPLO
--  Ejecutá primero dulces_lucho.sql. Cada consulta se puede correr por separado.
-- =============================================================================
USE dulces_lucho;

-- 1) Catálogo: productos activos con su categoría
SELECT p.id, p.nombre, c.nombre AS categoria, p.precio
FROM productos p
JOIN categorias c ON c.id = p.categoria_id
WHERE p.activo = 1
ORDER BY c.nombre, p.nombre;

-- 2) Ventas con el nombre del cliente
SELECT v.id, v.fecha, u.nombre AS cliente, v.total, v.metodo_pago, v.estado
FROM ventas v
JOIN usuarios u ON u.id = v.usuario_id
ORDER BY v.fecha DESC;

-- 3) Detalle completo de una venta (cambiá el 1 por el id que quieras)
SELECT v.id AS venta, p.nombre AS producto, d.cantidad, d.precio_unitario, d.subtotal
FROM detalle_ventas d
JOIN ventas v    ON v.id = d.venta_id
JOIN productos p ON p.id = d.producto_id
WHERE v.id = 1;

-- 4) Productos más vendidos (solo ventas no canceladas)
SELECT p.nombre, SUM(d.cantidad) AS unidades_vendidas, SUM(d.subtotal) AS facturado
FROM detalle_ventas d
JOIN ventas v    ON v.id = d.venta_id
JOIN productos p ON p.id = d.producto_id
WHERE v.estado <> 'cancelada'
GROUP BY p.id, p.nombre
ORDER BY unidades_vendidas DESC;

-- 5) Cuánto se vendió por medio de pago (solo ventas pagadas)
SELECT metodo_pago, COUNT(*) AS cantidad_de_ventas, SUM(total) AS total_vendido
FROM ventas
WHERE estado = 'pagada'
GROUP BY metodo_pago;

-- 6) Ventas pagadas por mes
SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes, COUNT(*) AS ventas, SUM(total) AS total_vendido
FROM ventas
WHERE estado = 'pagada'
GROUP BY mes
ORDER BY mes;

-- 7) Ventas pendientes de pago (Rapipago que todavía no se abonó)
SELECT v.id, u.nombre AS cliente, v.total, v.codigo_rapipago
FROM ventas v
JOIN usuarios u ON u.id = v.usuario_id
WHERE v.estado = 'pendiente';

-- 8) Cuántas veces se usó cada cupón
SELECT c.codigo, COUNT(v.id) AS veces_usado
FROM cupones c
LEFT JOIN ventas v ON v.cupon_id = c.id
GROUP BY c.id, c.codigo;

-- 9) Administradores registrados
SELECT id, nombre, email FROM usuarios WHERE rol = 'admin';

-- =============================================================================
--  ALTAS Y CAMBIOS
-- =============================================================================

-- Agregar un producto: NO se escribe el id, se autoincrementa solo
INSERT INTO productos (nombre, categoria_id, descripcion, precio)
VALUES ('Bolsita de prueba', (SELECT id FROM categorias WHERE nombre = 'Bolsitas'), 'Producto de prueba.', 999.00);

-- Cambiar el precio de un producto
UPDATE productos SET precio = 1600.00 WHERE nombre = 'Bolsita Smacks 3 obleas + alfajor';

-- Ocultar un producto de la app sin borrarlo (así las ventas viejas siguen intactas)
UPDATE productos SET activo = 0 WHERE nombre = 'Bolsita de prueba';

-- Marcar como pagada una venta de Rapipago cuando se abona
UPDATE ventas SET estado = 'pagada' WHERE id = 2;

-- =============================================================================
--  REGISTRAR UNA VENTA COMPLETA (en una transacción: o se guarda todo o nada)
--  Compra de 3 jugos Baggio con tarjeta de débito, retiro en el local, sin cupón.
-- =============================================================================
START TRANSACTION;

INSERT INTO ventas (usuario_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, con_envio)
VALUES ((SELECT id FROM usuarios WHERE email = 'cliente@dulceslucho.com'),
        2100.00, 0.00, 0.00, 2100.00, 'debito', 'pagada', 0);

INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
VALUES (LAST_INSERT_ID(), (SELECT id FROM productos WHERE nombre = 'Jugo Baggio'), 3, 700.00);

COMMIT;

-- =============================================================================
--  COSAS QUE LA BASE RECHAZA A PROPÓSITO (probalas para ver los errores)
-- =============================================================================
-- Un administrador sin clave única:
--   INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ('X', 'x@x.com', 'hash', 'admin');
-- Un email repetido:
--   INSERT INTO usuarios (nombre, email, password_hash) VALUES ('Y', 'cliente@dulceslucho.com', 'hash');
-- Un total que no coincide con subtotal - descuento + envío:
--   INSERT INTO ventas (usuario_id, subtotal, total, metodo_pago) VALUES (1, 1000, 5000, 'credito');
-- Un envío sin dirección:
--   INSERT INTO ventas (usuario_id, subtotal, total, metodo_pago, con_envio) VALUES (1, 1000, 1000, 'credito', 1);
