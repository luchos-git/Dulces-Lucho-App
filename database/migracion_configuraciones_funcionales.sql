-- Dulces Lucho: configuraciones funcionales para clientes y administradores.
-- Ejecutar UNA SOLA VEZ (es repetible) sobre la base dulces_lucho desde phpMyAdmin > SQL.
-- No borra usuarios, productos, banners, ventas ni detalles existentes.

USE dulces_lucho;

-- Preferencias del cliente.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL AFTER email,
  ADD COLUMN IF NOT EXISTS direccion_entrega VARCHAR(200) NULL AFTER telefono,
  ADD COLUMN IF NOT EXISTS localidad_entrega VARCHAR(100) NULL AFTER direccion_entrega,
  ADD COLUMN IF NOT EXISTS metodo_pago_preferido ENUM('credito','debito','rapipago') NULL AFTER localidad_entrega,
  ADD COLUMN IF NOT EXISTS notificaciones_activas TINYINT(1) NOT NULL DEFAULT 1 AFTER metodo_pago_preferido;

-- Compatibilidad con bases donde todavía no se ejecutó la migración de pedidos.
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS estado_pedido ENUM('confirmado','preparando','en_camino','listo_para_retirar','entregado','cancelado') NOT NULL DEFAULT 'confirmado' AFTER estado;

-- Datos generales y políticas de la tienda. Un solo registro (id = 1).
CREATE TABLE IF NOT EXISTS configuracion_tienda (
  id INT UNSIGNED NOT NULL,
  nombre VARCHAR(120) NOT NULL DEFAULT 'Dulces Lucho',
  telefono VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  direccion VARCHAR(200) NULL,
  localidad VARCHAR(100) NULL,
  descripcion VARCHAR(500) NULL,
  horario VARCHAR(120) NULL,
  condiciones_venta VARCHAR(1000) NULL,
  envio_habilitado TINYINT(1) NOT NULL DEFAULT 1,
  costo_envio_base DECIMAL(10,2) NOT NULL DEFAULT 0,
  pago_credito_activo TINYINT(1) NOT NULL DEFAULT 1,
  pago_debito_activo TINYINT(1) NOT NULL DEFAULT 1,
  pago_rapipago_activo TINYINT(1) NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO configuracion_tienda (id, nombre) VALUES (1, 'Dulces Lucho');

-- Comprobaciones sugeridas:
-- SHOW COLUMNS FROM usuarios;
-- SHOW COLUMNS FROM ventas;
-- SELECT * FROM configuracion_tienda;
