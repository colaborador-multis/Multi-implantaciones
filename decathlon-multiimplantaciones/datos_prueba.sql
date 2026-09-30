-- ==============================================================================
-- DATOS DE PRUEBA - DECATHLON MULTIIMPLANTACIONES Y VENTAS
-- Ejecuta este script en el SQL Editor de Supabase (despues del schema base).
-- Incluye 4 usuarios, 10 productos, 5 multiimplantaciones y ventas semanales
-- con datos reales para que la grafica de comparacion funcione.
-- ==============================================================================

-- Limpia datos anteriores (orden correcto por FK)
DELETE FROM venta_semanal;
DELETE FROM producto_multi;
DELETE FROM multiimplantacion;
DELETE FROM producto;
DELETE FROM usuario WHERE nombre != 'admin';

-- ==============================================================================
-- 1. USUARIOS (3 roles distintos)
-- ==============================================================================
INSERT INTO usuario (nombre, contraseña, rol) VALUES
  ('maria_lopez',  'decathlon2024', 'Asesor comercial'),
  ('carlos_ruiz',  'tienda2024',    'Responsable de tienda'),
  ('ana_jimenez',  'decathlon2024', 'Asesor comercial'),
  ('pedro_santos', 'tienda2024',    'Asesor comercial')
ON CONFLICT (nombre) DO NOTHING;

-- ==============================================================================
-- 2. PRODUCTOS (10 articulos de distintas categorias)
-- ==============================================================================
INSERT INTO producto (nombre, referencia, categoria) VALUES
  ('Mochila Quechua 20L Senderismo',   'DEC-8492019', 'montana'),
  ('Zapatilla Kalenji Run Active',      'DEC-2831045', 'running'),
  ('Chaleco Domyos Fitness Hombre',     'DEC-5510234', 'fitness'),
  ('Tabla Paddle Surf Itiwit 10 pies',  'DEC-9021847', 'agua'),
  ('Bicicleta Eliptica Domyos EL120',   'DEC-3847201', 'fitness'),
  ('Casco MTB Rockrider ST 500',        'DEC-7293018', 'montana'),
  ('Gafas Natacion Nabaiji One Size',   'DEC-6108392', 'agua'),
  ('Camiseta Running Kiprun Dry+',      'DEC-1029384', 'running'),
  ('Pesa Rusa Kettlebell 12kg Domyos',  'DEC-4857263', 'fitness'),
  ('Botas Senderismo Forclaz 500',      'DEC-8374920', 'montana')
ON CONFLICT (referencia) DO NOTHING;

-- ==============================================================================
-- 3. MULTIIMPLANTACIONES + PRODUCTOS VINCULADOS
-- Los UUIDs se obtienen dinamicamente (sin hardcodear IDs)
-- ==============================================================================

-- [ACTIVA] Zapatilla Kalenji en cabecera pasillo - creada por maria_lopez (sem 32 = 01-Aug-2026)
WITH u AS (SELECT id_usuario FROM usuario WHERE nombre = 'maria_lopez' LIMIT 1),
     m AS (
       INSERT INTO multiimplantacion (id_usuario, fecha_inicio, ubicacion, modificado_por, modificado_en)
       SELECT u.id_usuario, '2026-08-01', 'Cabecera Pasillo 2 - Calzado', u.id_usuario, NOW() FROM u
       RETURNING id_multiimplantacion
     )
INSERT INTO producto_multi (id_producto, id_multiimplantacion, fecha_inicio, fecha_fin)
SELECT p.id_producto, m.id_multiimplantacion, '2026-08-01', NULL
FROM producto p, m WHERE p.referencia = 'DEC-2831045';

-- [FINALIZADA] Chaleco Domyos en isla cajas - creada por ana_jimenez, finalizada por carlos_ruiz
WITH u_c AS (SELECT id_usuario FROM usuario WHERE nombre = 'ana_jimenez'  LIMIT 1),
     u_m AS (SELECT id_usuario FROM usuario WHERE nombre = 'carlos_ruiz' LIMIT 1),
     m AS (
       INSERT INTO multiimplantacion (id_usuario, fecha_inicio, ubicacion, modificado_por, modificado_en)
       SELECT u_c.id_usuario, '2026-06-10', 'Isla Zona Cajas Rapidas', u_m.id_usuario, '2026-07-15T14:30:00Z'
       FROM u_c, u_m
       RETURNING id_multiimplantacion
     )
INSERT INTO producto_multi (id_producto, id_multiimplantacion, fecha_inicio, fecha_fin)
SELECT p.id_producto, m.id_multiimplantacion, '2026-06-10', '2026-07-15'
FROM producto p, m WHERE p.referencia = 'DEC-5510234';

-- [ACTIVA 2 productos] Mochila + Botas en entrada principal - creada por pedro_santos
WITH u AS (SELECT id_usuario FROM usuario WHERE nombre = 'pedro_santos' LIMIT 1),
     m AS (
       INSERT INTO multiimplantacion (id_usuario, fecha_inicio, ubicacion, modificado_por, modificado_en)
       SELECT u.id_usuario, '2026-09-01', 'Entrada Principal - Zona Montana', u.id_usuario, NOW() FROM u
       RETURNING id_multiimplantacion
     )
INSERT INTO producto_multi (id_producto, id_multiimplantacion, fecha_inicio, fecha_fin)
SELECT p.id_producto, m.id_multiimplantacion, '2026-09-01', NULL
FROM producto p, m WHERE p.referencia IN ('DEC-8492019', 'DEC-8374920');

-- [ACTIVA] Kettlebell junto a maquinas cardio - creada por maria_lopez (sem 30 = 20-Jul-2026)
WITH u AS (SELECT id_usuario FROM usuario WHERE nombre = 'maria_lopez' LIMIT 1),
     m AS (
       INSERT INTO multiimplantacion (id_usuario, fecha_inicio, ubicacion, modificado_por, modificado_en)
       SELECT u.id_usuario, '2026-07-20', 'Junto a Maquinas Cardio - Fitness', u.id_usuario, NOW() FROM u
       RETURNING id_multiimplantacion
     )
INSERT INTO producto_multi (id_producto, id_multiimplantacion, fecha_inicio, fecha_fin)
SELECT p.id_producto, m.id_multiimplantacion, '2026-07-20', NULL
FROM producto p, m WHERE p.referencia = 'DEC-4857263';

-- [FINALIZADA] Gafas natacion en vidriera - creada por ana_jimenez (sem 19 = 05-May-2026)
WITH u AS (SELECT id_usuario FROM usuario WHERE nombre = 'ana_jimenez' LIMIT 1),
     m AS (
       INSERT INTO multiimplantacion (id_usuario, fecha_inicio, ubicacion, modificado_por, modificado_en)
       SELECT u.id_usuario, '2026-05-05', 'Vidriera Exterior - Temporada Agua', u.id_usuario, '2026-06-30T10:00:00Z' FROM u
       RETURNING id_multiimplantacion
     )
INSERT INTO producto_multi (id_producto, id_multiimplantacion, fecha_inicio, fecha_fin)
SELECT p.id_producto, m.id_multiimplantacion, '2026-05-05', '2026-06-30'
FROM producto p, m WHERE p.referencia = 'DEC-6108392';

-- ==============================================================================
-- 4. VENTAS SEMANALES
-- Diseñadas para mostrar impacto visible en Comparar & Evaluar
-- ==============================================================================

-- Zapatilla Kalenji (multi inicio 01-Aug = sem 32):
--   Antes sem 20-31: ~4 uds/sem  |  Durante sem 32-36: ~14 uds/sem  => +250%
INSERT INTO venta_semanal (id_producto, semana, año, unidades_vendidas)
SELECT p.id_producto, s.semana, 2026, s.uds
FROM producto p,
  (VALUES (20,4),(21,3),(22,5),(23,4),(24,6),(25,3),(26,4),(27,5),(28,4),(29,3),(30,4),(31,5),
          (32,12),(33,15),(34,11),(35,18),(36,14)) AS s(semana, uds)
WHERE p.referencia = 'DEC-2831045'
ON CONFLICT (id_producto, semana, año) DO NOTHING;

-- Chaleco Domyos (multi inicio 10-Jun = sem 24):
--   Antes sem 18-23: ~6.5 uds/sem  |  Durante sem 24-29: ~11.5 uds/sem  => +77%
INSERT INTO venta_semanal (id_producto, semana, año, unidades_vendidas)
SELECT p.id_producto, s.semana, 2026, s.uds
FROM producto p,
  (VALUES (18,6),(19,7),(20,5),(21,8),(22,6),(23,7),
          (24,10),(25,13),(26,12),(27,9),(28,14),(29,11)) AS s(semana, uds)
WHERE p.referencia = 'DEC-5510234'
ON CONFLICT (id_producto, semana, año) DO NOTHING;

-- Gafas Natacion (multi inicio 05-May = sem 19):
--   Antes sem 14-18: ~3.8 uds/sem  |  Durante sem 19-26: ~16.9 uds/sem  => +345%
INSERT INTO venta_semanal (id_producto, semana, año, unidades_vendidas)
SELECT p.id_producto, s.semana, 2026, s.uds
FROM producto p,
  (VALUES (14,3),(15,4),(16,3),(17,5),(18,4),
          (19,9),(20,14),(21,18),(22,22),(23,20),(24,16),(25,19),(26,17)) AS s(semana, uds)
WHERE p.referencia = 'DEC-6108392'
ON CONFLICT (id_producto, semana, año) DO NOTHING;

-- Kettlebell 12kg (multi inicio 20-Jul = sem 30):
--   Antes sem 27-29: ~3 uds/sem  |  Durante sem 30-36: ~9.4 uds/sem  => +213%
INSERT INTO venta_semanal (id_producto, semana, año, unidades_vendidas)
SELECT p.id_producto, s.semana, 2026, s.uds
FROM producto p,
  (VALUES (27,3),(28,2),(29,4),
          (30,7),(31,9),(32,8),(33,11),(34,10),(35,9),(36,12)) AS s(semana, uds)
WHERE p.referencia = 'DEC-4857263'
ON CONFLICT (id_producto, semana, año) DO NOTHING;

-- Mochila Quechua (sem 25-36, datos generales sin multi evaluable aun)
INSERT INTO venta_semanal (id_producto, semana, año, unidades_vendidas)
SELECT p.id_producto, s.semana, 2026, s.uds
FROM producto p,
  (VALUES (25,2),(26,3),(27,4),(28,3),(29,5),(30,4),(31,6),(32,5),(33,7),(34,8),(35,7),(36,9)) AS s(semana, uds)
WHERE p.referencia = 'DEC-8492019'
ON CONFLICT (id_producto, semana, año) DO NOTHING;

-- ==============================================================================
SELECT 'Datos de prueba cargados exitosamente' AS resultado;

-- CREDENCIALES PARA LOGIN EN LA APP:
--   admin         / admin123      -> Administrador
--   maria_lopez   / decathlon2024 -> Asesor comercial  (creo 2 multis)
--   carlos_ruiz   / tienda2024    -> Responsable de tienda (finalizo 1 multi)
--   ana_jimenez   / decathlon2024 -> Asesor comercial  (creo 2 multis)
--   pedro_santos  / tienda2024    -> Asesor comercial  (creo 1 multi con 2 productos)
--
-- PARA PROBAR LA GRAFICA en Comparar & Evaluar:
--   Cabecera Pasillo 2 -> Zapatilla Kalenji  => +250% impacto
--   Vidriera Exterior  -> Gafas Natacion     => +345% impacto
--   Maquinas Cardio    -> Kettlebell 12kg    => +213% impacto
--   Isla Cajas         -> Chaleco Domyos     => +77%  impacto
-- ==============================================================================
