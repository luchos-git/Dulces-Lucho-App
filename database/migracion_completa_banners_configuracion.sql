-- Dulces Lucho: migración conjunta para banners y configuraciones.
-- Ejecutar en phpMyAdmin > Base dulces_lucho > SQL.
-- Es segura para los datos existentes: no elimina ni recrea usuarios, productos ni ventas.
-- Diseñada para MariaDB 10.4 (XAMPP).

USE dulces_lucho;

-- Datos de perfil y preferencias del cliente.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL AFTER email,
  ADD COLUMN IF NOT EXISTS direccion_entrega VARCHAR(200) NULL AFTER telefono,
  ADD COLUMN IF NOT EXISTS localidad_entrega VARCHAR(100) NULL AFTER direccion_entrega,
  ADD COLUMN IF NOT EXISTS metodo_pago_preferido ENUM('credito','debito','rapipago') NULL AFTER localidad_entrega,
  ADD COLUMN IF NOT EXISTS notificaciones_activas TINYINT(1) NOT NULL DEFAULT 1 AFTER metodo_pago_preferido;

-- Campos de historial/seguimiento de ventas.
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS estado_pedido ENUM('confirmado','preparando','en_camino','listo_para_retirar','entregado','cancelado') NOT NULL DEFAULT 'confirmado' AFTER estado;

-- URLs de imágenes de productos (no borra las fotos ya guardadas).
ALTER TABLE productos MODIFY COLUMN imagen_url VARCHAR(500) NULL;
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS imagenes_json LONGTEXT NULL AFTER imagen_url;

-- Carrusel de banners: un registro por imagen.
CREATE TABLE IF NOT EXISTS banners (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(120) NULL,
  imagen_url VARCHAR(500) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_banners_activo_orden (activo, orden, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos generales y preferencias de la tienda.
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

-- Comprobación manual opcional:
-- SHOW TABLES LIKE 'banners';
-- SHOW TABLES LIKE 'configuracion_tienda';
-- SHOW COLUMNS FROM usuarios;
-- SHOW COLUMNS FROM ventas;
