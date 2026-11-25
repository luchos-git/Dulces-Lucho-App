# Corrección puntual: error del carrito y dirección del local

Reemplazar únicamente estos tres archivos, respetando sus carpetas:

- `screens/carrito.js`
- `screens/HomeScreen.js`
- `components/EntregaEnvio.js`

Cambios:

1. `useEntrega()` ahora devuelve `cargarConfiguracionTienda`, que el carrito utiliza al recuperar el foco.
2. `CarritoScreen` conserva la declaración válida `export default function CarritoScreen(...)` y llama al método con el nombre exacto `cargarConfiguracionTienda`.
3. `HomeScreen` vuelve a la pantalla de catálogo sin tarjeta, dirección ni consulta del local. Se conserva el contenedor `GlobalRefreshScrollView` para el gesto de actualización.
4. `EntregaEnvio` mantiene `mostrarDireccionLocal` desactivado por defecto. El carrito es el único que lo activa.

No reemplazar `.env`, no ejecutar SQL y no modificar la base de datos para esta corrección.
