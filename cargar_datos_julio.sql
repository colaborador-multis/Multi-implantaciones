-- ==============================================================================
-- CARGA DE CATÁLOGO Y VENTAS DEL MES DE JULIO - DECATHLON
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Limpieza de datos anteriores respetando integridad referencial
DELETE FROM venta_semanal;
DELETE FROM producto_multi;
DELETE FROM multiimplantacion;
DELETE FROM producto;
DELETE FROM categoria; -- Categorías eliminadas como se solicitó para configuración manual

-- 2. Permitir que la columna categoria en producto acepte valor nulo o por defecto
ALTER TABLE producto ALTER COLUMN categoria DROP NOT NULL;
ALTER TABLE producto ALTER COLUMN categoria SET DEFAULT 'Sin categoría';

-- 3. Habilitar permisos completos de inserción y modificación sin bloqueo RLS en categoría
ALTER TABLE categoria DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE categoria TO anon, authenticated;

-- 4. Inserción de los 31 productos oficiales (Sin categoría para asignación manual)
INSERT INTO producto (nombre, referencia, categoria) VALUES
  ('MINI PILATES BAND X3', '8528803', 'Sin categoría'),
  ('MF L BICOLOR BLUE GREEN', '8751556', 'Sin categoría'),
  ('MF L NEW NERO', '8926376', 'Sin categoría'),
  ('RUN500 THIN INV X2 BLACK', '8810965', 'Sin categoría'),
  ('BOTTLE MH100 ECOZEN 0,8L', '8797897', 'Sin categoría'),
  ('EARPLUG SILICONE', '8968116', 'Sin categoría'),
  ('HAT HIKE 100 BLUE', '8788198', 'Sin categoría'),
  ('FABRIC GLUTE BAND MEDIUM', '8970513', 'Sin categoría'),
  ('FITNESS MAT COMFORT 500 C1', '8851735', 'Sin categoría'),
  ('HEADLAMP HL100 USB  120LM BLUE', '8505682', 'Sin categoría'),
  ('FABRIC GLUTE BAND EXTRA - LIGHT', '8901461', 'Sin categoría'),
  ('PILATES BAND LIGHT', '8527896', 'Sin categoría'),
  ('PILATES BAND HARD', '8527901', 'Sin categoría'),
  ('PLASTIC WHISTLE', '8027254', 'Sin categoría'),
  ('NECK GAITER HIKE 100 GREY', '8965251', 'Sin categoría'),
  ('WEIGHTED BRACELETS B LIGHT GREEN 0.5KG', '8800661', 'Sin categoría'),
  ('LIFTING GLOVE (GREEN)', '8883188', 'Sin categoría'),
  ('AMI-ADIDAS-VISOR CLIMACOOL BLACK', '9012881', 'Sin categoría'),
  ('RAINCOVER 20/40 L', '8734213', 'Sin categoría'),
  ('HEADLAMP ONNIGHT100  80LM BLACK', '8384991', 'Sin categoría'),
  ('VIRALTO II MID GRIP SOCKS BLACK', '8932730', 'Sin categoría'),
  ('ARM COVER BLACK 20\'', '8586545', 'Sin categoría'),
  ('WRIST STRAP V3 BLACK', '8588907', 'Sin categoría'),
  ('MH500 BLACK C3', '8559273', 'Sin categoría'),
  ('ROADR 100 CAT 0', '8118518', 'Sin categoría'),
  ('GOGGLES 500 SPIRIT L CLEAR BLUE WHITE', '8797574', 'Sin categoría'),
  ('CAP 500 SILICONE LONG HAIR REC BLACK', '8797251', 'Sin categoría'),
  ('MASK JR 100 COMFORT NO FOG LIGHT GREEN', '8943793', 'Sin categoría'),
  ('CUP 500 STAINLESS STEEL 0,3L GREEN', '8920292', 'Sin categoría'),
  ('AMI - TECHTEX SPORT WASH SHAMPOO', '8894841', 'Sin categoría'),
  ('RAINCOVER FOR 40/60L BACKPACK', '8559822', 'Sin categoría');

-- 4. Inserción de ventas semanales del mes de Julio 2026 (Total exacto: 569 unidades)
INSERT INTO venta_semanal (id_producto, semana, año, unidades_vendidas)
SELECT id_producto, 27, 2026, 26 FROM producto WHERE referencia = '8528803'
UNION ALL
SELECT id_producto, 28, 2026, 26 FROM producto WHERE referencia = '8528803'
UNION ALL
SELECT id_producto, 29, 2026, 26 FROM producto WHERE referencia = '8528803'
UNION ALL
SELECT id_producto, 30, 2026, 26 FROM producto WHERE referencia = '8528803'
UNION ALL
SELECT id_producto, 27, 2026, 18 FROM producto WHERE referencia = '8751556'
UNION ALL
SELECT id_producto, 28, 2026, 18 FROM producto WHERE referencia = '8751556'
UNION ALL
SELECT id_producto, 29, 2026, 17 FROM producto WHERE referencia = '8751556'
UNION ALL
SELECT id_producto, 30, 2026, 17 FROM producto WHERE referencia = '8751556'
UNION ALL
SELECT id_producto, 27, 2026, 14 FROM producto WHERE referencia = '8926376'
UNION ALL
SELECT id_producto, 28, 2026, 13 FROM producto WHERE referencia = '8926376'
UNION ALL
SELECT id_producto, 29, 2026, 13 FROM producto WHERE referencia = '8926376'
UNION ALL
SELECT id_producto, 30, 2026, 13 FROM producto WHERE referencia = '8926376'
UNION ALL
SELECT id_producto, 27, 2026, 13 FROM producto WHERE referencia = '8810965'
UNION ALL
SELECT id_producto, 28, 2026, 13 FROM producto WHERE referencia = '8810965'
UNION ALL
SELECT id_producto, 29, 2026, 12 FROM producto WHERE referencia = '8810965'
UNION ALL
SELECT id_producto, 30, 2026, 12 FROM producto WHERE referencia = '8810965'
UNION ALL
SELECT id_producto, 27, 2026, 9 FROM producto WHERE referencia = '8797897'
UNION ALL
SELECT id_producto, 28, 2026, 9 FROM producto WHERE referencia = '8797897'
UNION ALL
SELECT id_producto, 29, 2026, 9 FROM producto WHERE referencia = '8797897'
UNION ALL
SELECT id_producto, 30, 2026, 8 FROM producto WHERE referencia = '8797897'
UNION ALL
SELECT id_producto, 27, 2026, 7 FROM producto WHERE referencia = '8968116'
UNION ALL
SELECT id_producto, 28, 2026, 7 FROM producto WHERE referencia = '8968116'
UNION ALL
SELECT id_producto, 29, 2026, 7 FROM producto WHERE referencia = '8968116'
UNION ALL
SELECT id_producto, 30, 2026, 6 FROM producto WHERE referencia = '8968116'
UNION ALL
SELECT id_producto, 27, 2026, 7 FROM producto WHERE referencia = '8788198'
UNION ALL
SELECT id_producto, 28, 2026, 7 FROM producto WHERE referencia = '8788198'
UNION ALL
SELECT id_producto, 29, 2026, 6 FROM producto WHERE referencia = '8788198'
UNION ALL
SELECT id_producto, 30, 2026, 6 FROM producto WHERE referencia = '8788198'
UNION ALL
SELECT id_producto, 27, 2026, 5 FROM producto WHERE referencia = '8970513'
UNION ALL
SELECT id_producto, 28, 2026, 5 FROM producto WHERE referencia = '8970513'
UNION ALL
SELECT id_producto, 29, 2026, 4 FROM producto WHERE referencia = '8970513'
UNION ALL
SELECT id_producto, 30, 2026, 4 FROM producto WHERE referencia = '8970513'
UNION ALL
SELECT id_producto, 27, 2026, 5 FROM producto WHERE referencia = '8851735'
UNION ALL
SELECT id_producto, 28, 2026, 5 FROM producto WHERE referencia = '8851735'
UNION ALL
SELECT id_producto, 29, 2026, 4 FROM producto WHERE referencia = '8851735'
UNION ALL
SELECT id_producto, 30, 2026, 4 FROM producto WHERE referencia = '8851735'
UNION ALL
SELECT id_producto, 27, 2026, 5 FROM producto WHERE referencia = '8505682'
UNION ALL
SELECT id_producto, 28, 2026, 5 FROM producto WHERE referencia = '8505682'
UNION ALL
SELECT id_producto, 29, 2026, 4 FROM producto WHERE referencia = '8505682'
UNION ALL
SELECT id_producto, 30, 2026, 4 FROM producto WHERE referencia = '8505682'
UNION ALL
SELECT id_producto, 27, 2026, 4 FROM producto WHERE referencia = '8901461'
UNION ALL
SELECT id_producto, 28, 2026, 4 FROM producto WHERE referencia = '8901461'
UNION ALL
SELECT id_producto, 29, 2026, 3 FROM producto WHERE referencia = '8901461'
UNION ALL
SELECT id_producto, 30, 2026, 3 FROM producto WHERE referencia = '8901461'
UNION ALL
SELECT id_producto, 27, 2026, 4 FROM producto WHERE referencia = '8527896'
UNION ALL
SELECT id_producto, 28, 2026, 4 FROM producto WHERE referencia = '8527896'
UNION ALL
SELECT id_producto, 29, 2026, 3 FROM producto WHERE referencia = '8527896'
UNION ALL
SELECT id_producto, 30, 2026, 3 FROM producto WHERE referencia = '8527896'
UNION ALL
SELECT id_producto, 27, 2026, 4 FROM producto WHERE referencia = '8527901'
UNION ALL
SELECT id_producto, 28, 2026, 3 FROM producto WHERE referencia = '8527901'
UNION ALL
SELECT id_producto, 29, 2026, 3 FROM producto WHERE referencia = '8527901'
UNION ALL
SELECT id_producto, 30, 2026, 3 FROM producto WHERE referencia = '8527901'
UNION ALL
SELECT id_producto, 27, 2026, 3 FROM producto WHERE referencia = '8027254'
UNION ALL
SELECT id_producto, 28, 2026, 3 FROM producto WHERE referencia = '8027254'
UNION ALL
SELECT id_producto, 29, 2026, 3 FROM producto WHERE referencia = '8027254'
UNION ALL
SELECT id_producto, 30, 2026, 3 FROM producto WHERE referencia = '8027254'
UNION ALL
SELECT id_producto, 27, 2026, 3 FROM producto WHERE referencia = '8965251'
UNION ALL
SELECT id_producto, 28, 2026, 3 FROM producto WHERE referencia = '8965251'
UNION ALL
SELECT id_producto, 29, 2026, 3 FROM producto WHERE referencia = '8965251'
UNION ALL
SELECT id_producto, 30, 2026, 3 FROM producto WHERE referencia = '8965251'
UNION ALL
SELECT id_producto, 27, 2026, 3 FROM producto WHERE referencia = '8800661'
UNION ALL
SELECT id_producto, 28, 2026, 3 FROM producto WHERE referencia = '8800661'
UNION ALL
SELECT id_producto, 29, 2026, 3 FROM producto WHERE referencia = '8800661'
UNION ALL
SELECT id_producto, 30, 2026, 2 FROM producto WHERE referencia = '8800661'
UNION ALL
SELECT id_producto, 27, 2026, 3 FROM producto WHERE referencia = '8883188'
UNION ALL
SELECT id_producto, 28, 2026, 2 FROM producto WHERE referencia = '8883188'
UNION ALL
SELECT id_producto, 29, 2026, 2 FROM producto WHERE referencia = '8883188'
UNION ALL
SELECT id_producto, 30, 2026, 2 FROM producto WHERE referencia = '8883188'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '9012881'
UNION ALL
SELECT id_producto, 28, 2026, 2 FROM producto WHERE referencia = '9012881'
UNION ALL
SELECT id_producto, 29, 2026, 2 FROM producto WHERE referencia = '9012881'
UNION ALL
SELECT id_producto, 30, 2026, 2 FROM producto WHERE referencia = '9012881'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '8734213'
UNION ALL
SELECT id_producto, 28, 2026, 2 FROM producto WHERE referencia = '8734213'
UNION ALL
SELECT id_producto, 29, 2026, 2 FROM producto WHERE referencia = '8734213'
UNION ALL
SELECT id_producto, 30, 2026, 2 FROM producto WHERE referencia = '8734213'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '8384991'
UNION ALL
SELECT id_producto, 28, 2026, 2 FROM producto WHERE referencia = '8384991'
UNION ALL
SELECT id_producto, 29, 2026, 2 FROM producto WHERE referencia = '8384991'
UNION ALL
SELECT id_producto, 30, 2026, 2 FROM producto WHERE referencia = '8384991'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '8932730'
UNION ALL
SELECT id_producto, 28, 2026, 2 FROM producto WHERE referencia = '8932730'
UNION ALL
SELECT id_producto, 29, 2026, 2 FROM producto WHERE referencia = '8932730'
UNION ALL
SELECT id_producto, 30, 2026, 1 FROM producto WHERE referencia = '8932730'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '8586545'
UNION ALL
SELECT id_producto, 28, 2026, 2 FROM producto WHERE referencia = '8586545'
UNION ALL
SELECT id_producto, 29, 2026, 1 FROM producto WHERE referencia = '8586545'
UNION ALL
SELECT id_producto, 30, 2026, 1 FROM producto WHERE referencia = '8586545'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '8588907'
UNION ALL
SELECT id_producto, 28, 2026, 1 FROM producto WHERE referencia = '8588907'
UNION ALL
SELECT id_producto, 29, 2026, 1 FROM producto WHERE referencia = '8588907'
UNION ALL
SELECT id_producto, 30, 2026, 1 FROM producto WHERE referencia = '8588907'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '8559273'
UNION ALL
SELECT id_producto, 28, 2026, 1 FROM producto WHERE referencia = '8559273'
UNION ALL
SELECT id_producto, 29, 2026, 1 FROM producto WHERE referencia = '8559273'
UNION ALL
SELECT id_producto, 30, 2026, 1 FROM producto WHERE referencia = '8559273'
UNION ALL
SELECT id_producto, 27, 2026, 2 FROM producto WHERE referencia = '8118518'
UNION ALL
SELECT id_producto, 28, 2026, 1 FROM producto WHERE referencia = '8118518'
UNION ALL
SELECT id_producto, 29, 2026, 1 FROM producto WHERE referencia = '8118518'
UNION ALL
SELECT id_producto, 30, 2026, 1 FROM producto WHERE referencia = '8118518'
UNION ALL
SELECT id_producto, 27, 2026, 1 FROM producto WHERE referencia = '8797574'
UNION ALL
SELECT id_producto, 28, 2026, 1 FROM producto WHERE referencia = '8797574'
UNION ALL
SELECT id_producto, 29, 2026, 1 FROM producto WHERE referencia = '8797574'
UNION ALL
SELECT id_producto, 30, 2026, 1 FROM producto WHERE referencia = '8797574'
UNION ALL
SELECT id_producto, 27, 2026, 1 FROM producto WHERE referencia = '8797251'
UNION ALL
SELECT id_producto, 28, 2026, 1 FROM producto WHERE referencia = '8797251'
UNION ALL
SELECT id_producto, 29, 2026, 1 FROM producto WHERE referencia = '8797251'
UNION ALL
SELECT id_producto, 30, 2026, 1 FROM producto WHERE referencia = '8797251'
UNION ALL
SELECT id_producto, 27, 2026, 1 FROM producto WHERE referencia = '8943793'
UNION ALL
SELECT id_producto, 28, 2026, 1 FROM producto WHERE referencia = '8943793'
UNION ALL
SELECT id_producto, 27, 2026, 1 FROM producto WHERE referencia = '8920292'
UNION ALL
SELECT id_producto, 28, 2026, 1 FROM producto WHERE referencia = '8920292'
UNION ALL
SELECT id_producto, 27, 2026, 1 FROM producto WHERE referencia = '8894841';

-- Verificación final
SELECT count(*) AS total_productos FROM producto;
SELECT count(*) AS registros_ventas, sum(unidades_vendidas) AS total_unidades_julio FROM venta_semanal;