# índice de archivos del proyecto

este índice explica para qué sirve cada archivo del proyecto. los archivos de código también tienen comentarios al comienzo y dentro de las secciones principales para que se entienda qué hace cada parte

## archivos principales

`App.js` conecta los proveedores de datos y define la navegación real de la aplicación móvil

`index.js` registra `App.js` como componente de entrada de expo

`babel.config.js` configura la transformación del código que realiza babel

`package.json` define los comandos y las dependencias de la app móvil

`package-lock.json` fija las versiones exactas de las dependencias instaladas

`app.json` contiene el nombre, íconos, permisos y plugins que usa expo

`.env.example` indica cómo configurar la dirección del backend para expo go

`.gitignore` evita subir dependencias, cachés y archivos con claves privadas

## backend

`backend/src/server.js` conecta mysql y contiene las rutas para consultar y modificar productos, subir imágenes, registrar usuarios, iniciar sesión y verificar administradores

`backend/package.json` define las dependencias y comandos del servidor

`backend/package-lock.json` guarda las versiones exactas de las dependencias del backend

`backend/.env.example` muestra los datos necesarios para conectar mysql, imgbb y el código de autorización de administrador

## componentes

`components/EntregaEnvio.js` contiene el formulario de retiro o envío y el hook que guarda sus datos

`components/ModalAgregar.js` permite elegir la cantidad de un producto recomendado antes de sumarlo al carrito

## contextos

`context/AuthContext.js` concentra el registro, el inicio de sesión, el rol y la verificación de la clave de administrador

`context/CarritoContext.js` conserva los productos del carrito y permite cambiar sus cantidades y selección

`context/PedidoContext.js` crea pedidos y persiste su historial en el almacenamiento local del celular

`context/ProductosContext.js` obtiene los productos desde mysql mediante la api y conserva una copia local

## datos

`data/cupones.js` contiene cupones de ejemplo

`data/productos.js` ofrece productos de muestra para las recomendaciones del carrito

`data/seguimiento.js` define los pasos simulados de seguimiento y los tiempos de cada paso

`data/usuarios.js` contiene las cuentas locales de demostración y el código de autorización que revisa el formulario

## navegación

`navigation/DrawerMenu.js` dibuja el menú lateral que se abre desde la cabecera

`navigation/AppNavigator.js` conserva una navegación alternativa de ejemplo, pero no es la navegación activa de `App.js`

## pantallas

`screens/LoginScreen.js` muestra el formulario para iniciar sesión

`screens/RegistroScreen.js` crea una cuenta de cliente o una cuenta administradora autorizada

`screens/ClaveAdminScreen.js` solicita la segunda clave del administrador

`screens/BienvenidaScreen.js` saluda al usuario y lo lleva al catálogo

`screens/HomeScreen.js` muestra y filtra el catálogo de productos

`screens/DetalleProducto.js` presenta un producto y permite agregarlo al carrito o comprarlo directamente

`screens/carrito.js` muestra los productos seleccionados, el subtotal, el envío y las recomendaciones

`screens/prepararCompra.js` calcula descuentos, valida los datos y simula la confirmación del pago

`screens/SeguimientoPedido.js` muestra el estado simulado y los detalles del pedido

`screens/HistorialPedidosScreen.js` separa los pedidos activos y los entregados

`screens/PanelAdminScreen.js` contiene el formulario y la lista para crear, editar y ocultar productos

`screens/AdminScreens.js` conserva una pantalla administrativa anterior que no se conecta desde la navegación actual

## servicios

`services/api.js` envía solicitudes http al backend y sube imágenes seleccionadas desde el celular

`services/envio.js` busca direcciones y calcula distancias para estimar el costo de envío

`services/notificaciones.js` solicita permisos y programa notificaciones locales en el dispositivo

## base de datos

`database/dulces_lucho.sql` crea la base, las tablas, categorías, productos, usuarios y ventas de ejemplo. es un script destructivo porque elimina tablas existentes antes de crearlas

`database/consultas_ejemplo.sql` contiene consultas para probar datos y ejemplos de altas y cambios

`database/productos_iniciales_y_crud.sql` inserta productos de ejemplo y muestra las operaciones crud de productos

`database/migracion_v2_pedidos.sql` agrega campos a una instalación anterior sin volver a crear toda la base

`database/README.md` explica cómo importar y usar los scripts sql

## plantilla de expo que quedó como referencia

la aplicación activa se carga desde `index.js` y `App.js`. la carpeta `src` contiene archivos de una plantilla de expo router que no se utiliza en la navegación actual porque este proyecto usa react navigation

`src/app/_layout.tsx` define el diseño principal de la plantilla expo router

`src/app/index.tsx` es la pantalla inicial de esa plantilla

`src/app/explore.tsx` es su pantalla de exploración de ejemplo

`src/components/animated-icon.tsx` contiene un icono animado de ejemplo

`src/components/animated-icon.web.tsx` contiene la variante web de ese icono

`src/components/animated-icon.module.css` da estilo al icono animado

`src/components/app-tabs.tsx` define las pestañas de la plantilla

`src/components/app-tabs.web.tsx` define su variante web

`src/components/external-link.tsx` es un ejemplo para abrir enlaces externos

`src/components/hint-row.tsx` contiene una fila visual de ayuda

`src/components/themed-text.tsx` aplica colores de tema a textos

`src/components/themed-view.tsx` aplica colores de tema a contenedores

`src/components/ui/collapsible.tsx` permite desplegar u ocultar contenido

`src/components/web-badge.tsx` muestra una insignia en la versión web

`src/constants/theme.ts` reúne valores de color de la plantilla

`src/global.css` define estilos globales de la versión web de la plantilla

`src/hooks/use-color-scheme.ts` detecta la apariencia del sistema

`src/hooks/use-color-scheme.web.ts` detecta la apariencia cuando se ejecuta en navegador

`src/hooks/use-theme.ts` selecciona los colores según el tema activo

`tsconfig.json` configura typescript para revisar los archivos de la plantilla

`scripts/reset-project.js` es una utilidad de expo para reiniciar la plantilla, no se ejecuta cuando inicia la app

## otros archivos

`README.md` contiene la presentación y el inicio rápido del proyecto

`documentacion.md` reúne la descripción general, instalación y notas de funcionamiento

`THUNDER_CLIENT_Y_EXPO_GO.md` incluye solicitudes de thunder client y los pasos para usar expo go

`CONFIGURACION_Y_ARCHIVOS_AUXILIARES.md` explica los archivos json, instrucciones y configuraciones

`assets/README.md` describe los recursos visuales binarios

`AGENTS.md` y `CLAUDE.md` contienen instrucciones auxiliares para asistentes de programación

`.claude/settings.json` activa una integración opcional de claude

`.vscode/extensions.json` recomienda una extensión de expo para visual studio code

`.vscode/settings.json` ajusta algunas acciones automáticas del editor

`LICENSE` contiene las condiciones legales de uso del proyecto

`assets/expo.icon/Assets/icon.json` guarda metadatos de la herramienta de iconos de expo

`assets/expo.icon/Assets/expo-symbol 2.svg` es un recurso vectorial de la plantilla de expo

`assets/expo.icon/Assets/grid.png` es una imagen auxiliar de la plantilla de iconos

`assets/images/` contiene el logo, los íconos de la app, la imagen de inicio y recursos de ejemplo de expo y react


## ajustes de catálogo (13/11/2026)

- `screens/PanelAdminScreen.js`: selector de categorías desde MySQL y selección de fotos desde el celular.
- `services/api.js`: envío multipart de imágenes al backend.
- `backend/src/server.js`: ruta `GET /api/categorias`, validación de categorías existentes y respuestas de error de ImgBB más claras.
- `backend/.env`: configuración local de ImgBB y MySQL. Este archivo contiene una clave privada y no debe subirse a GitHub.
- `database/unificar_categoria_jugo.sql`: corrección opcional para mover productos de una categoría singular `Jugo` a `Jugos`.
- `PRUEBA_IMAGENES_Y_CATEGORIAS.md`: pasos para probar.
