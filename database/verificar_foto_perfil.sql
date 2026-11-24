-- Ejecutar en phpMyAdmin > Base dulces_lucho > SQL.
-- Consulta de verificación, no modifica datos.
USE dulces_lucho;
SHOW COLUMNS FROM usuarios LIKE 'foto_perfil_url';
SELECT id, nombre, email, foto_perfil_url FROM usuarios ORDER BY id;
