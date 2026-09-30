-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: Soporte de Ocultar Productos en Base de Datos (Opcional)
-- Ejecuta este script en el SQL Editor de Supabase si deseas persistir la columna
-- "oculto" directamente en la tabla producto.
-- El sistema ya gestiona el estado oculto automáticamente en localStorage
-- y se sincronizará con esta columna si existe.
-- ==============================================================================

-- 1. Agregar columna "oculto" a la tabla producto (por defecto FALSE)
ALTER TABLE producto 
  ADD COLUMN IF NOT EXISTS oculto BOOLEAN DEFAULT FALSE;

-- Mensaje de confirmación
SELECT 'Columna oculto agregada correctamente a la tabla producto.' AS resultado;
