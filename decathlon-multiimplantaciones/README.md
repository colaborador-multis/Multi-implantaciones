# Sistema de Análisis de Multiimplantaciones y Ventas - Decathlon 🏋️‍♂️

Proyecto web para **Decathlon** desarrollado bajo el estándar del **Proyecto Integrador 1 (IU Digital de Antioquia)** y su **Diagrama Entidad-Relación (ER)**, integrado 100% con **Supabase Auth** y **PostgreSQL en tiempo real**, con esquema limpio y sin datos ficticios.

---

## 🚀 Inicio Rápido

1. Servidor local disponible en:  
   👉 **[http://localhost:8000](http://localhost:8000)**  
   *(o ejecutando `iniciar.bat` en Windows).*

---

## 🗄️ Configuración en Supabase (Paso a Paso)

### 1. Ejecutar las tablas limpias (SQL Editor)
1. Entra a tu proyecto en [https://supabase.com](https://supabase.com).
2. Ve al **SQL Editor** (`>_`) y haz clic en **New query**.
3. Copia y pega el contenido del archivo [`supabase_schema.sql`](./supabase_schema.sql) y pulsa **Run**.
   > *Crea las 5 tablas del diagrama ER (`usuario`, `producto`, `multiimplantacion`, `producto_multi`, `venta_semanal`), sus relaciones, claves foráneas, políticas RLS y el trigger para enlazar los registros de **Supabase Auth** con la tabla `usuario`.*

### 2. Conectar la API
1. En Supabase ve a **Project Settings > API**.
2. Copia tu **Project URL** y tu **Anon Public Key**.
3. En la página web haz clic en **"Configurar Base de Datos Supabase"** y pégalas.

---

## 🔐 Autenticación (Supabase Auth)

El sistema utiliza la autenticación oficial de Supabase:
1. **Crear Cuenta (Registro)**:
   - Haz clic en la pestaña **"Crear Cuenta (Registro)"**.
   - Ingresa tu Nombre Completo, Correo Electrónico, Contraseña y selecciona tu rol:
     - **Asesor comercial**: Registro de multiimplantaciones (CU01), ventas semanales (CU02) y consulta (CU03).
     - **Responsable de tienda**: Análisis comparativo antes/después (CU04), evaluación con veredicto e indicadores (CU05, RF09).
     - **Administrador**: Catálogo de productos (RF02) y gestión de usuarios (RF10).
2. **Iniciar Sesión**:
   - Ingresa con tu correo y contraseña registrados en Supabase.
