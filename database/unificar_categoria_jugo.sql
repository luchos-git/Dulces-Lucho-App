-- unifica la categoría singular "Jugo" con la categoría oficial "Jugos" si la primera existe
-- no borra productos ni modifica otras categorías

USE dulces_lucho;
START TRANSACTION;

SET @id_jugos = (
  SELECT id FROM categorias
  WHERE LOWER(TRIM(nombre)) = 'jugos'
  LIMIT 1
);

SET @id_jugo = (
  SELECT id FROM categorias
  WHERE LOWER(TRIM(nombre)) = 'jugo'
  LIMIT 1
);

UPDATE productos
SET categoria_id = @id_jugos
WHERE categoria_id = @id_jugo
  AND @id_jugos IS NOT NULL;

DELETE FROM categorias
WHERE id = @id_jugo
  AND @id_jugos IS NOT NULL;

COMMIT;
