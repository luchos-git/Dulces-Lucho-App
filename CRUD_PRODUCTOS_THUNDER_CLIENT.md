# CRUD de productos - Dulces Lucho

Esta guía muestra cómo probar las cuatro operaciones del catálogo desde Thunder Client. El backend debe estar iniciado en `http://localhost:3000` y MySQL debe estar encendido.

## 1. consultar todos los productos (READ)

Método: `GET`

URL: `http://localhost:3000/api/productos`

No requiere Body. Devuelve los productos activos del catálogo.

## 2. consultar un producto (READ por id)

Método: `GET`

URL: `http://localhost:3000/api/productos/1`

Reemplazá `1` por el id real. Devuelve un solo producto activo.

## 3. publicar un producto (CREATE)

Método: `POST`

URL: `http://localhost:3000/api/productos`

En Body elegí `JSON` y usá un ejemplo como este:

```json
{
  "nombre": "Jugo de prueba",
  "categoria": "Jugos",
  "descripcion": "Producto de prueba para el CRUD",
  "precio": 850,
  "imagenUrl": ""
}
```

Las categorías disponibles son exactamente `Bolsitas`, `Jugos` y `Combos`. La imagen puede quedar vacía o se puede usar la URL devuelta por `POST /api/imagenes/producto` después de subir una imagen.

## 4. actualizar un producto (UPDATE)

Método: `PUT`

URL: `http://localhost:3000/api/productos/1`

En Body elegí `JSON`. Enviá todos los campos del producto con los valores nuevos:

```json
{
  "nombre": "Jugo de prueba actualizado",
  "categoria": "Jugos",
  "descripcion": "Descripción actualizada",
  "precio": 900,
  "imagenUrl": ""
}
```

Reemplazá el `1` por el id del producto creado o por el id que quieras editar. La respuesta devuelve el producto actualizado. También se puede hacer desde la app: panel de administración > Actualizar.

## 5. eliminar un producto (DELETE)

Método: `DELETE`

URL: `http://localhost:3000/api/productos/1`

No requiere Body. La API realiza una baja lógica: cambia `activo` a `0`, lo quita del catálogo y conserva la referencia en el historial de ventas. La respuesta correcta contiene `ok: true` y un mensaje de confirmación.

También se puede eliminar desde la app: abrir el producto > opciones de administrador > eliminar del catálogo, o desde la lista del panel de administración.

## 6. comprobar el resultado en MySQL

Para ver los productos activos e inactivos:

```sql
SELECT id, nombre, categoria_id, precio, activo
FROM productos
ORDER BY id DESC;
```

Para ver solamente los que siguen publicados:

```sql
SELECT p.id, p.nombre, c.nombre AS categoria, p.precio
FROM productos p
JOIN categorias c ON c.id = p.categoria_id
WHERE p.activo = 1
ORDER BY p.id DESC;
```

**Importante:** no ejecutes `DELETE FROM productos` manualmente. Los productos pueden estar relacionados con ventas anteriores. La baja lógica evita romper esas referencias.

## rutas disponibles

| Operación | Método | Ruta |
|---|---|---|
| listar | GET | `/api/productos` |
| consultar uno | GET | `/api/productos/:id` |
| crear | POST | `/api/productos` |
| actualizar | PUT | `/api/productos/:id` |
| eliminar del catálogo | DELETE | `/api/productos/:id` |

Para las pruebas de Thunder Client, usá `localhost`. Desde Expo Go en el celular, la app usa la IP local configurada en el `.env` principal.
