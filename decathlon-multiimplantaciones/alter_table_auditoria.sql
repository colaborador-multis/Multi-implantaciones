-- ==============================================================================
-- SCRIPT DE MIGRACION: Columnas de Auditoria
-- Ejecuta este script en el SQL Editor de Supabase si ya tienes datos en la
-- tabla multiimplantacion y NO quieres borrarlos.
-- Si vas a recrear todo desde cero, usa supabase_schema.sql directamente.
-- ==============================================================================

-- Agrega la columna "modificado_por" (quien hizo el ultimo cambio)
ALTER TABLE multiimplantacion
  ADD COLUMN IF NOT EXISTS modificado_por UUID NULL REFERENCES usuario(id_usuario) ON DELETE SET NULL;

-- Agrega la columna "modificado_en" (cuando fue el ultimo cambio)
ALTER TABLE multiimplantacion
  ADD COLUMN IF NOT EXISTS modificado_en TIMESTAMP WITH TIME ZONE NULL;

-- Mensaje de confirmacion
SELECT 'Columnas de auditoria agregadas correctamente a multiimplantacion.' AS resultado;
