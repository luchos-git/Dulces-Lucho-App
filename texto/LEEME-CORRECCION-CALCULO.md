CORRECCIÓN DEL CÁLCULO DE ENVÍO — DULCES LUCHO

Alcance: únicamente se reemplazan estos dos archivos:
- services/envio.js
- components/EntregaEnvio.js

No reemplazar carrito.js, HomeScreen.js, App.js, backend, .env ni archivos SQL.

Qué se conserva:
- Nominatim (OpenStreetMap) para ubicar la dirección del local y la del cliente.
- OSRM para calcular kilómetros por calles.
- El cálculo alternativo en línea recta si OSRM no responde.
- El umbral de 1,5 km gratis y el costo de $300 por kilómetro extra, tal como estaban en el código del proyecto.
- La dirección del local se consulta desde Configuración de la tienda y se muestra únicamente en el carrito si carrito.js conserva la prop mostrarDireccionLocal.

Qué se corrige:
- Las búsquedas a Nominatim ya no se envían en paralelo.
- Se mantiene una separación mínima entre consultas al servicio público.
- La ubicación del local se guarda en memoria para evitar volver a buscarla cada vez.
- Los errores distinguen dirección del local no encontrada, dirección del cliente no encontrada y servicio ocupado.
- La carga de configuración no se confunde con un fallo al buscar el destino.

Instalación:
Extraer el contenido del ZIP en la raíz de Dulces-Lucho-App y reemplazar solamente esos dos archivos.
Luego reiniciar Expo con: npx expo start --lan -c
No hay que ejecutar SQL ni cambiar la IP.

Nota técnica:
El ZIP original usa /api/configuracion-tienda, que devuelve direccion y localidad. El cálculo usa esos dos campos como origen real, y la calle/localidad ingresadas en el carrito como destino.
La comprobación realizada es estática; la consulta real de Nominatim/OSRM debe probarse con la red de tu PC/celular.
