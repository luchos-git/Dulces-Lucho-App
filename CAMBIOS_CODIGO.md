# cambios de código incluidos

## perfil

- se agregó una pantalla de perfil para clientes y administradores
- el avatar permite elegir una foto desde la galería del teléfono
- la foto de perfil se guarda en AsyncStorage y queda en ese dispositivo
- se muestran el nombre, el correo, el rol y el identificador de la cuenta

## configuración

- se agregó una opción de configuración al menú lateral
- la configuración de clientes incluye perfil, pedidos, comprobantes, métodos de pago, dirección, notificaciones, privacidad e información de la app
- la configuración de administradores agrega accesos al panel de productos y opciones de gestión de usuarios, ventas, reportes y tienda
- las secciones administrativas que todavía no tienen rutas de backend informan qué falta implementar, en lugar de simular que ya funcionan

## facturas y comprobantes

- se agregó una pantalla que muestra los resúmenes de los pedidos guardados en el dispositivo
- se aclara que esos resúmenes no son facturas fiscales ni comprobantes emitidos por un servicio externo

## productos

- la ficha del producto ahora muestra botones de modificar y eliminar solamente para administradores
- modificar abre el panel con el producto seleccionado y sus datos cargados
- eliminar pide confirmación y utiliza la baja lógica existente en la API
- el catálogo local de respaldo ahora usa los cinco productos reales definidos en `data/productos.js`
- los lugares sin foto muestran un ícono de categoría; las fotos reales de producto siguen pudiéndose seleccionar desde el panel

## alcance técnico

- se mantiene React Native y Expo Go con el QR; no se genera APK ni AAB
- las fotos de perfil se guardan localmente y no se sincronizan entre dispositivos
- para subir fotos de productos a ImgBB se necesita configurar `IMGBB_API_KEY` en `backend/.env`
- los comprobantes son resúmenes internos porque los pedidos todavía se guardan localmente
- los accesos de gestión de usuarios, ventas y reportes quedan señalados como pendientes porque la API actual no tiene esas rutas
