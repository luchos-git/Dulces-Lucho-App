# Dulces Lucho – cuenta principal, permisos e inventario

Este parche agrega el nivel de cuenta principal, permisos delegables para empleados administradores, inventario de materias primas y solicitudes de compras grandes. También muestra accesos solo a los módulos permitidos, incorpora el cambio explícito de Gmail/contraseña, restaura la carga de foto de perfil mediante archivo multipart y deja espacio inferior extra en Inicio.

## 1. Antes de reemplazar archivos

1. Cerrá Expo y el backend.
2. Hacé una copia de seguridad de la carpeta del proyecto y de la base `dulces_lucho`.
3. No reemplaces `.env` ni `backend/.env`. Este paquete no los incluye.

## 2. Configurar la única cuenta principal

Abrí `database/migracion_propietario_permisos_insumos.sql` con un editor de texto y buscá:

```sql
SET @correo_propietario = 'REEMPLAZAR_POR_EL_GMAIL_DE_LA_CUENTA_PRINCIPAL';
```

Reemplazá el texto por el Gmail de la cuenta que será propietaria. Esa cuenta debe existir previamente en `usuarios`, tener `rol = 'admin'` y `activo = 1`.

Ejemplo de formato (no uses este correo, escribí el de tu cuenta real):

```sql
SET @correo_propietario = 'cuenta.principal@gmail.com';
```

Luego, en phpMyAdmin:

1. Seleccioná la base `dulces_lucho`.
2. Abrí la pestaña **SQL**.
3. Pegá y ejecutá el contenido completo de `migracion_propietario_permisos_insumos.sql`.
4. La consulta final debe mostrar una sola fila con el Gmail y el ID de la cuenta principal.

La migración crea los permisos, la tabla singleton `propietario_sistema` y las tablas de insumos/recetas/compras. Usa `IF NOT EXISTS` / `INSERT IGNORE` para no duplicar las estructuras al volver a ejecutarla. Si ya hay una cuenta principal asignada, no la cambia.

Para comprobarlo manualmente:

```sql
SELECT ps.id AS registro_principal, u.id AS usuario_id, u.nombre, u.email, u.rol, u.activo
FROM propietario_sistema ps
JOIN usuarios u ON u.id = ps.usuario_id;
```

Debe existir exactamente una fila. **No compartas ni publiques el correo administrativo ni `ADMIN_REGISTRATION_CODE`.**

## 3. Reemplazar el código

Extraé el ZIP en la carpeta principal del proyecto, donde está `App.js`, y aceptá combinar carpetas/reemplazar archivos.

Conservá los archivos `.env` existentes. La variable `EXPO_PUBLIC_API_URL` debe seguir apuntando a la IP IPv4 actual de tu computadora, y `backend/.env` debe conservar DB e ImgBB.

## 4. Crear y autorizar empleados

1. Cada empleado que vaya a administrar módulos debe tener una cuenta con rol `admin` creada con el flujo de registro administrativo actual.
2. El empleado debe completar la verificación de acceso de administrador con su clave personal de seis números.
3. Iniciá sesión con la cuenta principal.
4. Abrí **Configuración → Administración → Permisos de empleados**.
5. Activá únicamente los módulos que correspondan y guardá.

Los administradores empleados no reciben permisos automáticamente. Sin autorización no pueden usar endpoints de administración. Si reciben `gestionar_usuarios`, pueden administrar clientes, pero no pueden deshabilitar ni dar de baja a otros administradores. Solo la cuenta principal puede delegar permisos y dar de baja empleados.

### Permisos disponibles

- `gestionar_productos`: productos y categorías.
- `gestionar_pedidos`: pedidos y ventas.
- `ver_reportes`: reportes y estadísticas.
- `gestionar_usuarios`: habilitar/deshabilitar clientes.
- `gestionar_empleados`: habilitar/deshabilitar cuentas de empleados administradores (nunca la cuenta principal).
- `gestionar_banners`: carrusel de banners.
- `configurar_tienda`: datos y medios de pago de la tienda.
- `gestionar_insumos`: materias primas, stock y recetas por producto.
- `solicitar_compras`: crear solicitudes de compras grandes a proveedores y registrar su recepción/cancelación.

## 5. Dar de baja usuarios

Desde **Configuración → Gestión de usuarios**, la cuenta principal puede dar de baja clientes o empleados. Es una baja lógica: impide nuevos accesos y revoca sus sesiones, pero conserva ventas, pedidos y comprobantes para no romper las referencias históricas. La cuenta principal no puede darse de baja a sí misma.

Los empleados con `gestionar_usuarios` solo ven clientes. Los empleados con `gestionar_empleados` pueden ver y habilitar/pausar cuentas administradoras, pero nunca la cuenta principal. La baja lógica exclusiva de la cuenta principal conserva pedidos y facturas.

## 6. Materias primas y compras grandes

Desde **Configuración → Inventario y compras grandes**:

- `gestionar_insumos`: registrar materias primas, stock mínimo y proveedor habitual; definir qué cantidad de cada insumo necesita una unidad de producto.
- `solicitar_compras`: preparar una solicitud grande a un proveedor, agregar insumos/cantidades y luego marcar la recepción o cancelación.

La solicitud queda guardada en MySQL. No se envía automáticamente por correo o a un proveedor externo.

## 7. Foto de perfil, Gmail y contraseña

- La foto se envía como base64 desde el selector de Expo a `POST /api/usuarios/:id/foto-perfil`; el backend la sube a ImgBB y guarda su URL en `usuarios.foto_perfil_url` en una sola operación. La solicitud usa el token de sesión de la cuenta.
- En **Configuración** ahora hay opciones separadas **Cambiar Gmail** y **Cambiar contraseña**. Ambas pasan por la pantalla de protección de identidad. Los administradores deben validar su contraseña, el código general configurado en backend y su clave personal de seis números.
- La API verifica formato y duplicados de Gmail; no envía un correo de confirmación.

## 8. Reiniciar y cambiar de cuenta para probar

En una terminal:

```bash
cd backend
npm start
```

En otra, desde la raíz del proyecto:

```bash
npx expo start --lan -c
```

Los tokens de sesión se guardan en memoria del backend. Después de reiniciar `npm start`, cerrá sesión e ingresá nuevamente. Para probar cliente/administrador/empleado no hace falta presionar `r`: usá **Cerrar sesión** y entrá con la otra cuenta.

La pantalla Inicio ahora tiene `paddingBottom: 120` para que los últimos productos no queden tapados por la zona inferior del sistema.

## 9. Pruebas con Thunder Client

Las solicitudes protegidas necesitan `Authorization: Bearer <sessionToken>`.

- Cliente: el `POST /api/auth/login` devuelve `sessionToken`.
- Admin: primero `POST /api/auth/login`; luego `POST /api/auth/verificar-admin` devuelve `sessionToken`.
- La app agrega ese Bearer automáticamente. En Thunder Client copiá el token de la respuesta y agregalo como header para probar rutas manualmente.
- Para probar la foto de perfil, usá `POST /api/usuarios/:id/foto-perfil` con `Authorization: Bearer <sessionToken>` y JSON `{ "image": "BASE64_DE_LA_IMAGEN" }`. La respuesta incluye `fotoPerfilUrl` si se subió y guardó correctamente.

Rutas principales (la URL base es `http://localhost:3000/api`):

| Método | Ruta | Quién puede usarla |
|---|---|---|
| GET | `/owner/empleados` | Cuenta principal |
| PUT | `/owner/empleados/:id/permisos` | Cuenta principal |
| DELETE | `/owner/usuarios/:id` | Cuenta principal; baja lógica |
| GET | `/admin/insumos?adminId=ID` | Cuenta principal o empleado autorizado |
| POST | `/admin/insumos` | `gestionar_insumos` |
| POST | `/admin/insumos/recetas` | `gestionar_insumos` |
| POST | `/admin/compras-insumos` | `solicitar_compras` |
| PATCH | `/admin/compras-insumos/:id/estado` | `solicitar_compras` |
| GET | `/estado` | Diagnóstico de MySQL y tablas requeridas |

Para crear una solicitud de compra:

```json
{
  "adminId": 12,
  "proveedor": "Proveedor de materias primas",
  "notas": "Compra grande del mes",
  "items": [
    { "insumoId": 1, "cantidad": 25 },
    { "insumoId": 2, "cantidad": 10 }
  ]
}
```

Reemplazá `adminId` e `insumoId` por los IDs que devuelve tu propia base. No uses esos números de ejemplo como valores reales.
