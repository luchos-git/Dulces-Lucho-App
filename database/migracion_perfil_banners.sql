-- Migración para los datos del perfil y el carrusel de banners de Dulces Lucho.
-- Ejecutar sobre la base existente dulces_lucho desde phpMyAdmin > SQL.
-- Puede ejecutarse más de una vez en MariaDB: las columnas y la tabla se crean solo si faltan.

USE dulces_lucho;

-- Teléfono opcional del usuario.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL AFTER email;

-- Mantiene compatibilidad con registros antiguos y permite URLs algo más largas.
ALTER TABLE productos
  MODIFY COLUMN imagen_url VARCHAR(500) NULL;
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS imagenes_json LONGTEXT NULL AFTER imagen_url;

-- Cada fila representa una imagen del carrusel del inicio.
CREATE TABLE IF NOT EXISTS banners (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(120) NULL,
  imagen_url VARCHAR(500) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_banners_activo_orden (activo, orden, id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Comprobación al terminar:
-- SHOW COLUMNS FROM usuarios LIKE 'telefono';
-- SHOW COLUMNS FROM productos LIKE 'imagenes_json';
-- SHOW TABLES LIKE 'banners';
