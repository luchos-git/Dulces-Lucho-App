-- =============================================================================
--  DULCES LUCHO — BASE DE DATOS
--  Motor: MySQL 8 / MariaDB 10.4 o más nuevo (sirve XAMPP, MySQL Workbench, etc.)
--
--  Tablas:
--    categorias      → categorías de producto (Bolsitas, Jugos, Combos)
--    productos       → catálogo del emprendimiento
--    cupones         → cupones de descuento
--    usuarios        → cuentas de clientes y administradores
--    ventas          → una fila por compra
--    detalle_ventas  → los productos que tiene cada compra
--
--  ⚠️ ESTE SCRIPT BORRA Y VUELVE A CREAR LAS TABLAS. Si ya cargaste datos reales,
--     hacé una copia de seguridad antes de volver a ejecutarlo.
--  ⚠️ Los PRECIOS de los productos son de EJEMPLO: reemplazalos por los reales.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS dulces_lucho
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dulces_lucho;
SET NAMES utf8mb4;

-- Se borran en orden inverso a las relaciones (primero las que dependen de otras)
DROP TABLE IF EXISTS detalle_ventas;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS cupones;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;

-- -----------------------------------------------------------------------------
-- CATEGORÍAS
-- -----------------------------------------------------------------------------
CREATE TABLE categorias (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- PRODUCTOS  (el id se autoincrementa solo)
-- -----------------------------------------------------------------------------
CREATE TABLE productos (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(120)  NOT NULL,
  categoria_id  INT UNSIGNED  NOT NULL,
  descripcion   TEXT          NULL,
  precio        DECIMAL(10,2) NOT NULL,
  imagen_url    VARCHAR(255)  NULL,
  activo        TINYINT(1)    NOT NULL DEFAULT 1,   -- 0 = oculto en la app (no se borra, así no se rompen las ventas viejas)
  creado_en     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_productos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT chk_productos_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- CUPONES
--   tipo 'porcentaje'  → valor = porcentaje de descuento (ej: 10)
--   tipo 'monto'       → valor = monto fijo de descuento (ej: 500)
--   tipo 'envioGratis' → no usa valor (queda en NULL)
-- -----------------------------------------------------------------------------
CREATE TABLE cupones (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  codigo       VARCHAR(30)   NOT NULL,
  tipo         ENUM('porcentaje','monto','envioGratis') NOT NULL,
  valor        DECIMAL(10,2) NULL,
  descripcion  VARCHAR(150)  NOT NULL,
  activo       TINYINT(1)    NOT NULL DEFAULT 1,
  vence_en     DATE          NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cupones_codigo (codigo),
  CONSTRAINT chk_cupones_valor CHECK (
    (tipo = 'envioGratis' AND valor IS NULL) OR (tipo <> 'envioGratis' AND valor > 0)
  )
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- USUARIOS
--   Las contraseñas y la clave única se guardan CIFRADAS (hash bcrypt), nunca en texto.
--   La app/servidor calcula el hash al crear la cuenta y usa bcrypt.compare al iniciar sesión.
--   Un administrador SIEMPRE tiene clave única; un cliente NUNCA.
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  rol               ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  clave_unica_hash  VARCHAR(255) NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  CONSTRAINT chk_usuarios_clave_unica CHECK (
    (rol = 'admin' AND clave_unica_hash IS NOT NULL) OR (rol = 'cliente' AND clave_unica_hash IS NULL)
  )
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- VENTAS  (una fila por compra)
--   total = subtotal - descuento + costo_envio
--   NO se guardan datos de tarjeta: solo el medio de pago elegido.
--   Con tarjeta la venta queda 'pagada'; con Rapipago queda 'pendiente' hasta que se abone.
-- -----------------------------------------------------------------------------
CREATE TABLE ventas (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  numero           VARCHAR(20)   NULL,
  usuario_id       INT UNSIGNED  NOT NULL,
  cupon_id         INT UNSIGNED  NULL,
  fecha            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal         DECIMAL(10,2) NOT NULL,
  descuento        DECIMAL(10,2) NOT NULL DEFAULT 0,
  costo_envio      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  metodo_pago      ENUM('credito','debito','rapipago') NOT NULL,
  estado           ENUM('pendiente','pagada','cancelada') NOT NULL DEFAULT 'pendiente',
  estado_pedido    ENUM('confirmado','preparando','en_camino','listo_para_retirar','entregado','cancelado') NOT NULL DEFAULT 'confirmado',
  codigo_rapipago  VARCHAR(20)   NULL,
  con_envio        TINYINT(1)    NOT NULL DEFAULT 0,
  direccion_envio  VARCHAR(200)  NULL,
  localidad_envio  VARCHAR(100)  NULL,
  distancia_km     DECIMAL(6,2)  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ventas_numero (numero),
  KEY idx_ventas_fecha (fecha),
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_ventas_cupon   FOREIGN KEY (cupon_id)   REFERENCES cupones (id) ON DELETE SET NULL,
  CONSTRAINT chk_ventas_total  CHECK (total = subtotal - descuento + costo_envio),
  CONSTRAINT chk_ventas_envio  CHECK (
    con_envio = 0 OR (direccion_envio IS NOT NULL AND localidad_envio IS NOT NULL AND distancia_km IS NOT NULL)
  )
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- DETALLE DE VENTAS  (los productos de cada compra)
--   precio_unitario guarda el precio AL MOMENTO de la compra: si el precio del
--   producto cambia después, las ventas viejas no se modifican.
-- -----------------------------------------------------------------------------
CREATE TABLE detalle_ventas (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  venta_id         INT UNSIGNED  NOT NULL,
  producto_id      INT UNSIGNED  NOT NULL,
  cantidad         INT UNSIGNED  NOT NULL,
  precio_unitario  DECIMAL(10,2) NOT NULL,
  subtotal         DECIMAL(10,2) AS (cantidad * precio_unitario) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_detalle_venta_producto (venta_id, producto_id),
  CONSTRAINT fk_detalle_venta    FOREIGN KEY (venta_id)    REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB;

-- =============================================================================
--  DATOS INICIALES
-- =============================================================================

INSERT INTO categorias (nombre) VALUES
  ('Bolsitas'),
  ('Jugos'),
  ('Combos');

-- ⚠️ PRECIOS DE EJEMPLO — cambialos por los reales
INSERT INTO productos (nombre, categoria_id, descripcion, precio) VALUES
  ('Bolsita Smacks 3 obleas + alfajor',
     (SELECT id FROM categorias WHERE nombre = 'Bolsitas'),
     'Bolsita sellada con 3 obleas Smacks de chocolate y un alfajor adentro.', 1500.00),
  ('Bolsita Smacks 4 obleas + alfajor',
     (SELECT id FROM categorias WHERE nombre = 'Bolsitas'),
     'Bolsita sellada con 4 obleas Smacks de chocolate y un alfajor adentro.', 1800.00),
  ('Jugo Baggio',
     (SELECT id FROM categorias WHERE nombre = 'Jugos'),
     'Jugo Baggio individual.', 700.00),
  ('Combo 3 obleas + alfajor con jugo Baggio',
     (SELECT id FROM categorias WHERE nombre = 'Combos'),
     'La bolsita de 3 obleas Smacks y alfajor, junto con un jugo Baggio.', 2100.00),
  ('Combo 4 obleas + alfajor con jugo Baggio',
     (SELECT id FROM categorias WHERE nombre = 'Combos'),
     'La bolsita de 4 obleas Smacks y alfajor, junto con un jugo Baggio.', 2400.00);

INSERT INTO cupones (codigo, tipo, valor, descripcion) VALUES
  ('DULCE10',     'porcentaje',  10.00, '10% de descuento'),
  ('LUCHO500',    'monto',      500.00, '$500 de descuento'),
  ('ENVIOGRATIS', 'envioGratis', NULL,  'Envío gratis');

-- Cuentas de prueba (las contraseñas están cifradas con bcrypt)
--   cliente@dulceslucho.com  /  cliente123
--   admin@dulceslucho.com    /  admin123   (clave única: 482913)
INSERT INTO usuarios (nombre, email, password_hash, rol, clave_unica_hash) VALUES
  ('Cliente de prueba', 'cliente@dulceslucho.com',
     '$2b$10$Mz2HmFu1ijuUwzEy7/nkS.RxvR.6Hli7gdQyGSU.S6BCU/GXftQNq', 'cliente', NULL),
  ('Administrador de prueba', 'admin@dulceslucho.com',
     '$2b$10$Kg6I/9fkqo/bYY8BlOuxj.q4GCGlRlZNfq8djcSsgTgjzMMZxFM26', 'admin',
     '$2b$10$7IdkzOsrYMHSIRw2/.t4U.6HpI12nuCVHhFaKhvu9d8ndAPwqUq/y');

-- Dos ventas de ejemplo (borralas cuando haya ventas reales)
-- Venta 1: crédito, retiro en el local, cupón DULCE10 → 3700 - 370 = 3330
INSERT INTO ventas (usuario_id, cupon_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, con_envio)
VALUES (
  (SELECT id FROM usuarios WHERE email = 'cliente@dulceslucho.com'),
  (SELECT id FROM cupones  WHERE codigo = 'DULCE10'),
  3700.00, 370.00, 0.00, 3330.00, 'credito', 'pagada', 0
);
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES
  (LAST_INSERT_ID(), (SELECT id FROM productos WHERE nombre = 'Bolsita Smacks 3 obleas + alfajor'), 2, 1500.00),
  (LAST_INSERT_ID(), (SELECT id FROM productos WHERE nombre = 'Jugo Baggio'),                       1,  700.00);

-- Venta 2: Rapipago (pendiente), con envío de 2,3 km → 2400 + 300 = 2700
INSERT INTO ventas (usuario_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, codigo_rapipago,
                    con_envio, direccion_envio, localidad_envio, distancia_km)
VALUES (
  (SELECT id FROM usuarios WHERE email = 'cliente@dulceslucho.com'),
  2400.00, 0.00, 300.00, 2700.00, 'rapipago', 'pendiente', '123456789012',
  1, 'Av. Mitre 200', 'Avellaneda', 2.30
);
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES
  (LAST_INSERT_ID(), (SELECT id FROM productos WHERE nombre = 'Combo 4 obleas + alfajor con jugo Baggio'), 1, 2400.00);
