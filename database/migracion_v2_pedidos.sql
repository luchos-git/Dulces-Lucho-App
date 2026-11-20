-- explicación del archivo: actualiza una base de datos anterior para incorporar los campos necesarios para conservar el historial de pedidos
-- Ejecutá este archivo solo sobre una base creada con una versión anterior.
USE dulces_lucho;
ALTER TABLE ventas
  ADD COLUMN numero VARCHAR(20) NULL AFTER id,
  ADD COLUMN estado_pedido ENUM('confirmado','preparando','en_camino','listo_para_retirar','entregado','cancelado') NOT NULL DEFAULT 'confirmado' AFTER estado,
  ADD UNIQUE KEY uq_ventas_numero (numero);
-- Ejemplos: UPDATE ventas SET estado_pedido='en_camino' WHERE id=1;
--           UPDATE ventas SET estado_pedido='entregado' WHERE id=1;
