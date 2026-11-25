ACTUALIZACIÓN GLOBAL POR DESLIZAMIENTO — DULCES LUCHO

QUÉ INCLUYE
- El componente compartido components/GlobalRefreshScrollView.js agrega el gesto de deslizar hacia abajo en las pantallas con desplazamiento vertical.
- Las pantallas que ya tenían una función propia de actualización conservan su consulta y su indicador: administración de reportes, usuarios, ventas, facturas e historial.
- El seguimiento del pedido consulta el servidor automáticamente cada 5 segundos; el historial también sincroniza los cambios cada 5 segundos mientras permanece abierto.
- Las demás pantallas vuelven a abrir la ruta actual al deslizar, conservando sus parámetros de navegación.
- Los carruseles y filas de desplazamiento horizontal no activan la actualización vertical.
- La misma integración sirve para pantallas de clientes y de administración.

PANTALLAS CUBIERTAS
Inicio, carrito, detalle de producto, preparación de compra, seguimiento, historial, perfil, configuración, direcciones y medios de pago, ayuda, datos de tienda, login, registro y pantallas administrativas con contenido desplazable.
Las pantallas administrativas con controles propios de actualización mantienen esos controles y sus consultas.

INSTALACIÓN
1. Hacé una copia de seguridad de los archivos que se van a reemplazar.
2. Extraé el contenido del ZIP en la raíz de Dulces-Lucho-App, conservando las carpetas components y screens.
3. Aceptá reemplazar los archivos incluidos.
4. No reemplaces .env, backend ni archivos de la base de datos.
5. Reiniciá Expo con: npx expo start --lan -c

COMPORTAMIENTO
- En pantallas con consulta propia, el gesto vuelve a ejecutar esa consulta.
- En pantallas sin consulta propia, se reinicia la pantalla actual mediante React Navigation.
- Si la pantalla contiene un formulario, los datos aún no guardados pueden perderse al actualizarla. Guardá los cambios antes de deslizar.
- Las pantallas que no tienen contenido desplazable no pueden usar este gesto; no se agrega un control artificial.

No se modificó la IP ni la configuración del backend o MySQL.
