-- Dulces Lucho: stock de productos terminados, proveedores y pedidos de reposición.
-- No elimina ni modifica las tablas antiguas de insumos; la aplicación deja de utilizarlas.

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS stock_disponible INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_minimo INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destacado_dia TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destacado_orden INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proveedor_id INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS dias_reposicion_estimados INT UNSIGNED NOT NULL DEFAULT 7;

CREATE TABLE IF NOT EXISTS proveedores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(120) NULL,
  telefono VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  localidad VARCHAR(100) NULL,
  plazo_entrega_dias INT UNSIGNED NOT NULL DEFAULT 7,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_proveedores_nombre (nombre)
);

CREATE TABLE IF NOT EXISTS pedidos_proveedor (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero VARCHAR(30) NOT NULL,
  proveedor_id INT UNSIGNED NOT NULL,
  tipo VARCHAR(25) NOT NULL DEFAULT 'reposicion',
  estado VARCHAR(25) NOT NULL DEFAULT 'solicitado',
  fecha_estimada_recepcion DATE NULL,
  notas VARCHAR(500) NULL,
  creado_por_usuario_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recibido_en DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_proveedor_numero (numero),
  KEY idx_pedidos_proveedor_estado (estado),
  KEY idx_pedidos_proveedor_fecha (fecha_estimada_recepcion)
);

CREATE TABLE IF NOT EXISTS detalle_pedidos_proveedor (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_proveedor_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  cantidad_solicitada INT UNSIGNED NOT NULL,
  cantidad_recibida INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_detalle_pedido_producto (pedido_proveedor_id, producto_id),
  KEY idx_detalle_pedido_producto (producto_id)
);

CREATE TABLE IF NOT EXISTS pedidos_anticipados (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero VARCHAR(30) NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  fecha_deseada DATE NOT NULL,
  modalidad_entrega VARCHAR(20) NOT NULL,
  direccion VARCHAR(200) NULL,
  localidad VARCHAR(100) NULL,
  metodo_pago VARCHAR(20) NOT NULL,
  fecha_estimada_reposicion DATE NULL,
  plazo_estimado_dias INT UNSIGNED NOT NULL DEFAULT 7,
  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_reposicion',
  notas VARCHAR(500) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_anticipados_numero (numero),
  KEY idx_pedidos_anticipados_usuario (usuario_id),
  KEY idx_pedidos_anticipados_producto_estado (producto_id, estado)
);

-- Los productos existentes quedan con stock 0 hasta que administración cargue el conteo real.
-- No se inventa una cantidad inicial para no vender mercadería que quizá no está disponible.
