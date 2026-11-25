-- Dulces Lucho: configuración persistente de la tienda y dirección de origen para calcular envíos.
-- Ejecutar en phpMyAdmin > base dulces_lucho > pestaña SQL.
-- No elimina ni reemplaza registros de usuarios, productos, ventas ni direcciones.

USE dulces_lucho;

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
  pago_mercado_pago_activo TINYINT(1) NOT NULL DEFAULT 1,
  pago_cuenta_dni_activo TINYINT(1) NOT NULL DEFAULT 1,
  pago_modo_activo TINYINT(1) NOT NULL DEFAULT 1,
  pago_naranja_x_activo TINYINT(1) NOT NULL DEFAULT 1,
  pago_uala_activo TINYINT(1) NOT NULL DEFAULT 1,
  pago_transferencia_activo TINYINT(1) NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Completa columnas si ya existía una versión anterior de la tabla.
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS localidad VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS descripcion VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS horario VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS condiciones_venta VARCHAR(1000) NULL,
  ADD COLUMN IF NOT EXISTS envio_habilitado TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS costo_envio_base DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pago_credito_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_debito_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_rapipago_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_mercado_pago_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_cuenta_dni_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_modo_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_naranja_x_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_uala_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_transferencia_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Crea el único registro de configuración sin pisar la dirección que ya pudiera estar cargada.
INSERT INTO configuracion_tienda (id, nombre)
VALUES (1, 'Dulces Lucho')
ON DUPLICATE KEY UPDATE id = VALUES(id);

-- Verificá el registro y que el administrador haya guardado la dirección/localidad.
SELECT id, nombre, direccion, localidad, envio_habilitado, costo_envio_base, actualizado_en
FROM configuracion_tienda
WHERE id = 1;
