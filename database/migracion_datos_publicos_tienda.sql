-- Dulces Lucho: configuración pública del local.
-- Ejecutar en phpMyAdmin > base dulces_lucho > SQL.
-- Es una migración aditiva y repetible: no elimina usuarios, productos, ventas ni pedidos.

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

-- Compatibilidad con instalaciones que ya tenían la tabla antigua de la tienda.
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS pago_mercado_pago_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_cuenta_dni_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_modo_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_naranja_x_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_uala_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_transferencia_activo TINYINT(1) NOT NULL DEFAULT 1;

INSERT IGNORE INTO configuracion_tienda (id, nombre) VALUES (1, 'Dulces Lucho');

-- Verificación: debe devolver el registro id=1 y las columnas direccion/localidad.
SELECT id, nombre, direccion, localidad, horario FROM configuracion_tienda WHERE id = 1;
