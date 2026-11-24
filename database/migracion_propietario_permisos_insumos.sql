-- Dulces Lucho: cuenta principal, permisos delegados e inventario de insumos.
-- Ejecutar UNA VEZ en phpMyAdmin > dulces_lucho > SQL.
-- No elimina cuentas, productos, recetas, pedidos ni comprobantes existentes.

USE dulces_lucho;

-- Permisos granulares de cada cuenta con rol admin. La cuenta propietaria siempre tiene todos.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS permisos_admin_json LONGTEXT NULL;

UPDATE usuarios SET permisos_admin_json = '[]'
WHERE rol = 'admin' AND permisos_admin_json IS NULL;

-- Esta tabla es deliberadamente singleton: solo puede existir el registro id=1.
-- Asigná la cuenta principal en el bloque de inicialización al final de este archivo.
CREATE TABLE IF NOT EXISTS propietario_sistema (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  usuario_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_propietario_usuario (usuario_id),
  CONSTRAINT chk_propietario_unico CHECK (id = 1),
  CONSTRAINT fk_propietario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insumos o materias primas que forman parte de los productos.
CREATE TABLE IF NOT EXISTS insumos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  unidad VARCHAR(20) NOT NULL DEFAULT 'unidad',
  stock_actual DECIMAL(12,3) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(12,3) NOT NULL DEFAULT 0,
  proveedor VARCHAR(150) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_insumos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Receta: cantidad de insumo necesaria para producir UNA unidad del producto.
CREATE TABLE IF NOT EXISTS recetas_productos (
  producto_id INT UNSIGNED NOT NULL,
  insumo_id INT UNSIGNED NOT NULL,
  cantidad_por_producto DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (producto_id, insumo_id),
  CONSTRAINT fk_receta_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_receta_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id),
  CONSTRAINT chk_receta_cantidad CHECK (cantidad_por_producto > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Solicitudes de compra mayorista a proveedores.
CREATE TABLE IF NOT EXISTS compras_insumos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero VARCHAR(30) NOT NULL,
  proveedor VARCHAR(150) NOT NULL,
  estado ENUM('solicitado','recibido','cancelado') NOT NULL DEFAULT 'solicitado',
  notas VARCHAR(500) NULL,
  creado_por_usuario_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_compras_insumos_numero (numero),
  CONSTRAINT fk_compras_insumos_usuario FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_compras_insumos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  compra_id INT UNSIGNED NOT NULL,
  insumo_id INT UNSIGNED NOT NULL,
  cantidad DECIMAL(12,3) NOT NULL,
  costo_unitario DECIMAL(12,2) NULL,
  PRIMARY KEY (id),
  KEY idx_detalle_compras_insumos_compra (compra_id),
  CONSTRAINT fk_detalle_compra_insumo FOREIGN KEY (compra_id) REFERENCES compras_insumos(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id),
  CONSTRAINT chk_compra_insumo_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ASIGNACIÓN INICIAL DE LA CUENTA PRINCIPAL (EJECUTAR UNA SOLA VEZ)
-- Reemplazá el correo por el de una cuenta que YA exista y tenga rol='admin'.
-- Si el correo no corresponde a un admin activo, no se asigna ninguna cuenta.
-- No reemplaces ni ejecutes este bloque con otro correo si ya existe propietario.
-- ============================================================================
SET @correo_propietario = 'REEMPLAZAR_POR_EL_GMAIL_DE_LA_CUENTA_PRINCIPAL';

INSERT IGNORE INTO propietario_sistema (id, usuario_id)
SELECT 1, u.id
FROM usuarios u
WHERE LOWER(u.email) = LOWER(@correo_propietario)
  AND u.rol = 'admin'
  AND u.activo = 1
  AND NOT EXISTS (SELECT 1 FROM propietario_sistema WHERE id = 1)
LIMIT 1;

-- Comprobá la asignación. Debe devolver exactamente una fila y el Gmail correcto.
SELECT ps.id AS registro_principal, u.id AS usuario_id, u.nombre, u.email, u.rol, u.activo
FROM propietario_sistema ps
INNER JOIN usuarios u ON u.id = ps.usuario_id;

-- Comprobaciones auxiliares:
-- SHOW COLUMNS FROM usuarios LIKE 'permisos_admin_json';
-- SHOW TABLES LIKE 'insumos';
-- SHOW TABLES LIKE 'recetas_productos';
-- SHOW TABLES LIKE 'compras_insumos';
-- SHOW TABLES LIKE 'detalle_compras_insumos';
