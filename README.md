# dulces lucho app

aplicación móvil hecha con expo y react native para consultar golosinas, armar un carrito, preparar compras y seguir pedidos. incluye un panel para administrar el catálogo, una api con express, mysql e imágenes alojadas en imgbb

## iniciar el proyecto

primero importá `database/dulces_lucho.sql` en mysql desde xampp o phpmyadmin

después copiá `backend/.env.example` como `backend/.env` y completá los datos de conexión de mysql y la clave de imgbb si vas a subir fotos

abrí una terminal en `backend`, ejecutá `npm install` y después `npm start`

en la carpeta principal copiá `.env.example` como `.env`, reemplazá la ip de ejemplo por la ip local de tu pc y ejecutá `npm install`

por último ejecutá `npx expo start --lan -c` y escaneá el qr con expo go. no hace falta generar un apk para probar la aplicación en el celular

## guías

`documentacion.md` explica la organización general y los módulos de la app

`THUNDER_CLIENT_Y_EXPO_GO.md` muestra cómo probar el backend con thunder client y cómo conectar el teléfono por wifi

`CONFIGURACION_Y_ARCHIVOS_AUXILIARES.md` explica los archivos json y de configuración

`assets/README.md` explica los recursos gráficos


para consultar la explicación archivo por archivo, revisá `INDICE_DE_ARCHIVOS.md`

## Cambios de perfil, configuración y productos

La navegación principal ahora incluye las pantallas `Perfil`, `Configuracion` y `Facturas`. El perfil permite elegir una foto de la galería; esa foto se guarda en el almacenamiento local del teléfono. El menú de configuración muestra opciones distintas para clientes y administradores. Los resúmenes de compra se leen del historial local y aclaran que no son facturas fiscales.

En la ficha de cada producto, los administradores pueden abrir el panel con el formulario ya completado para modificarlo o eliminarlo del catálogo. La eliminación usa la baja lógica que ya ofrece la API.

### Dependencia para elegir fotos

El proyecto utiliza `expo-image-picker` para elegir fotos de perfil y de productos. En la carpeta principal ejecutá:

```bash
npm install
npx expo install expo-image-picker
```

### Iniciar la app con Expo Go

En una terminal, iniciá el backend desde `backend` con `npm install` y `npm start`. En otra terminal, desde la carpeta principal, ejecutá `npx expo start --lan -c` y escaneá el QR con Expo Go. En el archivo `.env`, `EXPO_PUBLIC_API_URL` debe apuntar a la dirección IPv4 de la computadora, no a `localhost`, cuando se usa un celular físico.
