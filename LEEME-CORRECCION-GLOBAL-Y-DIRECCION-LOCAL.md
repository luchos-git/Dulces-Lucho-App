DULCES LUCHO — CORRECCIÓN DE ACTUALIZACIÓN GLOBAL Y DIRECCIÓN DEL LOCAL

QUÉ SE CORRIGIÓ

1. ACTUALIZAR DESLIZANDO HACIA ABAJO
- Se integró components/GlobalRefreshScrollView.js en las pantallas que usan desplazamiento vertical.
- En las pantallas que ya tenían una consulta de actualización propia se conserva ese comportamiento.
- En las demás pantallas se vuelve a abrir la pantalla actual y se ejecutan sus consultas iniciales.
- Se mantienen los parámetros de navegación, por ejemplo el producto que se está consultando.
- Los carruseles horizontales y el visor ampliado de imágenes no activan el refresco vertical.
- El componente comparte la misma lógica y reenvía las referencias (ref) del ScrollView.

2. DIRECCIÓN DEL LOCAL VISIBLE PARA CLIENTES
- Inicio ahora consulta GET /api/configuracion-tienda y muestra una tarjeta pública con dirección, localidad y horario.
- La tarjeta aparece para las cuentas de clientes y administradores; toca la tarjeta para abrir Acerca de Dulces Lucho.
- Acerca de Dulces Lucho vuelve a consultar los datos cada vez que se abre.
- Preparar compra muestra la dirección del local cuando se elige retirar el pedido en persona.
- Configuración de la tienda vuelve a recuperar la información guardada cuando se entra a esa pantalla.

3. SEGUIMIENTO DE PEDIDOS
- El seguimiento consulta el estado de MySQL cada 5 segundos mientras permanece abierto.
- La actualización manual sigue disponible mediante el gesto de deslizar hacia abajo.

INSTALACIÓN DEL CÓDIGO
1. Hacé una copia de seguridad del proyecto.
2. Extraé el ZIP en la raíz de Dulces-Lucho-App, conservando las carpetas components y screens.
3. Aceptá reemplazar los archivos incluidos.
4. No reemplaces .env, backend/.env, backend/src/server.js ni los archivos existentes de la base de datos.

PASO OBLIGATORIO PARA LA DIRECCIÓN PÚBLICA
El respaldo database/dulces_lucho.sql que se revisó no incluye la tabla configuracion_tienda. Por eso se agrega una migración aditiva:
database/migracion_datos_publicos_tienda.sql

Ejecutala en phpMyAdmin:
1. Seleccioná la base dulces_lucho.
2. Abrí la pestaña SQL.
3. Abrí el archivo migracion_datos_publicos_tienda.sql, copiá su contenido y ejecutalo.
4. La última consulta debe mostrar el registro id=1. La dirección inicialmente puede estar vacía.
5. Iniciá el backend, entrá como administrador a Configuración > Configuración de la tienda, cargá Dirección del local y Localidad y guardá.
6. Volvé al Inicio de la app cliente. La dirección debería aparecer en la tarjeta “Dónde estamos”.

PRUEBAS
- En Thunder Client o navegador de la PC: GET http://localhost:3000/api/configuracion-tienda
- La respuesta debe incluir direccion, localidad y horario.
- Si direccion sigue vacía después de guardar, revisar el mensaje del PUT /api/admin/configuracion-tienda y la consola del backend: no es un problema de Expo ni de la IP.

NOTAS
- No se modificó la IP del .env ni la configuración de conexión a MySQL.
- La migración crea/actualiza solamente configuracion_tienda y no elimina datos.
- Las pantallas con formularios pueden perder cambios no guardados si se desliza para actualizar; guardá primero.
- Las pantallas sin contenido desplazable no tienen gesto de pull-to-refresh porque no existe área de scroll.
