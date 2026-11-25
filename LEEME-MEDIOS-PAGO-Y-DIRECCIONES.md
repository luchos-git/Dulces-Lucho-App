# Dulces Lucho — Corrección de medios de pago y direcciones

## Qué corrige este paquete

1. **Error `Property 'metodoPago' doesn't exist`:** en `screens/prepararCompra.js` la selección se guarda en el estado `medioPago`. La solicitud ahora envía expresamente `metodoPago: medioPago` y no intenta leer una variable inexistente llamada `metodoPago`.
2. **Tarjetas de crédito y débito:** permite registrar el tipo (crédito/débito), marca detectada, titular, vencimiento y últimos cuatro dígitos. El número completo solo se usa localmente para validar Luhn y se descarta; el CVV nunca se solicita ni almacena.
3. **Billeteras virtuales y otros medios:** Mercado Pago, Cuenta DNI, MODO, Naranja X, Ualá, transferencia y Rapipago pueden habilitarse desde Configuración de la tienda. El cliente puede guardar un alias de referencia; no se deben escribir contraseñas, tokens ni códigos de acceso.
4. **Medios administrados por la tienda:** el checkout solo muestra los métodos que el administrador dejó habilitados en `AdminTiendaScreen.js`.
5. **Varias direcciones por usuario:** permite guardar Casa, Trabajo u otras direcciones, con alias, persona que recibe e instrucciones (por ejemplo, timbre, portería o para quién es el pedido). Se pueden editar, quitar y elegir una principal.
6. **Datos que quedan en la compra:** las ventas guardan alias, destinatario e instrucciones junto con la dirección/localidad y el método de pago. El historial y las facturas internas ahora recuperan esos datos.

## Instalación

1. Hacé una copia de seguridad del proyecto y de la base `dulces_lucho`.
2. En phpMyAdmin, seleccioná `dulces_lucho`, pestaña **SQL**, y ejecutá una sola vez `database/migracion_direcciones_y_metodos_pago.sql`. La migración es repetible: usa `IF NOT EXISTS` y `CREATE TABLE IF NOT EXISTS`; no elimina registros.
3. Extraé el ZIP en la carpeta principal del proyecto (donde está `App.js`) y aceptá combinar/reemplazar los archivos incluidos.
4. **No reemplaces** `.env` ni `backend/.env`. No contiene ni cambia claves.
5. Reiniciá backend y Expo:

```bash
cd backend
npm start
```

En otra terminal, desde la raíz:

```bash
npx expo start --lan -c
```

## Cómo registrar una tarjeta de prueba

En la app: **Configuración → Métodos de pago → Tarjetas guardadas**.

Número de prueba para el validador local:

```text
4242 4242 4242 4242
```

Vencimiento de ejemplo: `12/30`. Titular: cualquier texto de prueba, por ejemplo `TEST USER`. La app detecta Visa y guarda solamente `Visa`, últimos cuatro (`4242`), titular y vencimiento.

Este número es ficticio y sirve para probar el formulario/validación local; no corresponde a una tarjeta real. La aplicación no está conectada a una pasarela de cobro, así que **no realiza cargos reales**. No uses los datos de una tarjeta real en esta versión. Nunca se envía ni guarda el número completo o CVV.

## Cómo guardar más de una dirección

Abrí **Configuración → Dirección de entrega**. Agregá una dirección con alias (Casa/Trabajo/Casa de mamá), destinatario opcional, calle, localidad y notas. Podés guardar varias; una queda como predeterminada. Al preparar el pedido se pueden elegir las guardadas o ingresar otra. Los datos elegidos se almacenan también en el pedido, sin reemplazar las demás direcciones del usuario.

## Cómo elegir los medios habilitados

Desde una cuenta con permiso `configurar_tienda`, abrí **Configuración → Configuración de la tienda → Medios de pago disponibles** y activá/desactivá cada opción. El checkout y la pantalla de pedido agotado solo muestran métodos habilitados.

## Pruebas en Thunder Client

Importá `THUNDER_CLIENT_DIRECCIONES_PAGOS_OPENAPI.json`. Usá `http://localhost:3000/api` como base desde la PC. Las rutas de usuario protegidas necesitan `Authorization: Bearer <sessionToken>`; la app agrega el token al llamar `api()`.

Pruebas recomendadas:

1. `GET /configuracion-tienda`: comprobar los medios activos.
2. `POST /usuarios/9/metodos-pago`: guardar una tarjeta usando únicamente marca, últimos cuatro, titular y vencimiento (nunca el PAN completo ni CVV).
3. `GET /usuarios/9/metodos-pago`: comprobar que se guardó la referencia.
4. `POST /usuarios/9/direcciones`: agregar una dirección secundaria con alias/destinatario/detalle.
5. `GET /usuarios/9/direcciones`: comprobar que ambas direcciones permanecen guardadas.
6. `POST /ventas`: probar la compra con `metodoPago`, `metodoPagoUsuarioId`, y campos de dirección/entrega.
7. `GET /usuarios/9/pedidos`: comprobar que el pedido devuelve alias, destinatario, notas, método y detalles.

Reemplazá `9`, IDs de tarjetas y de productos por IDs reales de la cuenta de prueba. No ejecutes las pruebas de compra si no querés descontar stock.

## Seguridad y límites

- La app no persiste número completo de tarjeta, CVV, contraseñas de billeteras, token ni OTP.
- Las tarjetas y billeteras guardadas son referencias de selección. No se procesan cobros reales hasta integrar una pasarela oficial y su confirmación de pago.
- Las nuevas direcciones y los medios guardados pertenecen al ID de usuario autenticado; no se pueden consultar desde otra cuenta.
