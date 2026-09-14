-- ==============================================================================
-- PROYECTO: Sistema de Análisis de Multiimplantaciones y Ventas (Decathlon)
-- BASE DE DATOS: Supabase (PostgreSQL)
-- Modelo Entidad-Relación Oficial (Páginas 15, 16 y 17 del Documento)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Eliminar tablas anteriores si existen
DROP TABLE IF EXISTS venta_semanal CASCADE;
DROP TABLE IF EXISTS producto_multi CASCADE;
DROP TABLE IF EXISTS multiimplantacion CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS categoria CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;

-- 1. TABLA: usuario (Diagrama ER: id_usuario, nombre, contraseña, rol)
-- Administrable 100% directamente desde el Table Editor de Supabase
CREATE TABLE usuario (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('Asesor comercial', 'Responsable de tienda', 'Administrador')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: categoria (Lista desplegable administrable por Admin)
CREATE TABLE categoria (
    id_categoria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL UNIQUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: producto (Diagrama ER: id_producto, nombre, referencia, categoria)
CREATE TABLE producto (
    id_producto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    referencia VARCHAR(50) NOT NULL UNIQUE,
    categoria VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: multiimplantacion (Diagrama ER: id_multiimplantacion, id_usuario FK, fecha_inicio, ubicacion)
--    + columnas de auditoría: modificado_por (quién hizo el último cambio) y modificado_en (cuándo)
CREATE TABLE multiimplantacion (
    id_multiimplantacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario           UUID NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    fecha_inicio         DATE NOT NULL DEFAULT CURRENT_DATE,
    ubicacion            VARCHAR(150) NOT NULL,
    creado_en            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modificado_por       UUID NULL REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    modificado_en        TIMESTAMP WITH TIME ZONE NULL
);

-- 5. TABLA: producto_multi (Diagrama ER: id_producto_multi, id_producto FK, id_multiimplantacion FK, fecha_inicio, fecha_fin)
CREATE TABLE producto_multi (
    id_producto_multi UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_producto UUID NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    id_multiimplantacion UUID NOT NULL REFERENCES multiimplantacion(id_multiimplantacion) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA: venta_semanal (Diagrama ER: id_venta, id_producto FK, semana, año, unidades_vendidas)
CREATE TABLE venta_semanal (
    id_venta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_producto UUID NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    semana INT4 NOT NULL CHECK (semana BETWEEN 1 AND 53),
    año INT4 NOT NULL CHECK (año >= 2000),
    unidades_vendidas INT4 NOT NULL CHECK (unidades_vendidas >= 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_producto_semana_año UNIQUE (id_producto, semana, año)
);

-- Permisos completos para que Supabase API pueda consultar y editar
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiimplantacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_multi ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_semanal ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas
CREATE POLICY "Permiso usuario" ON usuario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permiso categoria" ON categoria FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permiso producto" ON producto FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permiso multiimplantacion" ON multiimplantacion FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permiso producto_multi" ON producto_multi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permiso venta_semanal" ON venta_semanal FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Usuario Administrador Inicial
INSERT INTO usuario (nombre, contraseña, rol) 
VALUES ('admin', 'admin123', 'Administrador')
ON CONFLICT (nombre) DO NOTHING;

-- Categorías Oficiales Solicitadas
INSERT INTO categoria (nombre) VALUES
('fitness'),
('running'),
('agua'),
('montaña'),
('atencion al cliente'),
('colectivos')
ON CONFLICT (nombre) DO NOTHING;
