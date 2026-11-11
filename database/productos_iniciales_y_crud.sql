-- CRUD SQL de productos. La app usa estas mismas operaciones por API.
USE dulces_lucho;
INSERT INTO categorias(nombre) VALUES ('Alfajores'),('Chocolates'),('Caramelos'),('Bombones') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);
INSERT INTO productos(nombre,categoria_id,descripcion,precio,imagen_url) VALUES
('Alfajor de maicena',(SELECT id FROM categorias WHERE nombre='Alfajores'),'Alfajor suave con dulce de leche y coco.',1500,NULL),
('Alfajor de chocolate',(SELECT id FROM categorias WHERE nombre='Alfajores'),'Alfajor bañado en chocolate.',1600,NULL),
('Chocolate con almendras',(SELECT id FROM categorias WHERE nombre='Chocolates'),'Tableta con almendras enteras.',2500,NULL),
('Caramelos surtidos',(SELECT id FROM categorias WHERE nombre='Caramelos'),'Mix de distintos sabores.',950,NULL);
-- CREATE
INSERT INTO productos(nombre,categoria_id,descripcion,precio,imagen_url) VALUES('Producto nuevo',(SELECT id FROM categorias WHERE nombre='Alfajores'),'Descripción.',1000,'https://i.ibb.co/URL.jpg');
-- READ
SELECT p.id,p.nombre,c.nombre categoria,p.descripcion,p.precio,p.imagen_url FROM productos p JOIN categorias c ON c.id=p.categoria_id WHERE p.activo=1;
-- UPDATE
UPDATE productos SET nombre='Producto actualizado',descripcion='Nueva descripción',precio=1250,imagen_url='https://i.ibb.co/NUEVA.jpg' WHERE id=1;
-- DELETE lógico (conserva el historial de ventas)
UPDATE productos SET activo=0 WHERE id=1;
