# actualización de categorías e imágenes

si la base `dulces_lucho` ya existe, abrí phpMyAdmin, seleccioná esa base, entrá en SQL y ejecutá el archivo `migracion_imagenes_y_categorias.sql` una sola vez.

esto agrega `productos.imagenes_json`, que permite guardar hasta tres URLs por producto, y asegura las categorías principales `Bolsitas`, `Jugos` y `Combos`. Las categorías nuevas se agregan desde el formulario de administración y quedan guardadas en MySQL.

para una instalación nueva, `dulces_lucho.sql` ya incluye la columna.
