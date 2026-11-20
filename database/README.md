# Base de datos de Dulces Lucho

| Archivo | Para qué sirve |
|---|---|
| `dulces_lucho.sql` | Crea la base `dulces_lucho` con todas las tablas y los datos iniciales |
| `consultas_ejemplo.sql` | Consultas listas para probar (catálogo, ventas, más vendidos, etc.) |

## Cómo cargarla

**Con XAMPP / phpMyAdmin**
1. Encendé *MySQL* desde el panel de XAMPP.
2. Entrá a `http://localhost/phpmyadmin`.
3. Pestaña **Importar** → elegí `dulces_lucho.sql` → **Importar**.

**Con MySQL Workbench**
1. Conectate a tu servidor local.
2. `File → Open SQL Script…` → elegí `dulces_lucho.sql`.
3. Tocá el rayo ⚡ para ejecutarlo todo.

**Con la terminal**
```
mysql -u root -p < dulces_lucho.sql
```

⚠️ El script **borra y vuelve a crear** las tablas. Si ya cargaste datos reales, hacé una copia antes de volver a ejecutarlo.

## Cuentas de prueba
- Cliente: `cliente@dulceslucho.com` / `cliente123`
- Administrador: `admin@dulceslucho.com` / `admin123` (clave única `482913`)

Las contraseñas están guardadas cifradas (bcrypt). Los precios de los productos son de ejemplo.


## diferencia entre sql y thunder client

los comandos sql se ejecutan en phpmyadmin, mysql workbench o la consola mysql. thunder client sirve para probar rutas http del backend y no ejecuta sentencias sql directamente

para consultar cuentas administradoras después de crearlas desde la app o thunder client, ejecutá `SELECT id, nombre, email, rol, activo FROM usuarios WHERE rol = 'admin';`

el alta de administradores se hace desde `POST /api/auth/registro` con el código que figura en `backend/.env` y una clave única de seis números. no hay una tabla de solicitudes pendientes para aprobar manualmente
