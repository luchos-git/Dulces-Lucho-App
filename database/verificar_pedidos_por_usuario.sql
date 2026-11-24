-- Consultas de verificación: no modifican datos.
-- Cambiá 1 por el ID del cliente que quieras revisar.
SET @usuario_id = 1;

-- Pedidos/comprobantes que pertenecen únicamente a esta cuenta.
SELECT
  v.id AS pedido_id,
  v.usuario_id,
  v.numero,
  v.fecha,
  v.estado_pedido,
  v.total
FROM ventas AS v
WHERE v.usuario_id = @usuario_id
ORDER BY v.fecha DESC, v.id DESC;

-- Detalle de los pedidos del mismo usuario.
SELECT
  v.usuario_id,
  v.id AS pedido_id,
  dv.id AS detalle_id,
  dv.producto_id,
  p.nombre AS producto,
  dv.cantidad,
  dv.precio_unitario
FROM ventas AS v
INNER JOIN detalle_ventas AS dv ON dv.venta_id = v.id
INNER JOIN productos AS p ON p.id = dv.producto_id
WHERE v.usuario_id = @usuario_id
ORDER BY v.id DESC, dv.id;

-- El esquema usa ventas.id como ID de pedido y detalle_ventas.venta_id como FK.
