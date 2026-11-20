# Pruebas del CRUD de productos con Thunder Client

Todas las pruebas se hacen desde la computadora mientras el backend está encendido.

## Consultar categorías

Método: `GET`

URL: `http://localhost:3000/api/categorias`

Devuelve las categorías disponibles para el formulario. El formulario solo permite seleccionar una de esta lista.

## Mostrar productos

Método: `GET`

URL: `http://localhost:3000/api/productos`

## Consultar un producto

Método: `GET`

URL: `http://localhost:3000/api/productos/1`

Reemplazá `1` por un ID real.

## Publicar un producto

Método: `POST`

URL: `http://localhost:3000/api/productos`

En Body elegí JSON:

```json
{
  "nombre": "Producto de prueba",
  "categoria": "Bolsitas",
  "descripcion": "Producto para probar el alta.",
  "precio": 1500,
  "imagenUrl": ""
}
```

## Modificar un producto

Método: `PUT`

URL: `http://localhost:3000/api/productos/1`

En Body elegí JSON:

```json
{
  "nombre": "Producto de prueba actualizado",
  "categoria": "Bolsitas",
  "descripcion": "Producto para probar la modificación.",
  "precio": 1600,
  "imagenUrl": ""
}
```

## Eliminar un producto

Método: `DELETE`

URL: `http://localhost:3000/api/productos/1`

La operación es una baja lógica: el producto deja de aparecer en el catálogo, pero no se borra físicamente de MySQL para no romper las ventas anteriores.

## Subir una imagen a ImgBB

Método: `POST`

URL: `http://localhost:3000/api/imagenes/producto`

En Body seleccioná `Form` y agregá un campo llamado `image`. Cambiá el tipo del campo a `File` y seleccioná una imagen de hasta 5 MB. No agregues manualmente el encabezado `Content-Type`.

La app móvil realiza esta misma operación automáticamente al guardar el formulario si seleccionaste una imagen.
