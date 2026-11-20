-- Ejecutar una sola vez en phpMyAdmin sobre la base dulces_lucho.
-- Agrega almacenamiento para hasta tres URLs por producto.
USE dulces_lucho;

ALTER TABLE productos
  ADD COLUMN imagenes_json LONGTEXT NULL AFTER imagen_url;

-- Asegura las categorías principales sin duplicarlas.
INSERT IGNORE INTO categorias (nombre) VALUES ('Bolsitas'), ('Jugos'), ('Combos');
