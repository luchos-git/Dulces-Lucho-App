# prueba final

1. Hacer una copia de seguridad de la carpeta y de la base de datos.
2. En phpMyAdmin ejecutar una sola vez `database/migracion_imagenes_y_categorias.sql` sobre `dulces_lucho`.
3. En la terminal del backend ejecutar `npm start`.
4. En el navegador del celular abrir `http://10.0.20.95:3000/api/ping`.
5. Si responde JSON, abrir Expo Go y probar el formulario.
6. En categorías deben aparecer Bolsitas, Jugos y Combos y el botón `Agregar nueva categoría`.
7. Crear una categoría de prueba y comprobar que aparece en MySQL.
8. Publicar primero un producto sin fotos. Después probar otro con una, dos y tres fotos.
9. Confirmar que el carrusel cambia cada 1.5 segundos.
10. En el catálogo, tocar el nombre o la foto abre el detalle; tocar el precio no debe navegar.

No ejecutes el SQL de migración más de una vez. No reimportes el SQL completo porque elimina y recrea las tablas.
