# lista de archivos modificados y agregados

esta lista compara la versión entregada con el zip original `plat mov (2).zip`.

## cambios funcionales principales

- `App.js`: registra las pantallas de perfil, configuración y facturas dentro de la navegación.
- `navigation/DrawerMenu.js`: agrega los accesos al perfil y a la configuración en el menú lateral.
- `screens/DetalleProducto.js`: muestra las acciones de modificar y eliminar al administrador; pide confirmación antes de eliminar y vuelve al catálogo después de la operación.
- `screens/PanelAdminScreen.js`: recibe el producto elegido desde la ficha y carga sus datos en el formulario de edición.
- `context/ProductosContext.js`: centraliza la carga, alta, modificación y baja lógica de productos mediante la api, y actualiza la caché local.
- `data/productos.js`: actualiza los productos de respaldo local para que coincidan con los cinco productos del catálogo del proyecto.

## archivos de código nuevos

- `screens/PerfilScreen.js`: pantalla de perfil para cliente y administrador; permite elegir una foto del teléfono.
- `screens/ConfiguracionScreen.js`: menú de configuración con opciones distintas según el rol.
- `screens/FacturasScreen.js`: muestra resúmenes de pedidos guardados localmente; no emite facturas fiscales.

## otros archivos modificados

estos archivos recibieron explicaciones, comentarios, organización o documentación. en general no se agregaron funciones nuevas de la interfaz en ellos:

- `index.js`
- `.gitignore`
- `README.md`
- `documentacion.md`
- `babel.config.js`
- `context/PedidoContext.js`
- `context/AuthContext.js`
- `context/CarritoContext.js`
- `screens/HomeScreen.js`
- `screens/HistorialPedidosScreen.js`
- `screens/LoginScreen.js`
- `screens/carrito.js`
- `screens/BienvenidaScreen.js`
- `screens/SeguimientoPedido.js`
- `screens/prepararCompra.js`
- `screens/RegistroScreen.js`
- `screens/ClaveAdminScreen.js`
- `screens/AdminScreens.js`
- `data/seguimiento.js`
- `data/cupones.js`
- `data/usuarios.js`
- `services/notificaciones.js`
- `services/envio.js`
- `services/api.js`
- `database/README.md`
- `database/migracion_v2_pedidos.sql`
- `database/productos_iniciales_y_crud.sql`
- `database/consultas_ejemplo.sql`
- `database/dulces_lucho.sql`
- `navigation/AppNavigator.js`
- `backend/.env.example`
- `backend/src/server.js`
- `scripts/reset-project.js`
- `components/EntregaEnvio.js`
- `components/ModalAgregar.js`
- `src/global.css`
- `src/app/explore.tsx`
- `src/app/index.tsx`
- `src/app/_layout.tsx`
- `src/components/external-link.tsx`
- `src/components/themed-text.tsx`
- `src/components/app-tabs.tsx`
- `src/components/animated-icon.module.css`
- `src/components/app-tabs.web.tsx`
- `src/components/animated-icon.tsx`
- `src/components/animated-icon.web.tsx`
- `src/components/hint-row.tsx`
- `src/components/web-badge.tsx`
- `src/components/themed-view.tsx`
- `src/components/ui/collapsible.tsx`
- `src/hooks/use-theme.ts`
- `src/hooks/use-color-scheme.web.ts`
- `src/hooks/use-color-scheme.ts`
- `src/constants/theme.ts`
- `assets/expo.icon/Assets/expo-symbol 2.svg`

## archivos agregados

- `CAMBIOS_CODIGO.md`: resumen de las funciones nuevas y sus límites.
- `THUNDER_CLIENT_Y_EXPO_GO.md`: guía de pruebas del backend y conexión de Expo Go.
- `INDICE_DE_ARCHIVOS.md`: índice de las explicaciones por archivo.
- `CONFIGURACION_Y_ARCHIVOS_AUXILIARES.md`: explicación de configuraciones y archivos auxiliares.
- `assets/README.md`: explicación de la carpeta de recursos gráficos.
- `.env.example`: ejemplo de configuración para la app.
- `app.json.explicacion.md`
- `tsconfig.json.explicacion.md`
- `package-lock.json.explicacion.md`
- `package.json.explicacion.md`
- `assets/expo.icon/Assets/icon.json.explicacion.md`
- `.vscode/settings.json.explicacion.md`
- `.vscode/extensions.json.explicacion.md`
- `.claude/settings.json.explicacion.md`
- `backend/package-lock.json.explicacion.md`
- `backend/package.json.explicacion.md`
- `screens/PerfilScreen.js`
- `screens/ConfiguracionScreen.js`
- `screens/FacturasScreen.js`

## cosas que no se cambiaron

- `package.json` y `package-lock.json` de la raíz no se modificaron.
- no se cambió el motor de la app: sigue siendo Expo y React Native.
- no se agregó una versión APK o AAB.
- no se agregaron rutas nuevas de backend para facturas, usuarios, reportes ni pagos.

## recomendaciones para probar sin arriesgar el original

1. conservá tu carpeta original sin sobrescribirla.
2. extraé este zip en una carpeta nueva.
3. copiá los archivos `.env` que ya usabas a la copia nueva, sin compartirlos ni subirlos.
4. probá primero el backend y después Expo Go en el celular.
5. cuando confirmes que funciona, recién ahí pasá los cambios que necesites a tu proyecto principal.
