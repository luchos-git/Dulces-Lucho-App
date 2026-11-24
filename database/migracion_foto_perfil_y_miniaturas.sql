-- Dulces Lucho: foto de perfil persistente y URLs para miniaturas de productos.
-- Ejecutar en phpMyAdmin > Base dulces_lucho > SQL.
-- Es compatible con MariaDB y no elimina ni modifica registros existentes.

USE dulces_lucho;

-- Asegura el teléfono (necesario para el perfil) y agrega la URL de la foto.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL AFTER email;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil_url VARCHAR(1000) NULL AFTER telefono;

-- Evita truncar URLs de ImgBB. La galería completa se conserva en imagenes_json.
ALTER TABLE productos
  MODIFY COLUMN imagen_url VARCHAR(1000) NULL;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS imagenes_json LONGTEXT NULL AFTER imagen_url;

-- Verificación opcional:
-- SHOW COLUMNS FROM usuarios LIKE 'foto_perfil_url';
-- SHOW COLUMNS FROM productos LIKE 'imagen_url';
-- SHOW COLUMNS FROM productos LIKE 'imagenes_json';
