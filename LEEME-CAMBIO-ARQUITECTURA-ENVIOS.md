# Corrección del cálculo de envíos — Dulces Lucho

## Qué cambia

Antes, el celular consultaba directamente los servicios de mapas y además intentaba encontrar la dirección del local desde React Native. Ahora React/Expo envía la dirección del cliente al backend y el backend coordina todo el cálculo.

## Archivos incluidos

Reemplazá estos archivos en la raíz de `Dulces-Lucho-App`:

- `backend/src/server.js`
- `services/envio.js`
- `components/EntregaEnvio.js`

Creá la carpeta `backend/src/services` si no existe y agregá el archivo nuevo:

- `backend/src/services/envios.js`

No reemplaces `.env`, no borres tu base de datos y no ejecutes migraciones SQL para este cambio.

## Flujo nuevo

1. React/Expo manda `direccionCliente` y `localidadCliente` a `POST /api/envios/calcular`.
2. El backend carga desde MySQL la dirección, localidad y tarifa base de la tienda.
3. El backend busca primero las coordenadas del cliente y después las del local.
4. Las consultas a Nominatim se ejecutan en una cola común, con al menos 1,1 segundos entre solicitudes. Las coordenadas encontradas se guardan en una caché de memoria durante siete días.
5. El backend manda las coordenadas a OSRM, también mediante una cola con al menos 1,1 segundos entre solicitudes.
6. OSRM devuelve la distancia del recorrido en metros.
7. El backend calcula el precio y devuelve metros, kilómetros, costo por distancia, costo base y costo total.
8. React/Expo muestra el resultado; no calcula el precio ni llama a los proveedores externos.

## Regla de precio conservada

- Hasta 1.500 metros: $0 por distancia.
- Por encima de 1.500 metros: $300 por cada tramo adicional de 1.000 metros iniciado.
- Al costo por distancia se suma el costo base guardado en Configuración de la tienda.

Ejemplo: 2.600 metros generan dos tramos adicionales ($600). Si el costo base es $100, el costo final es $700.

## Enlaces de Google Maps

Se aceptan direcciones escritas y enlaces de Google Maps que incluyan coordenadas en el propio enlace. También se intenta expandir un enlace corto `maps.app.goo.gl` siguiendo sus redirecciones de Google. Esto no integra la API de Google Maps ni requiere una clave de Google. Si el enlace no contiene una ubicación legible, pegá la dirección como texto o usá un enlace que incluya las coordenadas.

## APIs externas actuales

- Nominatim (OpenStreetMap): convierte una dirección escrita en coordenadas.
- OSRM (OpenStreetMap): calcula el recorrido por calles y devuelve la distancia en metros.
- ImgBB: aloja imágenes y devuelve sus URLs. No interviene en los envíos.

No se agregó otra API externa.

## Cómo iniciar

Terminal 1 — backend:

```bash
cd backend
npm start
```

Terminal 2 — Expo, desde la raíz del proyecto:

```bash
npx expo start --lan -c
```

## Prueba del endpoint

`POST http://TU_IP:3000/api/envios/calcular`

Cuerpo JSON:

```json
{
  "direccionCliente": "Av. Hipólito Yrigoyen 1234",
  "localidadCliente": "Lanús"
}
```

El endpoint usa la configuración guardada en MySQL; no recibe la dirección del local desde el celular.

## Límites importantes

Las colas y la caché funcionan en el proceso Node que está ejecutando el backend. Están preparadas para ordenar solicitudes simultáneas de varios clientes en esa instancia. Si se ejecutan varias instancias del backend, cada una tendría su propia cola y caché; para escalar a varias instancias haría falta una cola compartida (por ejemplo, Redis) y una caché persistente.

Los servidores públicos gratuitos pueden limitar o interrumpir el servicio. Para un uso comercial sostenido, conviene contratar un proveedor con SLA o alojar los servicios de geocodificación y rutas propios. El código no usa la API pública para autocompletar direcciones.

## Validación realizada

Se verificó la sintaxis del backend y los componentes React Native. También se probó el flujo con respuestas simuladas de los proveedores: búsqueda de cliente, búsqueda del local, consulta de ruta en metros y cálculo del costo. No se pudo validar una dirección real de la tienda ni hacer una compra desde Expo Go en el dispositivo.
