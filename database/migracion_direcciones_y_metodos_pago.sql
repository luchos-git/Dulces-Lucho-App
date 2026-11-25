-- Dulces Lucho: direcciones múltiples y medios de pago guardados.
-- Ejecutar una vez en phpMyAdmin > base dulces_lucho > SQL.
-- No guarda números completos de tarjeta ni códigos CVV.

USE dulces_lucho;

-- Las nuevas billeteras necesitan identificadores más largos que el ENUM antiguo.
ALTER TABLE usuarios
  MODIFY COLUMN metodo_pago_preferido VARCHAR(40) NULL;

ALTER TABLE ventas
  MODIFY COLUMN metodo_pago VARCHAR(40) NOT NULL,
  ADD COLUMN IF NOT EXISTS direccion_alias VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS direccion_destinatario VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS instrucciones_entrega VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS metodo_pago_usuario_id INT NULL;

ALTER TABLE pedidos_anticipados
  MODIFY COLUMN metodo_pago VARCHAR(40) NOT NULL;

-- Más medios que el administrador puede habilitar o deshabilitar.
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS pago_mercado_pago_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_cuenta_dni_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_modo_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_naranja_x_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_uala_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pago_transferencia_activo TINYINT(1) NOT NULL DEFAULT 1;

-- Varias direcciones por cuenta (Casa, Trabajo, familia, etc.).
CREATE TABLE IF NOT EXISTS direcciones_usuario (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  alias VARCHAR(50) NOT NULL,
  destinatario VARCHAR(120) NULL,
  direccion VARCHAR(200) NOT NULL,
  localidad VARCHAR(100) NOT NULL,
  detalle VARCHAR(500) NULL,
  es_predeterminada TINYINT(1) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_direcciones_usuario (usuario_id, activo)
);

-- Se guarda solo la referencia visual de la tarjeta: marca, últimos cuatro dígitos,
-- titular y vencimiento. Nunca se almacena PAN completo ni CVV.
CREATE TABLE IF NOT EXISTS metodos_pago_usuario (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  alias VARCHAR(80) NULL,
  marca VARCHAR(30) NULL,
  ultimos4 CHAR(4) NULL,
  titular VARCHAR(120) NULL,
  vencimiento_mes TINYINT NULL,
  vencimiento_anio SMALLINT NULL,
  es_predeterminado TINYINT(1) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_metodos_pago_usuario (usuario_id, activo)
);

-- Comprobaciones posteriores:
-- SHOW COLUMNS FROM ventas;
-- SHOW COLUMNS FROM configuracion_tienda;
-- SHOW TABLES LIKE 'direcciones_usuario';
-- SHOW TABLES LIKE 'metodos_pago_usuario';
