# Dulces Lucho App — Documentación del proyecto y del proceso

> Última actualización: 17 de octubre de 2026
> Repositorio: https://github.com/luchos-git/Dulces-Lucho-App
> Equipo: Luciano y Agustín

---

## 1. ¿Qué es este proyecto?

**Dulces Lucho App** es un prototipo de aplicación móvil para una tienda de golosinas (alfajores, chocolates, caramelos, bombones). Es un proyecto escolar hecho con **React Native y Expo**.

El cliente puede:

- Ver los productos por categoría y filtrarlos por categoría y precio.
- Entrar al detalle de un producto y elegir la cantidad.
- Armar un carrito, elegir si retira en el local o pide envío a domicilio, y ver el costo del envío según la distancia.
- Preparar la compra: canjear un cupón y elegir el medio de pago (tarjeta de crédito, tarjeta de débito o Rapipago).

**Alcance actual:** es un prototipo de *frontend*. No hay base de datos ni servidor propio: los productos están escritos en el código y el carrito vive en la memoria de la app mientras está abierta. Los pagos son simulados. Este alcance se eligió siguiendo la indicación del profesor de avanzar primero con el frontend.

---

## 2. Tecnologías

| Parte | Qué usamos |
|---|---|
| Framework | React Native + Expo (SDK 57; React Native 0.86 y React 19.2) |
| Lenguaje | JavaScript |
| Navegación | React Navigation 7 (`@react-navigation/native` y `native-stack`) |
| Menú lateral | Componente propio hecho con la API `Animated` de React Native |
| Estado del carrito | Context API de React (`CarritoContext`) |
| Ubicación y kilómetros | APIs gratuitas de OpenStreetMap: **Nominatim** (dirección → coordenadas) y **OSRM** (distancia por calles) |
| Probar en el celular | Expo Go |
| Control de versiones | Git y GitHub |
| Editor | Visual Studio Code |
| Asistencia | Consultas a asistentes de IA (Gemini y Claude) para entender errores y revisar código |

---

## 3. Cómo correr el proyecto

### Requisitos

- Node.js y Git instalados.
- Expo Go en el celular, en la versión que coincida con el SDK del proyecto (ver sección 10).
- Celular y compu en la **misma red WiFi**.

### Pasos

```
git clone https://github.com/luchos-git/Dulces-Lucho-App.git
cd Dulces-Lucho-App
npm install
npx expo start -c
```

Después se escanea el QR con Expo Go.

### Cosas a tener en cuenta en Windows

- **No poner el proyecto dentro de OneDrive** (Escritorio o Documentos suelen estar sincronizados). OneDrive puede corromper `node_modules` mientras `npm` instala. Conviene una carpeta como `C:\proyectos\Dulces-Lucho-App`.
- Si PowerShell dice que la ejecución de scripts está deshabilitada, abrir PowerShell **como administrador** y correr una sola vez:
  ```
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  Y usar la terminal de VS Code o una PowerShell normal.
- Si Expo Go pide iniciar sesión, correr `npx expo login` en la terminal y entrar con la misma cuenta en Expo Go.

---

## 4. Estructura de carpetas

```
Dulces-Lucho-App/
├── App.js                      ← Navegación principal y menú lateral
├── index.js                    ← Punto de entrada (registra App)
├── app.json                    ← Configuración de Expo
├── babel.config.js
├── package.json
├── context/
│   └── CarritoContext.js       ← Estado compartido del carrito
├── data/
│   ├── productos.js            ← Lista de productos
│   └── cupones.js              ← Lista de cupones
├── navigation/
│   └── DrawerMenu.js           ← Menú lateral propio (desliza desde la derecha)
├── screens/
│   ├── HomeScreen.js           ← Inicio: ofertas, filtros y productos por categoría
│   ├── DetalleProducto.js      ← Detalle del producto y agregar al carrito
│   ├── carrito.js              ← Carrito, entrega y cálculo de envío
│   └── PrepararCompra.js       ← Cupón y medio de pago
└── services/
    └── envio.js                ← Cálculo de distancia y costo de envío
```

**Archivos heredados que no se usan** (se pueden borrar): la carpeta `src/` y `scripts/` que vienen de la plantilla de `create-expo-app`, y `screens/menu.js` (el diseño del menú ahora está en `navigation/DrawerMenu.js`).

---

## 5. Cómo funciona cada pantalla

### Inicio (`HomeScreen.js`)
- Banner, "Ofertas del día" (los dos primeros productos) y los productos agrupados por categoría en una grilla de 2 columnas.
- **Filtros:** chips de categoría (se generan solos a partir de la lista de productos) y rango de precio mínimo/máximo. Un solo `.filter()` aplica las dos condiciones.
- Si el precio mínimo es mayor que el máximo, los campos se marcan en rojo y aparece un mensaje de error.
- Tocar un producto abre su detalle.

### Detalle (`DetalleProducto.js`)
- Muestra nombre, categoría y precio, con selector de cantidad (− / +).
- "Agregar al carrito" guarda el producto en el `CarritoContext`. "Comprar ahora" todavía es un aviso de "en proceso".

### Carrito (`carrito.js`)
- Casilla "Seleccionar todo", casilla por producto, botones − / + para la cantidad y tacho para borrar.
- Tocar la fila de un producto abre su detalle; la flecha de volver regresa al carrito.
- **Entrega:** retiro en el local o envío a domicilio. Con envío, se escribe la dirección y se toca "Calcular envío".
- El total suma solo los productos tildados, más el envío.
- "Preparar compra" abre la pantalla de pago.

### Preparar compra (`PrepararCompra.js`)
- Resumen del pedido y la entrega (dirección, kilómetros y costo; "Cambiar" vuelve al carrito).
- **Cupón de descuento** (ver sección 6).
- **Medio de pago:** crédito, débito (con validación de número, titular, vencimiento y código) o Rapipago (genera un código de pago de ejemplo).
- Al confirmar, los productos comprados salen del carrito y se vuelve al inicio.

### Menú lateral (`DrawerMenu.js`)
- Se abre con el botón ☰ del encabezado y desliza desde la derecha. Tiene "Inicio" y "Carrito". Tocar afuera lo cierra.

---

## 6. Reglas de negocio

### Envío
- **Gratis hasta 1,5 km** desde el local.
- Pasado 1,5 km: **$300 por cada km extra**, redondeando hacia arriba (por ejemplo, a 2,3 km se cobra 1 km extra = $300).
- Los valores están en `services/envio.js` (`UMBRAL_GRATIS_KM`, `COSTO_POR_KM_EXTRA`) y se cambian ahí.
- Las coordenadas del local (`LOCAL`) en ese archivo son de ejemplo: hay que reemplazarlas por las reales.

**Cómo se calcula:**
1. Nominatim convierte la dirección escrita en coordenadas.
2. OSRM calcula la distancia real por las calles entre el local y esa ubicación.
3. Si OSRM no responde, se usa la distancia en línea recta (fórmula de Haversine) como plan B.

**Limitaciones:** son servicios públicos y gratuitos, sin garantía de disponibilidad. Nominatim pide máximo una consulta por segundo y que la app se identifique (por eso el `User-Agent`). OSRM calcula rutas en auto. Los datos son de OpenStreetMap.

### Cupones (`data/cupones.js`)

| Código | Efecto |
|---|---|
| `DULCE10` | 10% de descuento sobre el subtotal |
| `LUCHO500` | $500 de descuento |
| `ENVIOGRATIS` | Envío gratis (solo con envío a domicilio) |

Para agregar uno, se suma una línea más a la lista. El cupón del juego de la maqueta de Figma se podría sumar de la misma forma.

### Pagos
Son **simulados**: las tarjetas se validan pero nada se guarda ni se envía. Para cobrar de verdad no se arma un formulario propio: se usa un servicio de pagos (por ejemplo, Mercado Pago), que se encarga de los datos de la tarjeta.

---

## 7. Historial del proceso: problemas y cómo se resolvieron

Este proyecto tuvo cerca de un mes de errores de instalación y configuración antes de funcionar de forma estable. Se deja registrado para no repetirlos.

| # | Problema | Causa | Solución |
|---|---|---|---|
| 1 | Pantalla roja `Cannot find module 'babel-preset-expo'` | Instalación incompleta o corrupta de `node_modules` (la carpeta estaba en OneDrive) y caché vieja de Metro | Mover el proyecto fuera de OneDrive, reinstalar de cero y arrancar con `npx expo start -c` |
| 2 | `npm install` fallaba con `ERESOLVE` | El `package.json` mezclaba Expo SDK 54 con React 18.2, React Native 0.73 y librerías de otras épocas (por ejemplo `react-native-screens` 4.25, que pide React Native 0.82 o más) | Armar un `package.json` limpio con las versiones del SDK e instalar las librerías con `npx expo install` |
| 3 | `main` apuntaba a un `index.js` inexistente | Solo existía `App.js` | Crear `index.js` con `registerRootComponent(App)` |
| 4 | `Unable to resolve "../screens/menu"` | Rutas de importación mal escritas (`./` y `../`) | `./` = misma carpeta, `../` = una carpeta arriba. Corregir cada ruta |
| 5 | Import apagado en gris y `MenuScreen is not defined` | Se usaba un componente que nunca se importó ni existía | Usar el componente correcto o quitar el import sin uso |
| 6 | Dos aplicaciones mezcladas | Un `App.js` viejo y un `AppNavigator.js` nuevo, más la plantilla de Expo Router (`src/app`) sin usar | Un solo punto de entrada: `index.js` → `App.js` → navegación |
| 7 | Dos ramas desincronizadas en GitHub (`main` y `principal`) | `main` quedó con la versión vieja y rota, y GitHub la usa por defecto | Crear un repositorio nuevo con historial limpio |
| 8 | Crash en el celular: `TurboModule method "installTurboModule" called with 1 arguments (expected argument count: 0)` | El menú de `@react-navigation/drawer` depende de `react-native-reanimated` 4 y `react-native-worklets`; en Expo Go hubo un conflicto de módulo nativo que no se resolvió reinstalando, limpiando la caché ni quitando el plugin duplicado de `babel.config.js` | Sacar drawer, reanimated, worklets y gesture-handler. Menú lateral propio con `Animated` y navegación con `native-stack` |
| 9 | PowerShell: "la ejecución de scripts está deshabilitada" | Política de ejecución de Windows | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` (como administrador) |
| 10 | Pantalla azul `Failed to download remote update` | El celular no se conecta con la compu | Servidor corriendo (`npx expo start -c`), misma red WiFi (misma banda), Node.js permitido en el Firewall; si falla, cable USB con depuración USB o hotspot del celular |
| 11 | `@react-native-async-storage/async-storage` "added as a dependency but not installed" | Después de `git pull`, faltaba instalar lo que el otro agregó | Correr `npm install` después de cada `git pull` |
| 12 | Expo Go se actualizó y dejó de abrir el proyecto (SDK 54) | Expo Go solo soporta un SDK a la vez | Actualizar a SDK 57 (sección 10) |
| 13 | `expo-doctor` marcaba `splash` en `app.json`, `babel-preset-expo`, `typescript` y `@types/react` | En SDK 57 `splash` ya no va en `app.json` y esos paquetes quedaron en la versión vieja | Borrar el bloque `splash`, correr `npx expo install --check` y dejar `babel-preset-expo ~57.0.0`, `typescript ~6.0.3` y `@types/react ~19.2.4` |
| 14 | `Render Error: Got an invalid value for 'component' prop for the screen 'Carrito'` | React Navigation recibió `undefined` en lugar de un componente. Causas típicas: el archivo de la pantalla no tiene `export default function ...` (por ejemplo, quedó incompleto después de pegar un cambio), o el `import` de `App.js` no coincide con la ruta o el nombre real del archivo | Revisar que `screens/carrito.js` tenga una sola línea `export default function CarritoScreen(...)` y que `App.js` lo importe como `import CarritoScreen from './screens/carrito'`. Si hay dudas, reemplazar el archivo completo. **Regla:** cada pantalla debe exportar su componente con `export default` |

### Lecciones aprendidas

1. Para instalar librerías de Expo o React Native usar **`npx expo install nombre`**, nunca `npm install nombre` a secas.
2. No usar `npm audit fix --force` ni `--legacy-peer-deps`: rompen las versiones que Expo necesita.
3. Si algo "no se arregla" después de reinstalar, probar `npx expo start -c` (limpia la caché).
4. Leer el mensaje de error completo: casi siempre nombra el archivo y la línea del problema.
5. Hacer commit de un estado que funciona **antes** de cambiar cosas grandes.
6. Cuando falla en el celular pero anda en la web, el problema suele ser un módulo nativo.

---

## 8. Decisiones técnicas

- **Menú lateral propio en vez de `createDrawerNavigator`:** el drawer oficial dependía de librerías nativas que fallaban en Expo Go (problema 8). La versión propia con `Animated` no usa módulos nativos extra y conserva React Navigation para la navegación entre pantallas.
- **Carrito sin persistencia:** vive en el `CarritoContext` y se pierde al cerrar la app. El guardado se pausó a pedido del profesor (primero el frontend).
- **Backend pausado:** se había armado una versión con productos guardados en el celular (`AsyncStorage`), un `ProductosContext` y una pantalla de Admin para agregar productos, con ID autoincremental (el máximo ID existente + 1). Se dejó de lado por ahora. Si se retoma, esa es la idea a seguir.
- **APIs gratuitas en vez de Google Maps:** Google Maps Platform requiere una cuenta de facturación con tarjeta. Para un prototipo se eligieron Nominatim y OSRM, que no necesitan clave ni cuenta.
- **Pagos simulados:** no se procesa ni se guarda ningún dato de tarjeta.

---

## 9. Trabajo en equipo con Git

1. **Antes de empezar a programar:** `git pull`, y después `npm install` (puede haber dependencias nuevas).
2. **Commits chicos y seguidos:** cada vez que algo funcione, `git add .`, `git commit -m "qué se hizo"` y `git push`.
3. **Avisarse** antes de tocar un archivo grande (por ejemplo `HomeScreen.js`) para no pisarse.
4. **Si hay un conflicto** (`CONFLICT` en el `git pull`): abrir el archivo, decidir entre los dos qué versión queda, borrar las marcas `<<<<<<<`, `=======` y `>>>>>>>`, y hacer commit.
5. El `package-lock.json` **se sube al repositorio**, así los dos instalan las mismas versiones.
6. Archivos que no se suben: `node_modules/` y `.expo/` (ya están en `.gitignore`).

---

## 10. Versiones y cómo actualizar el SDK

**Expo Go solo soporta un SDK a la vez.** Cuando la tienda actualiza Expo Go a un SDK nuevo, los proyectos de un SDK anterior dejan de abrirse hasta actualizarlos.

- El proyecto está hoy en **SDK 57**.
- El **SDK 58** salió el 15 de octubre de 2026. Expo Go de las tiendas pasará a SDK 58 en unas semanas.

### Pasos para actualizar (reemplazar 57 por el número nuevo)

```
git add .
git commit -m "Antes de actualizar el SDK"
git push

npx expo install expo@^57.0.0
npx expo install --fix
npx expo-doctor
npx expo start -c
```

Si `npm` da `ERESOLVE`:

```
rd /s /q node_modules
del package-lock.json
npm install
```

Después se sube el cambio y la otra persona hace `git pull` y `npm install`, con Expo Go actualizado en su celular.

### Probar con una versión puntual de Expo Go
En Android se puede instalar la versión de Expo Go que coincida con el SDK desde **expo.dev/go** (hay que desinstalar la actual y desactivar la actualización automática en Play Store).

---

## 11. Comandos útiles

| Para qué | Comando |
|---|---|
| Instalar dependencias | `npm install` |
| Arrancar el proyecto | `npx expo start` |
| Arrancar limpiando la caché | `npx expo start -c` |
| Cortar el servidor | `Ctrl + C` |
| Recargar la app | Tecla `r` en la terminal |
| Instalar una librería | `npx expo install nombre-paquete` |
| Revisar versiones | `npx expo install --check` |
| Diagnóstico del proyecto | `npx expo-doctor` |
| Traer cambios | `git pull` |
| Subir cambios | `git add .` y `git commit -m "mensaje"` y `git push` |

---

## 12. Pendientes y próximos pasos

- Reemplazar las coordenadas de ejemplo del local en `services/envio.js` por las reales.
- Cargar los productos reales con fotos (hoy son nombres y precios de ejemplo).
- Armar el banner de promo y la sección del cupón por jugar un juego (según la maqueta de Figma).
- Agregar cuotas para la tarjeta de crédito.
- Retomar el backend cuando el profesor lo indique: guardar los productos, pantalla de Admin con ID autoincremental y pagos reales con un servicio como Mercado Pago.
- Actualizar al SDK 58 cuando Expo Go lo pida.
- Borrar los archivos heredados de la plantilla (`src/`, `scripts/`, `screens/menu.js`).