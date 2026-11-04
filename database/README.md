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
