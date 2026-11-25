DULCES LUCHO — REPARACIÓN DE DIRECCIONES Y MEDIOS DE PAGO

ARCHIVOS INCLUIDOS
- screens/carrito.js
- screens/prepararCompra.js

QUÉ SE CORRIGE
1. La lista de direcciones guardadas queda visible en el carrito aunque esté seleccionado el retiro en el local. La dirección principal queda identificada y resaltada; tocar una dirección selecciona envío a domicilio.
2. El carrito envía a Preparar compra el ID y los datos de la dirección guardada solamente cuando se eligió envío a domicilio.
3. Preparar compra ya no usa Promise.all para cargar cuatro recursos de forma indivisible. La configuración de la tienda sigue siendo necesaria, pero si fallan preferencias, direcciones o perfiles guardados, el catálogo de medios habilitados sigue cargando.
4. Si no se puede leer la preferencia del cliente o no hay perfil guardado, se selecciona un medio habilitado por la tienda que no requiera una tarjeta guardada, cuando exista. Se respetan la preferencia y los perfiles predeterminados cuando están disponibles.
5. La habilitación de medios de pago acepta correctamente valores booleanos y valores numéricos 1/0.

INSTALACIÓN
1. Cerrá Expo.
2. Hacé una copia de seguridad de los dos archivos actuales.
3. Extraé este ZIP en la raíz de Dulces-Lucho-App y reemplazá solamente los dos archivos incluidos, respetando las carpetas.
4. No reemplaces backend/src/server.js, backend/src/services/envios.js, .env, backend/.env ni archivos SQL.
5. Volvé a iniciar Expo con npx expo start -c. El backend puede permanecer sin cambios.

NOTA SOBRE TARJETAS
Crédito y débito siguen requiriendo una tarjeta guardada en Configuración > Métodos de pago. Los otros medios habilitados no requieren una tarjeta guardada. No se eliminó esa validación ni se realizan cobros reales a través de billeteras externas.

PRUEBA
- En el carrito, la lista de direcciones guardadas debe aparecer y mostrar cuál es Principal.
- Al tocar una dirección se activa Envío a domicilio y se completa la dirección.
- En Preparar compra debe aparecer al menos un medio habilitado y quedar seleccionado según preferencia/perfil o, como respaldo, el primer medio habilitado.
