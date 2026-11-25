# corrección de subida de imágenes y zona táctil de precios

## qué se corrigió

### subida a imgbb desde expo go

El error `Unsupported FormDataPart implementation` ocurría porque el formulario enviaba el objeto nativo antiguo `{ uri, name, type }`. En Expo SDK 58 la serialización `FormData` de `expo/fetch` requiere partes `Blob` o `File`.

Ahora `services/api.js` crea un `File` con `new File(asset.uri)` desde `expo-file-system`, lo adjunta como `image` y envía el multipart mediante `fetch` importado desde `expo/fetch`. No se fija manualmente `Content-Type`, para que se genere el boundary.

El backend mantiene su ruta `POST /api/imagenes/producto`, Multer recibe el archivo y lo envía a ImgBB utilizando la clave guardada en `backend/.env`. La clave no está en el código del celular.

### precio sin navegación

En `screens/HomeScreen.js`, el precio queda fuera del botón que abre el detalle. En `screens/DetalleProducto.js`, los precios de productos similares quedan fuera del área táctil. En `screens/carrito.js`, se quitó el botón que cubría toda la fila: ahora solo la foto y el nombre abren el detalle, no el precio, selector ni controles.

## archivos modificados

- `services/api.js`: subida multipart compatible con Expo SDK 58 usando `File` y `expo/fetch`.
- `package.json`: dependencia directa `expo-file-system` compatible con SDK 58.
- `package-lock.json`: declaración de dependencia directa; el paquete ya estaba resuelto por Expo en el lockfile.
- `screens/HomeScreen.js`: precio sin interacción y área de navegación limitada a foto/nombre.
- `screens/DetalleProducto.js`: precios en recomendaciones sin interacción.
- `screens/carrito.js`: navegación limitada a foto/nombre, no al precio ni a los controles.

## cómo instalar y probar

1. Extraer la carpeta y abrirla en VS Code.
2. En la raíz del proyecto ejecutar `npm install`. Esto registra `expo-file-system` como dependencia directa.
3. Verificar que `backend/.env` tenga `IMGBB_API_KEY` configurada. No copiar esa clave a Expo ni compartir el archivo `.env`.
4. Terminal 1: `cd backend` y `npm start`.
5. Terminal 2, en la raíz: `npx expo start --lan -c`.
6. En Expo Go, probar primero un solo producto con una imagen. Luego probar dos y tres imágenes.
7. Confirmar que la imagen aparece después de guardar y que tocar el precio en catálogo, productos similares y carrito no navega.

No se requiere APK ni AAB. `expo-file-system` está incluido en Expo Go para SDK 58.
