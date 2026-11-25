# Dulces Lucho — ajustes estéticos y comodidad

Este parche aplica mejoras visuales y de navegación sin modificar el backend, las tablas de MySQL, el stock, los pedidos ni las credenciales.

## Cambios incluidos

1. **Espacio inferior en las pantallas:** se reserva espacio al final del contenido para que los últimos botones y productos no queden detrás de la barra de navegación del teléfono.
2. **Teclado:** los formularios usan desplazamiento persistente y ajuste de insets. En Android se configura `softwareKeyboardLayoutMode: resize`; en iOS se ajustan los insets automáticamente. Esto ayuda a mantener visible el campo que se está editando.
3. **Carruseles:** las imágenes de producto cambian con una transición de opacidad más gradual; los banners avanzan con desplazamiento animado y siguen permitiendo el gesto manual. Las listas horizontales de productos conservan el desplazamiento por deslizamiento.
4. **Recorte de fotos de productos:** el selector abre el recorte cuadrado, igual que el flujo de selección de foto de perfil. Se mantiene el límite de hasta tres imágenes por producto, seleccionadas de a una.
5. **Apariencia global:** en Configuración → Apariencia se puede elegir:
   - Claro cálido
   - Colores tibios
   - Oscuro

   La elección se guarda en el dispositivo y se aplica a las pantallas de clientes y administración.

## Instalación

1. Cerrá Expo Go o detené el servidor de desarrollo.
2. Hacé una copia de seguridad de la carpeta actual del proyecto.
3. Extraé este ZIP en la carpeta raíz de Dulces Lucho, donde está `App.js`.
4. Aceptá combinar carpetas y reemplazar los archivos incluidos.
5. No reemplaces ni modifiques `backend/.env`, `.env`, la carpeta `backend`, ni la base de datos. Este parche no necesita cambios de servidor ni migraciones SQL.
6. Desde la raíz del proyecto, ejecutá:

```bash
npx expo start --lan -c
```

7. Escaneá el nuevo QR con Expo Go.
8. Para elegir una apariencia: Configuración → Apariencia.

## Archivos del parche

- `App.js`, `app.json`
- `context/ThemeContext.js`
- Pantallas (`screens/`), componentes (`components/`) y menú (`navigation/DrawerMenu.js`) que necesitan actualizar sus colores, espaciado, teclado o carruseles.

## Comprobaciones

Se revisó la sintaxis de los archivos JavaScript/JSX del grafo activo de la aplicación, la resolución de las importaciones locales y el JSON de `app.json`. No se pudo ejecutar Expo Go en un teléfono real desde este entorno; conviene probar especialmente el teclado en formularios largos y el cambio de apariencia en las pantallas que más usás.
