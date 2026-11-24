# Pruebas de Dulces Lucho con Thunder Client

Usá `http://localhost:3000/api` desde Thunder Client en la computadora. El backend debe estar activo. Reemplazá los IDs de ejemplo por IDs reales de tu base.

## 1. Ver los pedidos de un usuario

- Método: `GET`
- URL: `http://localhost:3000/api/usuarios/1/pedidos`
- Body: vacío

Cada resultado debe incluir `id`/`pedidoId` y `usuarioId`. Todos los `usuarioId` deben ser `1`. Si ese usuario todavía no compró, debe devolver `[]`.

## 2. Ver un pedido específico de ese usuario

- Método: `GET`
- URL: `http://localhost:3000/api/usuarios/1/pedidos/25`
- Body: vacío

El `25` debe ser el ID real de una fila en `ventas`. Si la venta 25 pertenece a otro usuario, debe responder `404` en vez de mostrar sus datos.

## 3. Revisar imágenes de productos

- Método: `GET`
- URL: `http://localhost:3000/api/productos`
- Body: vacío

Para los productos con foto, verificá que `imagenUrl`, `miniaturaUrl` e `imagenes` contengan URLs `https://` directas de ImgBB.

## 4. Subir una foto de perfil manualmente (opcional)

La app ya hace estos dos pasos automáticamente al elegir una foto desde Mi perfil. Para probarlos por separado:

**Subir a ImgBB**

- Método: `POST`
- URL: `http://localhost:3000/api/imagenes/perfil`
- Body: `Form`
- Agregá un campo llamado `foto`, tipo `File`, y seleccioná un JPG o PNG de hasta 5 MB.

La respuesta contiene `imagenUrl`.

**Guardar URL en la cuenta**

- Método: `PUT`
- URL: `http://localhost:3000/api/usuarios/1/foto-perfil`
- Body: `JSON`

```json
{
  "imagenUrl": "PEGAR_AQUI_LA_URL_HTTPS_DEVUELTA_POR_IMGBB"
}
```

## 5. Consultar la foto guardada

- Método: `GET`
- URL: `http://localhost:3000/api/usuarios/1/perfil`
- Body: vacío

La respuesta debe incluir `fotoPerfilUrl`.

## SQL de verificación

También se incluye `database/verificar_pedidos_por_usuario.sql`. Es solo lectura: cambia `@usuario_id` al ID que quieras comprobar y muestra las ventas del usuario y sus artículos relacionados.
