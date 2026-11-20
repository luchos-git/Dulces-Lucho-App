-- explicación del archivo: crea la base de datos, borra y vuelve a crear sus tablas y carga los registros iniciales para el funcionamiento de la app

CREATE DATABASE IF NOT EXISTS dulces_lucho
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dulces_lucho;
SET NAMES utf8mb4;


DROP TABLE IF EXISTS detalle_ventas;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS cupones;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;

CREATE TABLE categorias (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(60)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB;


CREATE TABLE productos ( 
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT, 
  nombre        VARCHAR(120)  NOT NULL, 
  categoria_id  INT UNSIGNED  NOT NULL, 
  descripcion   TEXT          NULL, 
  precio        DECIMAL(10,2) NOT NULL, 
  imagen_url    VARCHAR(255)  NULL,
  imagenes_json LONGTEXT      NULL,
  activo        TINYINT(1)    NOT NULL DEFAULT 1, 
  creado_en     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  PRIMARY KEY (id), 
  CONSTRAINT fk_productos_categoria 
    FOREIGN KEY (categoria_id) REFERENCES categorias (id), 
  CONSTRAINT chk_productos_precio CHECK (precio >= 0) 
) ENGINE=InnoDB; 
 
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
 
INSERT INTO categorias (nombre) VALUES 
  ('Bolsitas'), 
  ('Jugos'), 
  ('Combos'); 
 
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
 
INSERT INTO usuarios (nombre, email, password_hash, rol, clave_unica_hash) VALUES 
  ('Cliente de prueba', 'cliente@dulceslucho.com', 
     '$2b$10$Mz2HmFu1ijuUwzEy7/nkS.RxvR.6Hli7gdQyGSU.S6BCU/GXftQNq', 'cliente', NULL), 
  ('Administrador de prueba', 'admin@dulceslucho.com', 
     '$2b$10$Kg6I/9fkqo/bYY8BlOuxj.q4GCGlRlZNfq8djcSsgTgjzMMZxFM26', 'admin', 
     '$2b$10$7IdkzOsrYMHSIRw2/.t4U.6HpI12nuCVHhFaKhvu9d8ndAPwqUq/y'); 
 
INSERT INTO ventas (usuario_id, cupon_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, con_envio) 
VALUES ( 
  (SELECT id FROM usuarios WHERE email = 'cliente@dulceslucho.com'), 
  (SELECT id FROM cupones  WHERE codigo = 'DULCE10'), 
  3700.00, 370.00, 0.00, 3330.00, 'credito', 'pagada', 0 
); 
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES 
  (LAST_INSERT_ID(), (SELECT id FROM productos WHERE nombre = 'Bolsita Smacks 3 obleas + alfajor'), 2, 1500.00), 
  (LAST_INSERT_ID(), (SELECT id FROM productos WHERE nombre = 'Jugo Baggio'),                       1,  700.00); 
  
INSERT INTO ventas (usuario_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, codigo_rapipago, 
                    con_envio, direccion_envio, localidad_envio, distancia_km) 
VALUES ( 
  (SELECT id FROM usuarios WHERE email = 'cliente@dulceslucho.com'), 
  2400.00, 0.00, 300.00, 2700.00, 'rapipago', 'pendiente', '123456789012', 
  1, 'Av. Mitre 200', 'Avellaneda', 2.30 
); 
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES 
  (LAST_INSERT_ID(), (SELECT id FROM productos WHERE nombre = 'Combo 4 obleas + alfajor con jugo Baggio'), 1, 2400.00); 
