// ==============================================================================
// SISTEMA DE ANÁLISIS DE MULTIIMPLANTACIONES Y VENTAS - DECATHLON
// app.js - Conexión con Supabase y Gestión de Roles según Diagrama ER
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. CREDENCIALES DE SUPABASE EN EL CÓDIGO
// Pega aquí tu Project URL y tu Anon Public Key de Supabase
// ------------------------------------------------------------------------------
const SUPABASE_URL = "https://hkaepxngqexbfkavhgiy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KpSJobm7hnn0FEITtByWUQ_xL0vjNdw";

// Estado de la aplicación
const AppState = {
  supabase: null,
  isOnline: false,
  currentUser: null,
  activeTab: 'multiimplantaciones',
  chartInstance: null,

  // Estados de selección y modos interactivos
  selectedProductIds: new Set(),
  selectedProductCategory: 'todas',
  modoRegistroMulti: 'nueva',
  modoVentas: 'regular',

  data: {
    usuarios: [],
    productos: [],
    multiimplantaciones: [],
    producto_multi: [],
    ventas_semanales: [],
    categorias: [
      { id_categoria: 'local-1', nombre: 'fitness' },
      { id_categoria: 'local-2', nombre: 'running' },
      { id_categoria: 'local-3', nombre: 'agua' },
      { id_categoria: 'local-4', nombre: 'montaña' },
      { id_categoria: 'local-5', nombre: 'atencion al cliente' },
      { id_categoria: 'local-6', nombre: 'colectivos' }
    ]
  }
};

// Utilidad de Seguridad: Sanitización estricta contra Inyecciones (XSS)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Obtener año de forma segura evitando problemas de codificación UTF-8 / PostgREST ('año', 'a\u00f1o', 'anio')
function getVentaAnio(v) {
  if (!v) return 2026;
  const val = v.año !== undefined ? v.año : (v['a\u00f1o'] !== undefined ? v['a\u00f1o'] : (v.anio !== undefined ? v.anio : 2026));
  const num = parseInt(val, 10);
  return isNaN(num) ? 2026 : num;
}

// ------------------------------------------------------------------------------
// 2. INICIALIZACIÓN DEL CLIENTE DE SUPABASE
// ------------------------------------------------------------------------------
async function initSupabase() {
  const url = (SUPABASE_URL && !SUPABASE_URL.includes("TU_PROYECTO")) 
    ? SUPABASE_URL 
    : (localStorage.getItem('decathlon_supabase_url') || '');

  const key = (SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("TU_ANON")) 
    ? SUPABASE_ANON_KEY 
    : (localStorage.getItem('decathlon_supabase_key') || '');

  const statusDot = document.getElementById('connection-status-dot');
  const statusText = document.getElementById('connection-status-text');

  if (url && key && window.supabase) {
    try {
      AppState.supabase = window.supabase.createClient(url, key);
      AppState.isOnline = true;
      if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200';
      if (statusText) statusText.innerText = 'Conectado';
      console.log('Supabase conectado exitosamente.');
    } catch (err) {
      console.error('Error al inicializar Supabase:', err);
      AppState.isOnline = false;
      if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
      if (statusText) statusText.innerText = 'Error Conexión';
    }
  } else {
    AppState.isOnline = false;
    if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
    if (statusText) statusText.innerText = 'Configurar API en app.js';
  }

  // Restaurar usuario autenticado si ya había iniciado sesión
  const savedUser = localStorage.getItem('decathlon_logged_user');
  if (savedUser) {
    try {
      AppState.currentUser = JSON.parse(savedUser);
      setupUserInterface();
    } catch (e) {
      handleLogout();
    }
  } else {
    showAuthView();
  }
}

// ------------------------------------------------------------------------------
// 3. CONTROL DE SEGURIDAD CONTRA FUERZA BRUTA (RATE LIMITING / LOCKOUT)
// ------------------------------------------------------------------------------
const AUTH_SECURITY = {
  MAX_INTENTOS: 5,           // Máximo 5 intentos fallidos consecutivos
  TIEMPO_BLOQUEO_MS: 60000,   // 60 segundos (1 minuto) de bloqueo temporal
  DELAY_SEGURIDAD_MS: 600    // Retraso deliberado de 600ms para mitigar ataques masivos automatizados
};

function obtenerEstadoFuerzaBruta() {
  try {
    const raw = localStorage.getItem('decathlon_auth_ratelimit');
    if (!raw) return { intentos: 0, bloqueadoHasta: 0 };
    const parsed = JSON.parse(raw);
    return {
      intentos: Number(parsed.intentos) || 0,
      bloqueadoHasta: Number(parsed.bloqueadoHasta) || 0
    };
  } catch (e) {
    return { intentos: 0, bloqueadoHasta: 0 };
  }
}

function registrarIntentoFallido() {
  const estado = obtenerEstadoFuerzaBruta();
  estado.intentos += 1;

  if (estado.intentos >= AUTH_SECURITY.MAX_INTENTOS) {
    estado.bloqueadoHasta = Date.now() + AUTH_SECURITY.TIEMPO_BLOQUEO_MS;
  }

  localStorage.setItem('decathlon_auth_ratelimit', JSON.stringify(estado));
  return estado;
}

function reiniciarIntentosFuerzaBruta() {
  localStorage.removeItem('decathlon_auth_ratelimit');
}

let bloqueoTimerInterval = null;

function verificarBloqueoActivo(errorEl, btnSubmit) {
  const estado = obtenerEstadoFuerzaBruta();
  const ahora = Date.now();

  if (estado.bloqueadoHasta && estado.bloqueadoHasta > ahora) {
    const segundosRestantes = Math.ceil((estado.bloqueadoHasta - ahora) / 1000);
    
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('opacity-60', 'cursor-not-allowed');
      btnSubmit.innerHTML = `<span>Bloqueado por seguridad (${segundosRestantes}s)</span>`;
    }

    if (errorEl) {
      showError(errorEl, `⚠️ <strong>Acceso bloqueado temporalmente:</strong> Has excedido el límite de ${AUTH_SECURITY.MAX_INTENTOS} intentos fallidos para proteger el sistema contra ataques de fuerza bruta. Intenta nuevamente en <strong>${segundosRestantes} segundos</strong>.`);
    }

    if (!bloqueoTimerInterval) {
      bloqueoTimerInterval = setInterval(() => {
        const est = obtenerEstadoFuerzaBruta();
        const diff = Math.ceil((est.bloqueadoHasta - Date.now()) / 1000);
        if (diff <= 0) {
          clearInterval(bloqueoTimerInterval);
          bloqueoTimerInterval = null;
          reiniciarIntentosFuerzaBruta();
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('opacity-60', 'cursor-not-allowed');
            btnSubmit.innerHTML = `<span>Ingresar al Sistema</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
            if (window.lucide) lucide.createIcons();
          }
          if (errorEl) errorEl.classList.add('hidden');
        } else {
          if (btnSubmit) btnSubmit.innerHTML = `<span>Bloqueado por seguridad (${diff}s)</span>`;
          if (errorEl) {
            errorEl.innerHTML = `⚠️ <strong>Acceso bloqueado temporalmente:</strong> Has excedido el límite de ${AUTH_SECURITY.MAX_INTENTOS} intentos fallidos para proteger el sistema contra ataques de fuerza bruta. Intenta nuevamente en <strong>${diff} segundos</strong>.`;
          }
        }
      }, 1000);
    }
    return true;
  }

  return false;
}

// ------------------------------------------------------------------------------
// LOGIN BASADO EN LA TABLA "USUARIO" CON PROTECCIÓN ANTI FUERZA BRUTA
// ------------------------------------------------------------------------------
async function handleLogin(e) {
  if (e) e.preventDefault();
  const errorEl = document.getElementById('login-error');
  const btnSubmit = document.getElementById('btn-login-submit');

  // 1. Validar si existe bloqueo activo por fuerza bruta
  if (verificarBloqueoActivo(errorEl, btnSubmit)) {
    return;
  }

  errorEl.classList.add('hidden');

  const nombre = document.getElementById('login-nombre').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!nombre || !password) {
    showError(errorEl, 'Ingresa tu usuario y contraseña.');
    return;
  }

  if (!AppState.isOnline || !AppState.supabase) {
    showError(errorEl, 'Verifica que SUPABASE_URL y SUPABASE_ANON_KEY estén configuradas en app.js.');
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Verificando credenciales...';
  }

  // Retardo deliberado para mitigar ataques masivos automatizados (Timing defense)
  await new Promise(resolve => setTimeout(resolve, AUTH_SECURITY.DELAY_SEGURIDAD_MS));

  try {
    // Consulta directa y parametrizada a la tabla usuario (Diagrama ER)
    const { data: user, error } = await AppState.supabase
      .from('usuario')
      .select('*')
      .eq('nombre', nombre)
      .eq('contraseña', password)
      .maybeSingle();

    if (error) {
      console.error('Error en login:', error);
      showError(errorEl, `Error al consultar la base de datos: ${error.message}`);
      return;
    }

    if (!user) {
      // Registrar intento fallido y evaluar bloqueo
      const estado = registrarIntentoFallido();
      const intentosRestantes = AUTH_SECURITY.MAX_INTENTOS - estado.intentos;

      if (estado.intentos >= AUTH_SECURITY.MAX_INTENTOS) {
        verificarBloqueoActivo(errorEl, btnSubmit);
      } else {
        showError(
          errorEl,
          `Credenciales incorrectas. Te quedan ${intentosRestantes} ${intentosRestantes === 1 ? 'intento' : 'intentos'} antes de que el acceso sea bloqueado temporalmente.`
        );
      }
      return;
    }

    // Login exitoso: limpiar contador de intentos fallidos
    reiniciarIntentosFuerzaBruta();
    AppState.currentUser = user;
    localStorage.setItem('decathlon_logged_user', JSON.stringify(user));
    setupUserInterface();
    showToast(`Bienvenido/a, ${user.nombre} (${user.rol})`, 'success');

  } catch (err) {
    showError(errorEl, `Error de conexión: ${err.message}`);
  } finally {
    const estado = obtenerEstadoFuerzaBruta();
    if (btnSubmit && (!estado.bloqueadoHasta || estado.bloqueadoHasta <= Date.now())) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Ingresar al Sistema';
    }
  }
}

function handleLogout() {
  AppState.currentUser = null;
  localStorage.removeItem('decathlon_logged_user');
  showAuthView();
  showToast('Sesión cerrada.', 'info');
}

function showAuthView() {
  document.getElementById('auth-container').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('login-nombre').value = '';
  document.getElementById('login-password').value = '';

  const errorEl = document.getElementById('login-error');
  const btnSubmit = document.getElementById('btn-login-submit');
  verificarBloqueoActivo(errorEl, btnSubmit);
}

// ------------------------------------------------------------------------------
// 4. CONTROL DE ACCESO POR ROLES PARTICULARES
// ------------------------------------------------------------------------------
function setupUserInterface() {
  const user = AppState.currentUser;
  if (!user) return;

  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');

  document.getElementById('user-display-name').innerText = user.nombre;
  
  const roleBadge = document.getElementById('user-display-role');
  roleBadge.innerText = user.rol.toUpperCase();
  roleBadge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full ';
  
  if (user.rol === 'Asesor comercial') roleBadge.className += 'badge-asesor';
  else if (user.rol === 'Responsable de tienda') roleBadge.className += 'badge-responsable';
  else roleBadge.className += 'badge-admin';

  // Todos tienen acceso a todas las secciones comerciales y de analisis.
  // El único acceso adicional y exclusivo que tiene el Admin es la Gestión de Usuarios.
  const esAdmin = user.rol === 'Administrador';

  const navItems = {
    'nav-multiimplantaciones': true,
    'nav-registro': true,
    'nav-ventas': true,
    'nav-evaluacion': true,
    'nav-productos': true,
    'nav-usuarios': esAdmin, // ÚNICO ACCESO EXCLUSIVO PARA ADMINISTRADOR
    // Equivalentes en bottom nav móvil
    'mob-nav-multiimplantaciones': true,
    'mob-nav-registro': true,
    'mob-nav-ventas': true,
    'mob-nav-evaluacion': true,
    'mob-nav-productos': true,
    'mob-nav-usuarios': esAdmin
  };

  for (const [id, visible] of Object.entries(navItems)) {
    const el = document.getElementById(id);
    if (el) {
      if (visible) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  // Pestaña inicial para todos los usuarios
  switchTab('multiimplantaciones');

  loadAllData();
}

function switchTab(tabId) {
  AppState.activeTab = tabId;
  const sections = ['multiimplantaciones', 'registro', 'ventas', 'evaluacion', 'productos', 'usuarios'];
  
  sections.forEach(s => {
    const sectionEl  = document.getElementById(`section-${s}`);
    const navBtn     = document.getElementById(`nav-${s}`);
    const mobNavBtn  = document.getElementById(`mob-nav-${s}`);

    if (sectionEl) {
      if (s === tabId) {
        sectionEl.classList.remove('hidden');
        sectionEl.classList.add('animate-fade-in');
      } else {
        sectionEl.classList.add('hidden');
      }
    }

    // Barra de navegación Desktop
    if (navBtn) {
      if (s === tabId) {
        navBtn.classList.add('bg-sky-50', 'text-sky-700', 'font-semibold');
        navBtn.classList.remove('text-slate-600', 'hover:bg-slate-100');
      } else {
        navBtn.classList.remove('bg-sky-50', 'text-sky-700', 'font-semibold');
        navBtn.classList.add('text-slate-600', 'hover:bg-slate-100');
      }
    }

    // Barra de navegación inferior Móvil
    if (mobNavBtn) {
      if (s === tabId) {
        mobNavBtn.classList.add('text-sky-700', 'bg-sky-50', 'font-semibold');
        mobNavBtn.classList.remove('text-slate-500');
      } else {
        mobNavBtn.classList.remove('text-sky-700', 'bg-sky-50', 'font-semibold');
        mobNavBtn.classList.add('text-slate-500');
      }
    }
  });

  if (tabId === 'evaluacion') {
    populateEvaluationSelectors();
    alCambiarMultiEvaluacion();
  }

  if (tabId === 'registro') {
    renderCategoriasFiltroProductos();
    renderListaProductosCheckbox();
    populateMultiExistenteSelect();
  }

  if (tabId === 'ventas') {
    populateProductSelects();
  }

  if (tabId === 'productos') {
    renderCategoriesUI();
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// ------------------------------------------------------------------------------
// 5. OPERACIONES CRUD CON SUPABASE
// ------------------------------------------------------------------------------
async function loadAllData() {
  if (!AppState.isOnline || !AppState.supabase) return;

  try {
    const [uRes, pRes, mRes, pmRes, vRes, cRes] = await Promise.all([
      AppState.supabase.from('usuario').select('*').order('nombre'),
      AppState.supabase.from('producto').select('*').order('nombre'),
      AppState.supabase.from('multiimplantacion').select('*').order('fecha_inicio', { ascending: false }),
      AppState.supabase.from('producto_multi').select('*'),
      AppState.supabase.from('venta_semanal').select('*').order('año', { ascending: false }).order('semana', { ascending: false }),
      AppState.supabase.from('categoria').select('*').order('nombre')
    ]);

    if (!uRes.error && uRes.data) AppState.data.usuarios = uRes.data;
    if (!pRes.error && pRes.data) AppState.data.productos = pRes.data;
    if (!mRes.error && mRes.data) AppState.data.multiimplantaciones = mRes.data;
    if (!pmRes.error && pmRes.data) AppState.data.producto_multi = pmRes.data;
    if (!vRes.error && vRes.data) AppState.data.ventas_semanales = vRes.data;

    if (cRes.error) {
      console.error('Error cargando categorías desde Supabase:', cRes.error.message);
      console.warn('Usando categorías por defecto. Asegúrate de haber ejecutado supabase_schema.sql.');
    } else if (cRes.data && cRes.data.length > 0) {
      AppState.data.categorias = cRes.data;
      console.log(`✅ ${cRes.data.length} categorías cargadas desde Supabase.`);
    } else {
      console.warn('La tabla categoria existe pero está vacía. Usando categorías por defecto.');
    }
  } catch (e) {
    console.error('Error sincronizando con Supabase:', e);
  }

  renderMultiimplantacionesTable();
  populateProductSelects();
  renderProductsTable();
  renderUsersTable();
  renderVentasTable();
  populateEvaluationSelectors();
  renderCategoriesUI();
}

// RF10. Gestión de Usuarios (Rol particular Administrador)
async function handleCrearUsuario(e) {
  e.preventDefault();
  if (!AppState.supabase) {
    showToast('Supabase no conectado.', 'warning');
    return;
  }

  const nombre = document.getElementById('user-nombre').value.trim();
  const password = document.getElementById('user-pass').value.trim();
  const rol = document.getElementById('user-rol').value;

  if (!nombre || !password || !rol) {
    showToast('Todos los campos del usuario son obligatorios.', 'warning');
    return;
  }

  const { error } = await AppState.supabase.from('usuario').insert([{
    nombre: nombre,
    contraseña: password,
    rol: rol
  }]);

  if (error) {
    showToast(`Error al crear usuario: ${error.message}`, 'error');
    return;
  }

  document.getElementById('form-usuario').reset();
  showToast(`Usuario "${nombre}" con rol "${rol}" creado en Supabase.`, 'success');
  await loadAllData();
}

async function eliminarUsuario(id_usuario, nombre) {
  if (!confirm(`¿Estás seguro de eliminar al usuario "${nombre}" de Supabase?`)) return;

  const { error } = await AppState.supabase.from('usuario').delete().eq('id_usuario', id_usuario);
  if (error) {
    showToast(`Error al eliminar: ${error.message}`, 'error');
  } else {
    showToast(`Usuario eliminado de Supabase.`, 'success');
    await loadAllData();
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('tabla-usuarios-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (AppState.data.usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-5 py-6 text-center text-slate-400">No hay usuarios registrados en la tabla usuario de Supabase.</td></tr>`;
    return;
  }

  AppState.data.usuarios.forEach(u => {
    let roleClass = 'badge-asesor';
    if (u.rol === 'Responsable de tienda') roleClass = 'badge-responsable';
    if (u.rol === 'Administrador') roleClass = 'badge-admin';

    const esElMismo = AppState.currentUser?.id_usuario === u.id_usuario;
    const safeNombre = escapeHtml(u.nombre);
    const safeRol = escapeHtml(u.rol);
    const safeId = escapeHtml(u.id_usuario);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 border-b border-slate-200';
    tr.innerHTML = `
      <td class="px-5 py-3 font-semibold text-slate-800">${safeNombre} ${esElMismo ? '<span class="text-[10px] text-sky-600 font-normal">(Tú)</span>' : ''}</td>
      <td class="px-5 py-3"><span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${roleClass}">${safeRol}</span></td>
      <td class="px-5 py-3 font-mono text-xs text-slate-400">••••••••</td>
      <td class="px-5 py-3 text-right space-x-2">
        <button onclick="abrirEditarUsuario('${safeId}')" class="text-xs text-purple-700 hover:text-purple-900 font-semibold underline">Editar</button>
        ${!esElMismo ? `<button onclick="eliminarUsuario('${safeId}', '${safeNombre.replace(/'/g, "\\'")}')" class="text-xs text-red-600 hover:text-red-800 font-medium">Eliminar</button>` : '<span class="text-xs text-slate-400">Activo</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function abrirEditarUsuario(id_usuario) {
  const u = AppState.data.usuarios.find(user => user.id_usuario === id_usuario);
  if (!u) return;

  document.getElementById('edit-user-id').value = u.id_usuario;
  document.getElementById('edit-user-nombre').value = u.nombre;
  document.getElementById('edit-user-pass').value = '';
  document.getElementById('edit-user-rol').value = u.rol;

  const passInput = document.getElementById('edit-user-pass');
  if (passInput) passInput.type = 'password';

  abrirModal('modal-editar-usuario');
}

async function guardarEditarUsuario(e) {
  e.preventDefault();
  if (!AppState.supabase) {
    showToast('Supabase no conectado.', 'warning');
    return;
  }

  const id_usuario = document.getElementById('edit-user-id').value;
  const nombre = document.getElementById('edit-user-nombre').value.trim();
  const password = document.getElementById('edit-user-pass').value.trim();
  const rol = document.getElementById('edit-user-rol').value;

  if (!id_usuario || !nombre || !rol) {
    showToast('Nombre y rol son campos obligatorios.', 'warning');
    return;
  }

  const updatePayload = { nombre, rol };
  if (password) {
    updatePayload.contraseña = password;
  }

  const { error } = await AppState.supabase
    .from('usuario')
    .update(updatePayload)
    .eq('id_usuario', id_usuario);

  if (error) {
    showToast(`Error al actualizar usuario: ${error.message}`, 'error');
    return;
  }

  // Si el usuario editado es el mismo usuario logueado actualmente, actualizar su sesión
  if (AppState.currentUser && AppState.currentUser.id_usuario === id_usuario) {
    AppState.currentUser.nombre = nombre;
    AppState.currentUser.rol = rol;
    if (password) AppState.currentUser.contraseña = password;
    localStorage.setItem('decathlon_logged_user', JSON.stringify(AppState.currentUser));
    setupUserInterface();
  }

  cerrarModal('modal-editar-usuario');
  showToast('Usuario actualizado correctamente.', 'success');
  await loadAllData();
}

function toggleVerPassword(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const esPassword = input.type === 'password';
  input.type = esPassword ? 'text' : 'password';
  if (btnEl) {
    btnEl.innerHTML = esPassword 
      ? '<i data-lucide="eye-off" class="w-4 h-4"></i>'
      : '<i data-lucide="eye" class="w-4 h-4"></i>';
    if (window.lucide) lucide.createIcons();
  }
}

// RF02. Registro de Producto (Administrador)
async function handleCrearProducto(e) {
  e.preventDefault();
  if (!AppState.supabase) {
    showToast('Supabase no conectado.', 'warning');
    return;
  }

  const nombre = document.getElementById('prod-nombre').value.trim();
  const referencia = document.getElementById('prod-referencia').value.trim();
  const categoria = document.getElementById('prod-categoria').value.trim();

  if (!nombre || !referencia || !categoria) {
    showToast('Todos los campos son obligatorios.', 'warning');
    return;
  }

  const { error } = await AppState.supabase.from('producto').insert([{
    nombre,
    referencia,
    categoria
  }]);

  if (error) {
    showToast(`Error al guardar producto: ${error.message}`, 'error');
    return;
  }

  document.getElementById('form-producto').reset();
  showToast('Producto agregado al catálogo en Supabase.', 'success');
  await loadAllData();
}

function renderProductsTable() {
  const tbody = document.getElementById('tabla-productos-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const esAdmin = AppState.currentUser?.rol === 'Administrador';

  if (AppState.data.productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-5 py-6 text-center text-slate-400">No hay productos registrados aún en Supabase. Agrega uno arriba.</td></tr>`;
    return;
  }

  AppState.data.productos.forEach(p => {
    const safeNombre = escapeHtml(p.nombre);
    const safeRef = escapeHtml(p.referencia);
    const safeCat = escapeHtml(p.categoria);
    const safeId = escapeHtml(p.id_producto);
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 border-b border-slate-200 transition-colors';
    tr.innerHTML = `
      <td class="px-5 py-3 font-semibold text-slate-800">${safeNombre}</td>
      <td class="px-5 py-3 font-mono text-xs text-sky-700">${safeRef}</td>
      <td class="px-5 py-3 text-slate-600 capitalize">${safeCat}</td>
      <td class="px-5 py-3 text-right">
        ${esAdmin ? `
          <button onclick="eliminarProducto('${safeId}', '${safeNombre.replace(/'/g, "\\'")}')" 
            class="text-xs text-red-600 hover:text-red-800 font-semibold underline transition">
            Eliminar
          </button>` : '<span class="text-slate-300 text-xs">—</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function eliminarProducto(id_producto, nombre) {
  if (AppState.currentUser?.rol !== 'Administrador') {
    showToast('Solo el Administrador tiene permisos para eliminar productos.', 'error');
    return;
  }

  const multisAsociadas = AppState.data.producto_multi.filter(pm => pm.id_producto === id_producto);
  const ventasAsociadas = AppState.data.ventas_semanales.filter(v => v.id_producto === id_producto);

  let msg = `¿Estás seguro de eliminar el producto "${nombre}" del catálogo?`;
  if (multisAsociadas.length > 0 || ventasAsociadas.length > 0) {
    msg += `\n\n⚠️ Este producto tiene:\n• ${multisAsociadas.length} asociaciones en multiimplantaciones\n• ${ventasAsociadas.length} registros de ventas semanales\n\nAl eliminarlo, se removerán esas relaciones por integridad referencial.`;
  }

  if (!confirm(msg)) return;

  const { error } = await AppState.supabase.from('producto').delete().eq('id_producto', id_producto);
  if (error) {
    showToast(`Error al eliminar producto: ${error.message}`, 'error');
    return;
  }

  showToast(`Producto "${nombre}" eliminado del catálogo.`, 'success');
  await loadAllData();
}


// Gestión de Categorías
function renderCategoriesUI() {
  const select = document.getElementById('prod-categoria');
  const chipsContainer = document.getElementById('lista-categorias-chips');
  const addBox = document.getElementById('admin-add-cat-box');
  const badge = document.getElementById('badge-admin-only-cat');

  if (!select || !chipsContainer) return;

  const esAdmin = AppState.currentUser?.rol === 'Administrador';

  // Mostrar/ocultar controles de admin
  if (addBox) addBox.style.display = esAdmin ? 'flex' : 'none';
  if (badge) badge.style.display = esAdmin ? 'inline-block' : 'none';

  // Poblar el <select> del formulario de producto
  const valorActual = select.value;
  select.innerHTML = '<option value="" disabled selected>-- Selecciona una categoría --</option>';
  AppState.data.categorias.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.nombre;
    opt.textContent = cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1);
    select.appendChild(opt);
  });
  if (valorActual) select.value = valorActual;

  // Mostrar chips de categorías
  chipsContainer.innerHTML = '';
  if (AppState.data.categorias.length === 0) {
    chipsContainer.innerHTML = '<span class="text-xs text-slate-400 italic">Sin categorías definidas.</span>';
    return;
  }

  AppState.data.categorias.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200';
    if (esAdmin) {
      chip.innerHTML = `
        <span class="capitalize">${cat.nombre}</span>
        <button type="button" onclick="eliminarCategoria('${cat.id_categoria}', '${cat.nombre}')"
          class="ml-1 text-sky-500 hover:text-red-600 transition-colors font-bold leading-none" title="Eliminar categoría">×</button>
      `;
    } else {
      chip.innerHTML = `<span class="capitalize">${cat.nombre}</span>`;
    }
    chipsContainer.appendChild(chip);
  });
}

async function handleCrearCategoria() {
  const input = document.getElementById('nueva-categoria-nombre');
  const nombre = input ? input.value.trim().toLowerCase() : '';

  if (!nombre) {
    showToast('Escribe el nombre de la categoría.', 'warning');
    return;
  }

  const existe = AppState.data.categorias.some(c => c.nombre.toLowerCase() === nombre);
  if (existe) {
    showToast(`La categoría "${nombre}" ya existe.`, 'warning');
    return;
  }

  if (AppState.isOnline && AppState.supabase) {
    const { data: inserted, error } = await AppState.supabase
      .from('categoria')
      .insert([{ nombre }])
      .select()
      .single();

    if (error) {
      showToast(`Error al crear categoría: ${error.message}`, 'error');
      return;
    }
    AppState.data.categorias.push(inserted);
    showToast(`Categoría "${nombre}" creada en Supabase.`, 'success');
  } else {
    // Modo offline: solo local
    AppState.data.categorias.push({ id_categoria: `local-${Date.now()}`, nombre });
    showToast(`Categoría "${nombre}" añadida localmente.`, 'info');
  }

  if (input) input.value = '';
  renderCategoriesUI();
}

async function eliminarCategoria(id_categoria, nombre) {
  if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;

  if (AppState.isOnline && AppState.supabase && !id_categoria.startsWith('local-')) {
    const { error } = await AppState.supabase.from('categoria').delete().eq('id_categoria', id_categoria);
    if (error) {
      showToast(`Error al eliminar: ${error.message}`, 'error');
      return;
    }
    showToast(`Categoría "${nombre}" eliminada de Supabase.`, 'success');
  } else {
    showToast(`Categoría "${nombre}" eliminada localmente.`, 'info');
  }

  AppState.data.categorias = AppState.data.categorias.filter(c => c.id_categoria !== id_categoria);
  renderCategoriesUI();
}


// ------------------------------------------------------------------------------
// GESTIÓN Y SELECCIÓN DE PRODUCTOS CON CASILLAS Y CATEGORÍAS
// ------------------------------------------------------------------------------
function cambiarModoRegistroMulti(modo) {
  AppState.modoRegistroMulti = modo;
  const btnNueva = document.getElementById('tab-multi-modo-nueva');
  const btnExistente = document.getElementById('tab-multi-modo-existente');
  const boxNueva = document.getElementById('box-modo-nueva');
  const boxExistente = document.getElementById('box-modo-existente');
  const btnSubmitText = document.getElementById('btn-submit-multi-text');
  const regUbicacion = document.getElementById('reg-ubicacion');
  const regFecha = document.getElementById('reg-fecha-inicio');

  if (modo === 'nueva') {
    if (btnNueva) {
      btnNueva.className = 'flex-1 py-2 rounded-lg bg-white text-sky-700 shadow-sm transition flex items-center justify-center gap-1.5';
    }
    if (btnExistente) {
      btnExistente.className = 'flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5';
    }
    if (boxNueva) boxNueva.classList.remove('hidden');
    if (boxExistente) boxExistente.classList.add('hidden');
    if (btnSubmitText) btnSubmitText.innerText = 'Confirmar y Guardar Multiimplantación';
    if (regUbicacion) regUbicacion.required = true;
    if (regFecha) regFecha.required = true;
  } else {
    if (btnNueva) {
      btnNueva.className = 'flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5';
    }
    if (btnExistente) {
      btnExistente.className = 'flex-1 py-2 rounded-lg bg-white text-sky-700 shadow-sm transition flex items-center justify-center gap-1.5';
    }
    if (boxNueva) boxNueva.classList.add('hidden');
    if (boxExistente) boxExistente.classList.remove('hidden');
    if (btnSubmitText) btnSubmitText.innerText = 'Vincular Productos a Multiimplantación Existente';
    if (regUbicacion) regUbicacion.required = false;
    if (regFecha) regFecha.required = false;
    populateMultiExistenteSelect();
  }

  // Actualizar inmediatamente la lista de productos al cambiar de modo
  renderListaProductosCheckbox();

  if (window.lucide) lucide.createIcons();
}

function populateMultiExistenteSelect() {
  const select = document.getElementById('reg-multi-existente');
  if (!select) return;

  const valorActual = select.value;
  select.innerHTML = '<option value="">-- Selecciona una multiimplantación existente --</option>';

  if (AppState.data.multiimplantaciones.length === 0) {
    select.innerHTML = '<option value="" disabled>No hay multiimplantaciones registradas</option>';
    return;
  }

  AppState.data.multiimplantaciones.forEach(m => {
    const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === m.id_multiimplantacion);
    const isActive = relations.some(pm => !pm.fecha_fin);
    const opt = document.createElement('option');
    opt.value = m.id_multiimplantacion;
    opt.textContent = `${m.ubicacion} (Inicio: ${m.fecha_inicio}) - [${isActive ? 'Activa' : 'Finalizada'}]`;
    select.appendChild(opt);
  });

  if (valorActual) select.value = valorActual;
  alSeleccionarMultiExistente();
}

function alSeleccionarMultiExistente() {
  const select = document.getElementById('reg-multi-existente');
  const infoBox = document.getElementById('info-multi-existente');
  if (!select || !infoBox) return;

  const mId = select.value;
  if (!mId) {
    infoBox.classList.add('hidden');
    infoBox.innerHTML = '';
    renderListaProductosCheckbox();
    return;
  }

  const multi = AppState.data.multiimplantaciones.find(m => m.id_multiimplantacion === mId);
  if (!multi) return;

  const user = AppState.data.usuarios.find(u => u.id_usuario === multi.id_usuario);
  const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === mId);
  const prodNombres = relations.map(pm => {
    const p = AppState.data.productos.find(pr => pr.id_producto === pm.id_producto);
    const estado = pm.fecha_fin ? '(desactivado)' : '(activo)';
    return p ? `${p.nombre} ${estado}` : 'Producto';
  });

  infoBox.classList.remove('hidden');
  infoBox.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="font-bold text-sky-900">${multi.ubicacion}</span>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-white text-sky-700 font-semibold border border-sky-200">Inicio: ${multi.fecha_inicio}</span>
    </div>
    <p class="text-[11px] text-sky-800">
      <strong>Registrado por:</strong> ${user ? user.nombre : 'Desconocido'} • <strong>Productos registrados (${relations.length}):</strong> ${prodNombres.length ? prodNombres.join(', ') : 'Sin productos aún'}.
    </p>
  `;

  renderListaProductosCheckbox();
}

// Selector con Casillas (Checkboxes) y Filtros por Categoría
function renderCategoriasFiltroProductos() {
  const container = document.getElementById('reg-prod-categoria-chips');
  if (!container) return;

  container.innerHTML = '';

  // Chip "Todas"
  const btnTodas = document.createElement('button');
  btnTodas.type = 'button';
  const esTodas = AppState.selectedProductCategory === 'todas';
  btnTodas.className = `px-2.5 py-1 rounded-full text-xs font-semibold transition ${esTodas ? 'bg-sky-700 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
  btnTodas.textContent = 'Todas';
  btnTodas.onclick = () => seleccionarFiltroCategoriaProducto('todas');
  container.appendChild(btnTodas);

  AppState.data.categorias.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const esActiva = AppState.selectedProductCategory === cat.nombre.toLowerCase();
    btn.className = `px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition ${esActiva ? 'bg-sky-700 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
    btn.textContent = cat.nombre;
    btn.onclick = () => seleccionarFiltroCategoriaProducto(cat.nombre.toLowerCase());
    container.appendChild(btn);
  });
}

function seleccionarFiltroCategoriaProducto(catNombre) {
  AppState.selectedProductCategory = catNombre;
  renderCategoriasFiltroProductos();
  renderListaProductosCheckbox();
}

function filtrarListaProductosCheckbox() {
  renderListaProductosCheckbox();
}

function renderListaProductosCheckbox() {
  const container = document.getElementById('reg-prod-checkbox-container');
  const countBadge = document.getElementById('reg-prod-count-badge');
  if (!container) return;

  const query = (document.getElementById('reg-prod-search')?.value || '').toLowerCase().trim();
  const catFilter = AppState.selectedProductCategory;
  const currentMultiId = (AppState.modoRegistroMulti === 'existente') 
    ? (document.getElementById('reg-multi-existente')?.value || '') 
    : '';

  const productosFiltrados = AppState.data.productos.filter(p => {
    const coincideCat = (catFilter === 'todas') || (p.categoria && p.categoria.toLowerCase() === catFilter);
    const coincideTexto = !query || 
      (p.nombre && p.nombre.toLowerCase().includes(query)) || 
      (p.referencia && p.referencia.toLowerCase().includes(query));
    return coincideCat && coincideTexto;
  });

  container.innerHTML = '';

  if (productosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-xs text-slate-400">
        No se encontraron productos que coincidan con la búsqueda o categoría seleccionada.
      </div>`;
  } else {
    productosFiltrados.forEach(p => {
      const estaSeleccionado = AppState.selectedProductIds.has(p.id_producto);

      let badgeHtml = '';
      let isBlocked = false;

      if (AppState.modoRegistroMulti === 'existente' && currentMultiId) {
        const relInCurrent = AppState.data.producto_multi.find(pm => pm.id_producto === p.id_producto && pm.id_multiimplantacion === currentMultiId);
        if (relInCurrent && !relInCurrent.fecha_fin) {
          badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Ya activo en esta multi</span>';
          isBlocked = true;
        } else if (relInCurrent && relInCurrent.fecha_fin) {
          badgeHtml = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200" title="Al seleccionarlo se reactivará sin duplicar el registro">🔄 Se reactivará (estaba inactivo)</span>';
        }
      }

      const item = document.createElement('div');
      item.className = `p-2.5 flex items-center justify-between transition select-none ${
        isBlocked 
          ? 'bg-slate-100/70 opacity-70 cursor-not-allowed' 
          : (estaSeleccionado ? 'bg-sky-50/80 hover:bg-sky-100/70 cursor-pointer' : 'hover:bg-slate-100/80 cursor-pointer')
      }`;

      item.onclick = (e) => {
        if (isBlocked) {
          showToast('Este producto ya se encuentra activo en esta multiimplantación.', 'info');
          return;
        }
        if (e.target.tagName !== 'INPUT') {
          toggleSeleccionProducto(p.id_producto);
        }
      };

      item.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <input type="checkbox" id="chk-prod-${p.id_producto}" ${estaSeleccionado ? 'checked' : ''} ${isBlocked ? 'disabled' : ''}
            onchange="toggleSeleccionProducto('${p.id_producto}')"
            class="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 ${isBlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}" />
          <div class="truncate">
            <span class="font-bold text-xs text-slate-800 block truncate">${p.nombre}</span>
            <span class="text-[10px] text-slate-500 font-mono">${p.referencia}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0 ml-2">
          ${badgeHtml}
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 capitalize">
            ${p.categoria}
          </span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  if (countBadge) {
    countBadge.innerText = `${AppState.selectedProductIds.size} seleccionados`;
  }
}

function toggleSeleccionProducto(idProducto) {
  if (AppState.modoRegistroMulti === 'existente') {
    const currentMultiId = document.getElementById('reg-multi-existente')?.value;
    if (currentMultiId) {
      const relInCurrent = AppState.data.producto_multi.find(pm => pm.id_producto === idProducto && pm.id_multiimplantacion === currentMultiId);
      if (relInCurrent && !relInCurrent.fecha_fin) {
        showToast('Este producto ya se encuentra activo en esta multiimplantación.', 'info');
        return;
      }
    }
  }

  if (AppState.selectedProductIds.has(idProducto)) {
    AppState.selectedProductIds.delete(idProducto);
  } else {
    AppState.selectedProductIds.add(idProducto);
  }
  renderListaProductosCheckbox();
}

function deseleccionarTodosProductos() {
  AppState.selectedProductIds.clear();
  renderListaProductosCheckbox();
}

// Registro / Vinculación de Multiimplantación
async function handleRegistrarMultiimplantacion(e) {
  e.preventDefault();
  if (!AppState.supabase) {
    showToast('Supabase no conectado.', 'warning');
    return;
  }

  const selectedProducts = Array.from(AppState.selectedProductIds);

  if (selectedProducts.length === 0) {
    showToast('Debes marcar al menos un producto con casilla de verificación.', 'warning');
    return;
  }

  // MODO 1: NUEVA MULTIIMPLANTACIÓN
  if (AppState.modoRegistroMulti === 'nueva') {
    const ubicacion = document.getElementById('reg-ubicacion').value.trim();
    const fechaInicio = document.getElementById('reg-fecha-inicio').value;

    if (!ubicacion || !fechaInicio) {
      showToast('Por favor completa la ubicación y la fecha de inicio.', 'warning');
      return;
    }

    const newMulti = {
      id_usuario:     AppState.currentUser.id_usuario,
      fecha_inicio:   fechaInicio,
      ubicacion:      ubicacion,
      modificado_por: AppState.currentUser.id_usuario,
      modificado_en:  new Date().toISOString()
    };

    const { data: insertedMulti, error: errM } = await AppState.supabase
      .from('multiimplantacion')
      .insert([newMulti])
      .select()
      .single();

    if (errM || !insertedMulti) {
      showToast(`Error al guardar multiimplantación: ${errM ? errM.message : 'Desconocido'}`, 'error');
      return;
    }

    const newRelations = selectedProducts.map(pId => ({
      id_producto: pId,
      id_multiimplantacion: insertedMulti.id_multiimplantacion,
      fecha_inicio: fechaInicio,
      fecha_fin: null
    }));

    const { error: errPM } = await AppState.supabase.from('producto_multi').insert(newRelations);
    if (errPM) {
      showToast('Multiimplantación creada pero falló asociar productos.', 'warning');
    } else {
      showToast('¡Multiimplantación registrada con éxito en Supabase!', 'success');
    }

  // MODO 2: AGREGAR A MULTIIMPLANTACIÓN EXISTENTE
  } else {
    const multiId = document.getElementById('reg-multi-existente').value;
    if (!multiId) {
      showToast('Selecciona una multiimplantación existente de la lista.', 'warning');
      return;
    }

    const multiExistente = AppState.data.multiimplantaciones.find(m => m.id_multiimplantacion === multiId);
    if (!multiExistente) {
      showToast('Multiimplantación no encontrada.', 'error');
      return;
    }

    let reactivadosCount = 0;
    const nuevosParaInsertar = [];
    const hoy = new Date().toISOString().split('T')[0];

    for (const pId of selectedProducts) {
      // Regla: En una misma multiimplantación no puede repetirse el producto.
      // Si ya existía pero estaba desactivado, se reactiva el registro existente en vez de crear uno nuevo.
      const existenteEnEsta = AppState.data.producto_multi.find(
        pm => pm.id_producto === pId && pm.id_multiimplantacion === multiId
      );

      if (existenteEnEsta) {
        if (existenteEnEsta.fecha_fin !== null) {
          // Reactivar el registro existente (sin duplicar fila en la misma multi)
          const { error: errReactivar } = await AppState.supabase
            .from('producto_multi')
            .update({ fecha_fin: null })
            .eq('id_producto_multi', existenteEnEsta.id_producto_multi);

          if (!errReactivar) {
            reactivadosCount++;
          }
        }
        // Si ya estaba activo (fecha_fin === null), no se duplica ni se altera
      } else {
        // El producto no existía en esta multi, se agrega nuevo
        nuevosParaInsertar.push({
          id_producto: pId,
          id_multiimplantacion: multiId,
          fecha_inicio: multiExistente.fecha_inicio || hoy,
          fecha_fin: null
        });
      }
    }

    if (nuevosParaInsertar.length > 0) {
      const { error: errPM } = await AppState.supabase.from('producto_multi').insert(nuevosParaInsertar);
      if (errPM) {
        showToast(`Error al asociar productos nuevos: ${errPM.message}`, 'error');
        return;
      }
    }

    if (reactivadosCount === 0 && nuevosParaInsertar.length === 0) {
      showToast('Los productos seleccionados ya se encontraban activos en esta multiimplantación.', 'info');
      return;
    }

    // Actualizar auditoría en multiimplantacion
    await AppState.supabase
      .from('multiimplantacion')
      .update({
        modificado_por: AppState.currentUser.id_usuario,
        modificado_en:  new Date().toISOString()
      })
      .eq('id_multiimplantacion', multiId);

    const detalle = [];
    if (reactivadosCount > 0) detalle.push(`${reactivadosCount} reactivado(s)`);
    if (nuevosParaInsertar.length > 0) detalle.push(`${nuevosParaInsertar.length} nuevo(s)`);
    showToast(`Multiimplantación actualizada con éxito (${detalle.join(', ')}).`, 'success');
  }

  // Limpieza y refresco
  deseleccionarTodosProductos();
  document.getElementById('form-multiimplantacion').reset();
  setInitialDates();
  await loadAllData();
  switchTab('multiimplantaciones');
}


// CU02. Registrar Ventas Semanales (Sin distinciones de rol)
async function handleRegistrarVentas(e) {
  e.preventDefault();
  if (!AppState.supabase) {
    showToast('Supabase no conectado.', 'warning');
    return;
  }

  const productoId = document.getElementById('venta-producto').value;
  const semana = parseInt(document.getElementById('venta-semana').value, 10);
  const anio = parseInt(document.getElementById('venta-anio').value, 10);
  const unidades = parseInt(document.getElementById('venta-unidades').value, 10);

  if (!productoId || isNaN(semana) || isNaN(anio) || isNaN(unidades)) {
    showToast('Completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (unidades < 0) {
    showToast('Las unidades vendidas no pueden ser negativas.', 'error');
    return;
  }

  if (semana < 1 || semana > 53) {
    showToast('La semana debe estar entre 1 y 53.', 'error');
    return;
  }

  const existingSale = AppState.data.ventas_semanales.find(
    v => v.id_producto === productoId && Number(v.semana) === semana && getVentaAnio(v) === anio
  );

  if (existingSale) {
    const prod = AppState.data.productos.find(p => p.id_producto === productoId);
    const prodNombre = prod ? prod.nombre : 'este producto';

    const confirmar = confirm(
      `Ya existe un registro para "${prodNombre}" en la Semana ${semana} de ${anio} (${existingSale.unidades_vendidas} unidades).\n\n¿Deseas actualizar el registro existente con ${unidades} unidades?`
    );

    if (!confirmar) return;

    const { error: errUpdate } = await AppState.supabase
      .from('venta_semanal')
      .update({ unidades_vendidas: unidades })
      .eq('id_venta', existingSale.id_venta);

    if (errUpdate) {
      showToast(`Error al actualizar venta: ${errUpdate.message}`, 'error');
      return;
    }

    document.getElementById('form-ventas').reset();
    setInitialDates();
    showToast('Venta actualizada correctamente.', 'success');
    await loadAllData();
    return;
  }

  const { error } = await AppState.supabase.from('venta_semanal').insert([{
    id_producto: productoId,
    semana: semana,
    año: anio,
    unidades_vendidas: unidades
  }]);

  if (error) {
    showToast(`Error al guardar: ${error.message}`, 'error');
    return;
  }

  document.getElementById('form-ventas').reset();
  setInitialDates();
  showToast('Ventas registradas correctamente en Supabase.', 'success');
  await loadAllData();
}


// Función de cálculo y renderizado del Dashboard de KPIs (Recomendación 1)
function renderKPIDashboard() {
  const elActivas = document.getElementById('kpi-multis-activas');
  const elTotal = document.getElementById('kpi-multis-total');
  const elProds = document.getElementById('kpi-prods-multi');
  const elExito = document.getElementById('kpi-tasa-exito');
  const elLider = document.getElementById('kpi-deporte-lider');
  const elLiderUds = document.getElementById('kpi-deporte-uds');

  if (!elActivas) return;

  const totalMultis = AppState.data.multiimplantaciones.length;
  const activasCount = AppState.data.multiimplantaciones.filter(m => {
    const rels = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === m.id_multiimplantacion);
    return rels.some(pm => !pm.fecha_fin);
  }).length;

  const prodsEnMultiActiva = new Set(
    AppState.data.producto_multi.filter(pm => !pm.fecha_fin).map(pm => pm.id_producto)
  ).size;

  // Cálculo de éxito comercial acumulado
  let prodsEvaluados = 0;
  let prodsExitosos = 0;
  AppState.data.multiimplantaciones.forEach(m => {
    const rels = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === m.id_multiimplantacion);
    rels.forEach(pm => {
      const metricas = calcularMetricasProductoMulti(m, pm.id_producto);
      if (metricas.variacionPorc !== null) {
        prodsEvaluados++;
        if (metricas.esPositivo) prodsExitosos++;
      }
    });
  });

  const tasaExito = prodsEvaluados > 0 ? Math.round((prodsExitosos / prodsEvaluados) * 100) : 0;

  // Deporte/categoría líder en ventas
  const ventasPorCat = {};
  AppState.data.ventas_semanales.forEach(v => {
    const prod = AppState.data.productos.find(p => p.id_producto === v.id_producto);
    const cat = prod?.categoria || 'otros';
    ventasPorCat[cat] = (ventasPorCat[cat] || 0) + (Number(v.unidades_vendidas) || 0);
  });

  let catLider = '—';
  let maxVentas = 0;
  for (const [cat, total] of Object.entries(ventasPorCat)) {
    if (total > maxVentas) {
      maxVentas = total;
      catLider = cat;
    }
  }

  elActivas.innerText = activasCount;
  if (elTotal) elTotal.innerText = `de ${totalMultis} totales`;
  if (elProds) elProds.innerText = prodsEnMultiActiva;
  if (elExito) elExito.innerText = `${tasaExito}%`;
  if (elLider) elLider.innerText = catLider;
  if (elLiderUds) elLiderUds.innerText = maxVentas > 0 ? `${maxVentas.toLocaleString()} uds vendidas` : 'Sin ventas registradas';
}

// CU03. Consultar Multiimplantaciones
function renderMultiimplantacionesTable() {
  renderKPIDashboard();
  const tbody = document.getElementById('tabla-multi-body');
  if (!tbody) return;

  const filterText = (document.getElementById('filter-multi-text')?.value || '').toLowerCase();
  const filterEstado = document.getElementById('filter-multi-estado')?.value || 'todos';

  tbody.innerHTML = '';

  const list = AppState.data.multiimplantaciones.filter(m => {
    const user = AppState.data.usuarios.find(u => u.id_usuario === m.id_usuario);
    const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === m.id_multiimplantacion);
    const productNames = relations.map(pm => {
      const p = AppState.data.productos.find(pr => pr.id_producto === pm.id_producto);
      return p ? p.nombre : '';
    }).join(' ');

    const matchesSearch = (m.ubicacion || '').toLowerCase().includes(filterText) ||
                          productNames.toLowerCase().includes(filterText) ||
                          (user && (user.nombre || '').toLowerCase().includes(filterText));

    const isFinished = relations.length > 0 && relations.every(pm => pm.fecha_fin !== null);
    const matchesStatus = (filterEstado === 'todos') ||
                          (filterEstado === 'activas' && !isFinished) ||
                          (filterEstado === 'finalizadas' && isFinished);

    return matchesSearch && matchesStatus;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400 font-medium">No hay multiimplantaciones registradas en Supabase.</td></tr>`;
    return;
  }

  list.forEach(m => {
    const creador     = AppState.data.usuarios.find(u => u.id_usuario === m.id_usuario);
    const modificador = m.modificado_por
      ? AppState.data.usuarios.find(u => u.id_usuario === m.modificado_por)
      : null;
    const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === m.id_multiimplantacion);
    const isActive  = relations.some(pm => !pm.fecha_fin);

    const productBadges = relations.map(pm => {
      const p = AppState.data.productos.find(pr => pr.id_producto === pm.id_producto);
      const safeNombre = escapeHtml(p ? p.nombre : 'Producto');
      return `<div class="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
        <span class="font-medium text-slate-700 truncate mr-2" title="${safeNombre}">${safeNombre}</span>
        ${pm.fecha_fin ? `<span class="text-slate-400 text-[10px]">Fin: ${escapeHtml(pm.fecha_fin)}</span>` : 
        (AppState.currentUser?.rol !== 'Responsable de tienda' ? 
          `<button onclick="finalizarProductoMulti('${escapeHtml(pm.id_producto_multi)}')" class="text-[11px] text-red-600 hover:text-red-800 underline">Finalizar</button>` : '')}
      </div>`;
    }).join('');

    // Formato de fecha legible para la auditoría
    const fechaMod = m.modificado_en
      ? new Date(m.modificado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
      : null;

    const auditCell = `
      <div class="text-xs space-y-0.5">
        <div class="flex items-center gap-1 text-slate-500">
          <span class="text-slate-400">👤 Creó:</span>
          <span class="font-semibold text-slate-700">${escapeHtml(creador ? creador.nombre : '—')}</span>
        </div>
        ${modificador && modificador.id_usuario !== (creador?.id_usuario) || fechaMod ? `
        <div class="flex items-center gap-1 text-slate-400">
          <span>✏️ Últ.:</span>
          <span class="font-medium text-slate-600">${escapeHtml(modificador ? modificador.nombre : '—')}</span>
          ${fechaMod ? `<span class="text-[10px] text-slate-400">${escapeHtml(fechaMod)}</span>` : ''}
        </div>` : ''}
      </div>`;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-200';
    tr.innerHTML = `
      <td class="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-sky-700">${escapeHtml(m.ubicacion)}</td>
      <td class="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600">${escapeHtml(m.fecha_inicio)}</td>
      <td class="px-5 py-3.5 text-sm text-slate-600 max-w-xs">${productBadges || '<span class="text-slate-400 italic">Sin productos</span>'}</td>
      <td class="px-5 py-3.5 whitespace-nowrap text-sm">${auditCell}</td>
      <td class="px-5 py-3.5 whitespace-nowrap text-sm">
        ${isActive ? 
          '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><span class="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>Activa</span>' : 
          '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Finalizada</span>'}
      </td>
      <td class="px-5 py-3.5 whitespace-nowrap text-right text-sm space-x-1.5">
        <button onclick="verAnalisisDirecto('${escapeHtml(m.id_multiimplantacion)}')" class="px-2.5 py-1 text-xs font-medium rounded-md text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors" title="Comparar ventas">
          Analizar
        </button>
        <button onclick="abrirEditarMulti('${escapeHtml(m.id_multiimplantacion)}')" class="px-2.5 py-1 text-xs font-medium rounded-md text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors" title="Editar multiimplantación">
          Editar
        </button>
        <button onclick="abrirEliminarMulti('${escapeHtml(m.id_multiimplantacion)}')" class="px-2.5 py-1 text-xs font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 transition-colors" title="Eliminar o desactivar">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------------------------------------
// EDICIÓN Y ELIMINACIÓN SEGURA DE MULTIIMPLANTACIONES
// ------------------------------------------------------------------------------
function abrirEditarMulti(idMulti) {
  const m = AppState.data.multiimplantaciones.find(item => item.id_multiimplantacion === idMulti);
  if (!m) return;

  document.getElementById('edit-multi-id').value = m.id_multiimplantacion;
  document.getElementById('edit-multi-ubicacion').value = m.ubicacion;
  document.getElementById('edit-multi-fecha-inicio').value = m.fecha_inicio;

  renderProductosEnEdicionMulti(idMulti);
  abrirModal('modal-editar-multi');
}

function renderProductosEnEdicionMulti(idMulti) {
  const container = document.getElementById('edit-multi-productos-lista');
  if (!container) return;

  const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === idMulti);
  container.innerHTML = '';

  if (relations.length === 0) {
    container.innerHTML = '<div class="p-3 text-slate-400 text-center italic">No hay productos vinculados a esta multiimplantación.</div>';
    return;
  }

  relations.forEach(pm => {
    const prod = AppState.data.productos.find(p => p.id_producto === pm.id_producto);
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200';

    const esActivo = !pm.fecha_fin;
    row.innerHTML = `
      <div class="truncate mr-2">
        <span class="font-bold text-slate-800 text-xs block truncate">${prod ? prod.nombre : 'Producto'}</span>
        <span class="text-[10px] text-slate-400 font-mono">${prod ? prod.referencia : ''} • Cat: ${prod ? prod.categoria : ''}</span>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${esActivo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
          ${esActivo ? 'Activo' : `Fin: ${pm.fecha_fin}`}
        </span>
        ${esActivo ? 
          `<button type="button" onclick="finalizarProductoEnEdicion('${pm.id_producto_multi}', '${idMulti}')" 
            class="text-[11px] px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded border border-amber-200 transition">
            Finalizar
          </button>` : 
          `<button type="button" onclick="reactivarProductoEnEdicion('${pm.id_producto_multi}', '${idMulti}')" 
            class="text-[11px] px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-medium rounded border border-sky-200 transition">
            Reactivar
          </button>`}
      </div>
    `;
    container.appendChild(row);
  });
}

async function finalizarProductoEnEdicion(idPm, idMulti) {
  if (!AppState.supabase) return;
  const hoy = new Date().toISOString().split('T')[0];
  const fechaFin = prompt('Fecha de corte/finalización para este producto (AAAA-MM-DD):', hoy);
  if (!fechaFin) return;

  const { error } = await AppState.supabase.from('producto_multi').update({ fecha_fin: fechaFin }).eq('id_producto_multi', idPm);
  if (error) {
    showToast(`Error al finalizar producto: ${error.message}`, 'error');
    return;
  }

  // Actualizar auditoría
  if (AppState.currentUser) {
    await AppState.supabase.from('multiimplantacion').update({
      modificado_por: AppState.currentUser.id_usuario,
      modificado_en: new Date().toISOString()
    }).eq('id_multiimplantacion', idMulti);
  }

  showToast('Producto finalizado en la exhibición.', 'success');
  await loadAllData();
  renderProductosEnEdicionMulti(idMulti);
}

async function reactivarProductoEnEdicion(idPm, idMulti) {
  if (!AppState.supabase) return;

  const currentPm = AppState.data.producto_multi.find(pm => pm.id_producto_multi === idPm);
  if (currentPm) {
    const activoEnOtra = AppState.data.producto_multi.find(
      pm => pm.id_producto === currentPm.id_producto && !pm.fecha_fin && pm.id_multiimplantacion !== idMulti
    );
    if (activoEnOtra) {
      const otraMulti = AppState.data.multiimplantaciones.find(m => m.id_multiimplantacion === activoEnOtra.id_multiimplantacion);
      showToast(`No se puede reactivar: este producto ya está activo en "${otraMulti?.ubicacion || 'otra exhibición'}".`, 'error');
      return;
    }
  }

  const { error } = await AppState.supabase.from('producto_multi').update({ fecha_fin: null }).eq('id_producto_multi', idPm);
  if (error) {
    showToast(`Error al reactivar producto: ${error.message}`, 'error');
    return;
  }

  if (AppState.currentUser) {
    await AppState.supabase.from('multiimplantacion').update({
      modificado_por: AppState.currentUser.id_usuario,
      modificado_en: new Date().toISOString()
    }).eq('id_multiimplantacion', idMulti);
  }

  showToast('Producto reactivado en la exhibición.', 'success');
  await loadAllData();
  renderProductosEnEdicionMulti(idMulti);
}

async function guardarEditarMulti(e) {
  e.preventDefault();
  if (!AppState.supabase) {
    showToast('Supabase no conectado.', 'warning');
    return;
  }

  const idMulti = document.getElementById('edit-multi-id').value;
  const ubicacion = document.getElementById('edit-multi-ubicacion').value.trim();
  const fechaInicio = document.getElementById('edit-multi-fecha-inicio').value;

  if (!idMulti || !ubicacion || !fechaInicio) {
    showToast('Completa los campos obligatorios.', 'warning');
    return;
  }

  const updateData = {
    ubicacion: ubicacion,
    fecha_inicio: fechaInicio,
    modificado_por: AppState.currentUser?.id_usuario || null,
    modificado_en: new Date().toISOString()
  };

  const { error } = await AppState.supabase
    .from('multiimplantacion')
    .update(updateData)
    .eq('id_multiimplantacion', idMulti);

  if (error) {
    showToast(`Error al actualizar multiimplantación: ${error.message}`, 'error');
    return;
  }

  cerrarModal('modal-editar-multi');
  showToast('Multiimplantación actualizada correctamente.', 'success');
  await loadAllData();
}

function abrirEliminarMulti(idMulti) {
  const m = AppState.data.multiimplantaciones.find(item => item.id_multiimplantacion === idMulti);
  if (!m) return;

  document.getElementById('del-multi-id').value = idMulti;
  const textEl = document.getElementById('del-multi-ubicacion-text');
  if (textEl) textEl.innerText = `"${m.ubicacion}" (${m.fecha_inicio})`;

  const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === idMulti);
  const infoBox = document.getElementById('del-multi-info-box');
  if (infoBox) {
    infoBox.innerHTML = `
      <p class="font-semibold text-amber-900">Control de Integridad Histórica:</p>
      <p class="text-[11px] text-amber-800">
        Esta multiimplantación tiene <strong>${relations.length} productos asociados</strong>. 
        Recomendamos <strong>Desactivar / Finalizar</strong> para conservar el historial de ventas y la comparativa sin romper los gráficos.
      </p>
    `;
  const inputFechaFin = document.getElementById('del-multi-fecha-fin');
  if (inputFechaFin) {
    inputFechaFin.value = new Date().toISOString().split('T')[0];
  }

  abrirModal('modal-confirmar-eliminar-multi');
}}

async function ejecutarDesactivarMulti() {
  const idMulti = document.getElementById('del-multi-id').value;
  if (!idMulti || !AppState.supabase) return;

  const fechaFinInput = document.getElementById('del-multi-fecha-fin')?.value;
  const fechaFin = fechaFinInput || new Date().toISOString().split('T')[0];

  // Marcar todos los productos asociados como finalizados
  const { error: errPM } = await AppState.supabase
    .from('producto_multi')
    .update({ fecha_fin: fechaFin })
    .eq('id_multiimplantacion', idMulti);

  if (errPM) {
    showToast(`Error al desactivar productos: ${errPM.message}`, 'error');
    return;
  }

  // Actualizar auditoría
  if (AppState.currentUser) {
    await AppState.supabase
      .from('multiimplantacion')
      .update({
        modificado_por: AppState.currentUser.id_usuario,
        modificado_en: new Date().toISOString()
      })
      .eq('id_multiimplantacion', idMulti);
  }

  cerrarModal('modal-confirmar-eliminar-multi');
  showToast('Multiimplantación finalizada correctamente.', 'success');
  await loadAllData();
}

async function ejecutarEliminarFisicoMulti() {
  const idMulti = document.getElementById('del-multi-id').value;
  if (!idMulti || !AppState.supabase) return;

  if (!confirm('¿CONFIRMAS EL BORRADO DEFINITIVO? Esta acción eliminará permanentemente la multiimplantación y sus productos asociados.')) {
    return;
  }

  const { error } = await AppState.supabase
    .from('multiimplantacion')
    .delete()
    .eq('id_multiimplantacion', idMulti);

  if (error) {
    showToast(`Error al eliminar: ${error.message}`, 'error');
    return;
  }

  cerrarModal('modal-confirmar-eliminar-multi');
  showToast('Multiimplantación eliminada correctamente.', 'success');
  await loadAllData();
}


async function finalizarProductoMulti(id_pm) {
  if (!AppState.supabase) return;
  const hoy = new Date().toISOString().split('T')[0];

  // 1. Finalizar el producto_multi
  const { data: pmData, error: errPM } = await AppState.supabase
    .from('producto_multi')
    .update({ fecha_fin: hoy })
    .eq('id_producto_multi', id_pm)
    .select('id_multiimplantacion')
    .single();

  if (errPM) {
    showToast(`Error: ${errPM.message}`, 'error');
    return;
  }

  // 2. Actualizar auditoría en la multiimplantacion padre
  if (pmData?.id_multiimplantacion && AppState.currentUser) {
    await AppState.supabase
      .from('multiimplantacion')
      .update({
        modificado_por: AppState.currentUser.id_usuario,
        modificado_en:  new Date().toISOString()
      })
      .eq('id_multiimplantacion', pmData.id_multiimplantacion);
  }

  showToast(`Finalizado por ${AppState.currentUser?.nombre}. Registro guardado.`, 'success');
  await loadAllData();
}

// CU04 & CU05. Comparar Ventas y Evaluar Resultado
function populateEvaluationSelectors() {
  const selectMulti = document.getElementById('eval-multi');
  if (!selectMulti) return;

  const currentMultiVal = selectMulti.value;
  selectMulti.innerHTML = '<option value="">-- Selecciona una multiimplantación --</option>';
  AppState.data.multiimplantaciones.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id_multiimplantacion;
    opt.textContent = `${m.ubicacion} (Inicio: ${m.fecha_inicio})`;
    selectMulti.appendChild(opt);
  });

  if (currentMultiVal) {
    selectMulti.value = currentMultiVal;
  }

  selectMulti.onchange = () => {
    alCambiarMultiEvaluacion();
  };

  const selectProd = document.getElementById('eval-producto');
  if (selectProd) {
    selectProd.onchange = () => {
      const prodId = selectProd.value;
      if (prodId) {
        enfocarProductoEvaluacion(prodId);
      } else {
        quitarFocoProducto();
      }
    };
  }
}

function alCambiarMultiEvaluacion() {
  const selectMulti = document.getElementById('eval-multi');
  const selectProd = document.getElementById('eval-producto');
  const mId = selectMulti ? selectMulti.value : '';

  if (!selectProd) return;
  selectProd.innerHTML = '<option value="">-- Todos los productos (General) --</option>';

  const overviewContainer = document.getElementById('eval-overview-container');
  const resultsContainer = document.getElementById('eval-results-container');
  const alertNoData = document.getElementById('eval-no-data');

  if (!mId) {
    if (overviewContainer) overviewContainer.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
    if (alertNoData) alertNoData.classList.add('hidden');
    return;
  }

  const multi = AppState.data.multiimplantaciones.find(m => m.id_multiimplantacion === mId);
  const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === mId);

  // Llenar selector de foco de productos
  relations.forEach(pm => {
    const p = AppState.data.productos.find(pr => pr.id_producto === pm.id_producto);
    if (p) {
      const opt = document.createElement('option');
      opt.value = p.id_producto;
      opt.textContent = `${p.nombre} (${p.referencia})`;
      selectProd.appendChild(opt);
    }
  });

  if (relations.length === 0) {
    if (alertNoData) {
      alertNoData.classList.remove('hidden');
      alertNoData.innerHTML = `
        <div class="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded-xl text-xs">
          <p class="font-bold text-sm">Sin productos asociados</p>
          <p class="mt-1">Esta multiimplantación no tiene productos vinculados actualmente.</p>
        </div>`;
    }
    if (overviewContainer) overviewContainer.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
    return;
  }

  if (alertNoData) alertNoData.classList.add('hidden');

  // Renderizar la tabla de rendimiento de TODOS los productos de la multi
  renderRendimientoTodosProductos(multi, relations);

  // Ocultar el foco individual hasta que el usuario elija uno o haga clic en "Ver Detalle"
  if (resultsContainer) resultsContainer.classList.add('hidden');
}

function parseDateStrToKey(dateStr) {
  if (!dateStr) return null;
  // Extraer año, mes y día explícitos para evitar desplazamientos por zona horaria UTC
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const fechaObj = new Date(Date.UTC(y, m, d));
  const semana = getWeekNumber(fechaObj);
  // Determinar año ISO exacto para la semana
  const dayNum = fechaObj.getUTCDay() || 7;
  fechaObj.setUTCDate(fechaObj.getUTCDate() + 4 - dayNum);
  const isoYear = fechaObj.getUTCFullYear();
  return {
    key: isoYear * 100 + semana,
    semana,
    anio: isoYear
  };
}

function calcularMetricasProductoMulti(multi, prodId) {
  // Buscar relación específica en producto_multi para precisión por producto
  const rel = AppState.data.producto_multi.find(
    pm => pm.id_producto === prodId && pm.id_multiimplantacion === multi.id_multiimplantacion
  );

  const fechaInicioStr = (rel && rel.fecha_inicio) ? rel.fecha_inicio : multi.fecha_inicio;
  const inicioParsed = parseDateStrToKey(fechaInicioStr) || { key: 0, semana: 1, anio: 2026 };
  const semanaInicio = inicioParsed.semana;
  const anioInicio = inicioParsed.anio;
  const periodoInicioKey = inicioParsed.key;

  // Fecha de fin (si el producto fue finalizado en esta multi)
  let periodoFinKey = null;
  let semanaFin = null;
  let anioFin = null;
  if (rel && rel.fecha_fin) {
    const finParsed = parseDateStrToKey(rel.fecha_fin);
    if (finParsed) {
      semanaFin = finParsed.semana;
      anioFin = finParsed.anio;
      periodoFinKey = finParsed.key;
    }
  }

  const ventas = AppState.data.ventas_semanales
    .filter(v => v.id_producto === prodId)
    .sort((a, b) => (getVentaAnio(a) * 100 + Number(a.semana)) - (getVentaAnio(b) * 100 + Number(b.semana)));

  // 1. Ventas previas a la implantación del producto (Sin Multi)
  const ventasAntes = ventas.filter(v => {
    const anioVenta = getVentaAnio(v);
    const semVenta = Number(v.semana);
    return (anioVenta * 100 + semVenta) < periodoInicioKey;
  });

  // 2. Ventas durante la multi activa (Con Multiimplantación)
  const ventasDespues = ventas.filter(v => {
    const anioVenta = getVentaAnio(v);
    const semVenta = Number(v.semana);
    const key = anioVenta * 100 + semVenta;
    if (key < periodoInicioKey) return false;
    if (periodoFinKey && key > periodoFinKey) return false;
    return true;
  });

  // 3. Ventas posteriores (cuando la multi ya fue finalizada/desactivada)
  const ventasPosteriores = ventas.filter(v => {
    if (!periodoFinKey) return false;
    const anioVenta = getVentaAnio(v);
    const semVenta = Number(v.semana);
    return (anioVenta * 100 + semVenta) > periodoFinKey;
  });

  const sumaAntes = ventasAntes.reduce((acc, v) => acc + Number(v.unidades_vendidas), 0);
  const promAntes = ventasAntes.length > 0 ? (sumaAntes / ventasAntes.length) : null;

  const sumaDespues = ventasDespues.reduce((acc, v) => acc + Number(v.unidades_vendidas), 0);
  const promDespues = ventasDespues.length > 0 ? (sumaDespues / ventasDespues.length) : null;

  let variacionPorc = null;
  let esPositivo = null;
  if (promAntes !== null && promDespues !== null) {
    variacionPorc = promAntes > 0 ? (((promDespues - promAntes) / promAntes) * 100) : 100;
    esPositivo = variacionPorc > 0;
  }

  return {
    semanaInicio,
    anioInicio,
    periodoInicioKey,
    periodoFinKey,
    semanaFin,
    anioFin,
    fechaInicioStr,
    fechaFinStr: rel?.fecha_fin || null,
    ventas,
    ventasAntes,
    ventasDespues,
    ventasPosteriores,
    promAntes,
    promDespues,
    variacionPorc,
    esPositivo
  };
}

function renderRendimientoTodosProductos(multi, relations) {
  const overviewContainer = document.getElementById('eval-overview-container');
  const tbody = document.getElementById('eval-tabla-productos-body');
  const badgeTotal = document.getElementById('eval-multi-badge-total');
  const titulo = document.getElementById('eval-multi-titulo');
  const subtitulo = document.getElementById('eval-multi-subtitulo');

  if (!overviewContainer || !tbody) return;

  overviewContainer.classList.remove('hidden');

  if (badgeTotal) badgeTotal.innerText = `${relations.length} productos`;
  if (titulo) titulo.innerText = `Rendimiento de Productos en: ${multi.ubicacion}`;
  if (subtitulo) subtitulo.innerText = `Fecha de Inicio: ${multi.fecha_inicio} • Analizando impacto comercial por producto.`;

  tbody.innerHTML = '';

  relations.forEach(pm => {
    const prod = AppState.data.productos.find(p => p.id_producto === pm.id_producto);
    if (!prod) return;

    const metricas = calcularMetricasProductoMulti(multi, prod.id_producto);
    const esActivo = !pm.fecha_fin;

    let varBadge = '<span class="text-slate-400 italic text-[11px]">Sin datos suficientes</span>';
    let impactoHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">Requiere ventas antes/después</span>';

    if (metricas.variacionPorc !== null) {
      const sign = metricas.esPositivo ? '+' : '';
      const colorCls = metricas.esPositivo ? 'text-emerald-700 font-black' : 'text-rose-600 font-black';
      varBadge = `<span class="${colorCls}">${sign}${metricas.variacionPorc.toFixed(1)}%</span>`;

      if (metricas.esPositivo) {
        impactoHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span>▲ Positivo</span> (+${metricas.variacionPorc.toFixed(1)}%)
        </span>`;
      } else {
        impactoHtml = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <span>▼ Sin incremento</span> (${metricas.variacionPorc.toFixed(1)}%)
        </span>`;
      }
    }

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0';
    tr.innerHTML = `
      <td class="px-4 py-3">
        <div class="font-bold text-slate-800 text-xs">${prod.nombre}</div>
        <div class="text-[10px] text-slate-400 font-mono">${prod.referencia}</div>
      </td>
      <td class="px-3 py-3 capitalize text-slate-600 font-medium">${prod.categoria || '—'}</td>
      <td class="px-3 py-3 text-center">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${esActivo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
          ${esActivo ? 'Activo' : `Fin: ${pm.fecha_fin}`}
        </span>
      </td>
      <td class="px-3 py-3 text-right font-medium text-slate-700">
        ${metricas.promAntes !== null ? `${metricas.promAntes.toFixed(1)} <span class="text-[10px] text-slate-400">uds/s</span>` : '<span class="text-slate-400">—</span>'}
      </td>
      <td class="px-3 py-3 text-right font-bold text-sky-800">
        ${metricas.promDespues !== null ? `${metricas.promDespues.toFixed(1)} <span class="text-[10px] text-sky-600">uds/s</span>` : '<span class="text-slate-400">—</span>'}
      </td>
      <td class="px-3 py-3 text-right">
        ${varBadge}
      </td>
      <td class="px-4 py-3 text-center">
        ${impactoHtml}
      </td>
      <td class="px-3 py-3 text-right">
        <button type="button" onclick="enfocarProductoEvaluacion('${prod.id_producto}')"
          class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition" title="Ver gráfica detallada de este producto">
          Detalle y Gráfica
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function enfocarProductoEvaluacion(prodId) {
  const selectProd = document.getElementById('eval-producto');
  if (selectProd && selectProd.value !== prodId) {
    selectProd.value = prodId;
  }
  ejecutarEvaluacionFoco(prodId);
}

function quitarFocoProducto() {
  const selectProd = document.getElementById('eval-producto');
  if (selectProd) selectProd.value = '';
  const resultsContainer = document.getElementById('eval-results-container');
  const alertNoData = document.getElementById('eval-no-data');
  if (resultsContainer) resultsContainer.classList.add('hidden');
  if (alertNoData) alertNoData.classList.add('hidden');
}

function verAnalisisDirecto(idMulti) {
  switchTab('evaluacion');
  const selectMulti = document.getElementById('eval-multi');
  if (selectMulti) {
    selectMulti.value = idMulti;
    alCambiarMultiEvaluacion();
  }
}

function ejecutarEvaluacionFoco(prodId) {
  const multiId = document.getElementById('eval-multi')?.value;
  const containerResults = document.getElementById('eval-results-container');
  const alertNoData = document.getElementById('eval-no-data');

  if (!multiId || !prodId) {
    if (containerResults) containerResults.classList.add('hidden');
    return;
  }

  const multi = AppState.data.multiimplantaciones.find(m => m.id_multiimplantacion === multiId);
  const producto = AppState.data.productos.find(p => p.id_producto === prodId);
  if (!multi || !producto) return;

  const metricas = calcularMetricasProductoMulti(multi, prodId);

  if (metricas.ventasAntes.length === 0 || metricas.ventasDespues.length === 0) {
    if (alertNoData) {
      alertNoData.classList.remove('hidden');
      alertNoData.innerHTML = `
        <div class="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded-xl text-xs">
          <p class="font-bold text-sm">Datos insuficientes para el producto "${producto.nombre}"</p>
          <p class="mt-1">Se requieren registros de ventas semanales tanto <strong>antes</strong> de la semana ${metricas.semanaInicio} de ${metricas.anioInicio} como <strong>después</strong>. Encontrados: ${metricas.ventasAntes.length} antes, ${metricas.ventasDespues.length} después.</p>
        </div>
      `;
    }
    if (containerResults) containerResults.classList.add('hidden');
    return;
  }

  if (alertNoData) alertNoData.classList.add('hidden');
  if (containerResults) containerResults.classList.remove('hidden');

  document.getElementById('stat-producto-nombre').innerText = producto.nombre;
  const periodoStr = metricas.fechaFinStr 
    ? `Sem ${metricas.semanaInicio}/${metricas.anioInicio} a Sem ${metricas.semanaFin}/${metricas.anioFin}`
    : `Desde Sem ${metricas.semanaInicio}/${metricas.anioInicio} (Activo)`;
  document.getElementById('stat-ubicacion').innerText = `${multi.ubicacion} (${periodoStr})`;
  document.getElementById('stat-prom-antes').innerText = metricas.promAntes.toFixed(1) + ' uds/sem';
  document.getElementById('stat-prom-despues').innerText = metricas.promDespues.toFixed(1) + ' uds/sem';
  
  const varEl = document.getElementById('stat-variacion');
  varEl.innerText = (metricas.esPositivo ? '+' : '') + metricas.variacionPorc.toFixed(1) + '%';
  varEl.className = 'text-2xl font-black ' + (metricas.esPositivo ? 'text-emerald-600' : 'text-rose-600');

  const veredictoEl = document.getElementById('stat-veredicto');
  let infoPosterior = '';
  if (metricas.ventasPosteriores && metricas.ventasPosteriores.length > 0) {
    const sumaPost = metricas.ventasPosteriores.reduce((acc, v) => acc + Number(v.unidades_vendidas), 0);
    const promPost = sumaPost / metricas.ventasPosteriores.length;
    infoPosterior = `<div class="mt-2.5 pt-2.5 border-t border-amber-200 text-xs text-amber-900 flex items-center gap-1.5">
      <span class="font-bold">⚠ Período posterior (multi desactivada/fin):</span>
      <span>${metricas.ventasPosteriores.length} semana(s) registradas con promedio de <strong>${promPost.toFixed(1)} uds/sem</strong> (resaltadas en color ámbar en el gráfico).</span>
    </div>`;
  }

  if (metricas.esPositivo) {
    veredictoEl.className = 'p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm';
    veredictoEl.innerHTML = `<div><strong>Impacto Comercial Positivo:</strong> Incremento en ventas del <strong>${metricas.variacionPorc.toFixed(1)}%</strong> promedio semanal durante la exhibición activa.</div>${infoPosterior}`;
  } else {
    veredictoEl.className = 'p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm';
    veredictoEl.innerHTML = `<div><strong>Sin Incremento Evidenciado:</strong> Variación del <strong>${metricas.variacionPorc.toFixed(1)}%</strong>. Se sugiere evaluar reubicación o sustitución del artículo.</div>${infoPosterior}`;
  }

  renderComparisonChart(metricas.ventas, metricas.periodoInicioKey, metricas.periodoFinKey);
}

function renderComparisonChart(ventas, periodoInicioKey, periodoFinKey) {
  const canvas = document.getElementById('chart-ventas-comparacion');
  if (!canvas) return;

  const labels = ventas.map(v => `Sem ${v.semana} (${getVentaAnio(v)})`);
  const dataUnits = ventas.map(v => Number(v.unidades_vendidas));

  // Diferenciación clara de los 3 estados:
  // 1. Semanas Previas (Sin Multi): Gris (#94a3b8)
  // 2. Durante Multiimplantación (Activa): Azul Decathlon (#0082c3)
  // 3. Semanas Posteriores a la desactivación (Pausada/Fin): Ámbar (#f59e0b)
  const backgroundColors = ventas.map(v => {
    const anio = getVentaAnio(v);
    const sem = Number(v.semana);
    const key = anio * 100 + sem;

    if (key < periodoInicioKey) {
      return '#94a3b8'; // Gris: Previas (Sin Multi)
    } else if (!periodoFinKey || key <= periodoFinKey) {
      return '#0082c3'; // Azul Decathlon: Durante Multi (Activa)
    } else {
      return '#f59e0b'; // Ámbar: Posteriores a la desactivación (Pausada/Fin)
    }
  });

  const borderColors = ventas.map(v => {
    const anio = getVentaAnio(v);
    const sem = Number(v.semana);
    const key = anio * 100 + sem;

    if (key < periodoInicioKey) {
      return '#64748b';
    } else if (!periodoFinKey || key <= periodoFinKey) {
      return '#001489';
    } else {
      return '#d97706';
    }
  });

  if (AppState.chartInstance) {
    AppState.chartInstance.destroy();
  }

  AppState.chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Unidades vendidas',
          data: dataUnits,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const v = ventas[context.dataIndex];
              const anio = getVentaAnio(v);
              const sem = Number(v.semana);
              const key = anio * 100 + sem;

              if (key < periodoInicioKey) {
                return '○ Semanas Previas (Sin Multiimplantación)';
              } else if (!periodoFinKey || key <= periodoFinKey) {
                return '★ Durante Multiimplantación (Activa)';
              } else {
                return '⚠ Semanas Posteriores (Multiimplantación Pausada/Finalizada)';
              }
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Unidades Semanales' },
          grid: { color: '#f1f5f9' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

// Exportación de Resultados a CSV (Recomendación 3)
function exportarEvaluacionCSV() {
  const multiId = document.getElementById('eval-multi')?.value;
  if (!multiId) {
    showToast('Selecciona primero una multiimplantación para exportar su informe.', 'warning');
    return;
  }

  const multi = AppState.data.multiimplantaciones.find(m => m.id_multiimplantacion === multiId);
  const relations = AppState.data.producto_multi.filter(pm => pm.id_multiimplantacion === multiId);

  if (!multi || relations.length === 0) {
    showToast('No hay datos para exportar en esta multiimplantación.', 'warning');
    return;
  }

  const rows = [
    ['REPORTE DE EVALUACION DE MULTIIMPLANTACION - DECATHLON'],
    [`Ubicacion:`, `"${multi.ubicacion}"`],
    [`Fecha Inicio Multi:`, multi.fecha_inicio],
    [`Generado el:`, new Date().toLocaleString('es-CO')],
    []
  ];

  rows.push([
    'Referencia',
    'Producto',
    'Categoria',
    'Estado en Multi',
    'Fecha Inicio Prod',
    'Fecha Fin Prod',
    'Promedio Antes (uds/sem)',
    'Promedio Con Multi (uds/sem)',
    'Variacion Relativa (%)',
    'Impacto Comercial'
  ]);

  relations.forEach(pm => {
    const prod = AppState.data.productos.find(p => p.id_producto === pm.id_producto);
    if (!prod) return;

    const metricas = calcularMetricasProductoMulti(multi, prod.id_producto);
    const esActivo = !pm.fecha_fin;

    const promAntesStr = metricas.promAntes !== null ? metricas.promAntes.toFixed(2) : 'N/D';
    const promDespuesStr = metricas.promDespues !== null ? metricas.promDespues.toFixed(2) : 'N/D';
    const varStr = metricas.variacionPorc !== null ? `${metricas.variacionPorc.toFixed(2)}%` : 'N/D';
    let impacto = 'Sin datos suficientes';
    if (metricas.variacionPorc !== null) {
      impacto = metricas.esPositivo ? 'Positivo (Incremento)' : 'Sin incremento (Desfavorable)';
    }

    rows.push([
      `"${prod.referencia || ''}"`,
      `"${prod.nombre}"`,
      `"${prod.categoria || ''}"`,
      esActivo ? 'Activo' : 'Finalizado',
      metricas.fechaInicioStr,
      metricas.fechaFinStr || 'Vigente',
      promAntesStr,
      promDespuesStr,
      varStr,
      `"${impacto}"`
    ]);
  });

  const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = multi.ubicacion.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('href', url);
  link.setAttribute('download', `evaluacion_multi_${safeName}_${multi.fecha_inicio}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Reporte exportado en formato CSV exitosamente.', 'success');
}

// Selector de Productos en Ventas con Filtro de Activos (Recomendación 1)
function populateProductSelects() {
  const selectVentas = document.getElementById('venta-producto');
  const selectEditVenta = document.getElementById('edit-venta-producto');
  const soloActivos = document.getElementById('filtro-ventas-solo-activos')?.checked;

  // Actualizar componentes interactivos de productos y multiimplantaciones
  renderCategoriasFiltroProductos();
  renderListaProductosCheckbox();
  populateMultiExistenteSelect();

  // Conjunto de IDs de productos que tienen al menos una multi activa
  const productosActivosIds = new Set(
    AppState.data.producto_multi.filter(pm => !pm.fecha_fin).map(pm => pm.id_producto)
  );

  if (selectVentas) {
    const valPrevio = selectVentas.value;
    selectVentas.innerHTML = '<option value="">-- Selecciona el producto --</option>';

    const productosAFiltrar = soloActivos
      ? AppState.data.productos.filter(p => productosActivosIds.has(p.id_producto))
      : AppState.data.productos;

    if (productosAFiltrar.length === 0 && soloActivos) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.textContent = 'No hay productos con multiimplantación activa';
      selectVentas.appendChild(opt);
    } else {
      productosAFiltrar.forEach(p => {
        const tieneMulti = productosActivosIds.has(p.id_producto);
        const opt = document.createElement('option');
        opt.value = p.id_producto;
        opt.textContent = `${tieneMulti ? '⭐ [EN MULTI] ' : ''}${p.nombre} [${p.referencia}] - ${p.categoria}`;
        selectVentas.appendChild(opt);
      });
    }

    if (valPrevio && productosAFiltrar.some(p => p.id_producto === valPrevio)) {
      selectVentas.value = valPrevio;
    }
    actualizarInfoProductoVenta();
  }

  if (selectEditVenta) {
    selectEditVenta.innerHTML = '<option value="">-- Selecciona el producto --</option>';
    AppState.data.productos.forEach(p => {
      const tieneMulti = productosActivosIds.has(p.id_producto);
      const opt = document.createElement('option');
      opt.value = p.id_producto;
      opt.textContent = `${tieneMulti ? '⭐ ' : ''}${p.nombre} [${p.referencia}] - ${p.categoria}`;
      selectEditVenta.appendChild(opt);
    });
  }
}

function actualizarInfoProductoVenta() {
  const prodId = document.getElementById('venta-producto')?.value;
  const infoEl = document.getElementById('venta-prod-multi-info');
  if (!infoEl) return;

  if (!prodId) {
    infoEl.classList.add('hidden');
    infoEl.innerHTML = '';
    return;
  }

  const multisActivas = AppState.data.producto_multi
    .filter(pm => pm.id_producto === prodId && !pm.fecha_fin)
    .map(pm => {
      const m = AppState.data.multiimplantaciones.find(item => item.id_multiimplantacion === pm.id_multiimplantacion);
      return m ? `"${m.ubicacion}"` : 'Ubicación adicional';
    });

  if (multisActivas.length > 0) {
    infoEl.classList.remove('hidden');
    infoEl.innerHTML = `
      <span class="font-bold text-sky-800">⭐ En Multiimplantación Activa:</span>
      <span class="text-sky-700">${multisActivas.join(', ')}</span>
    `;
  } else {
    infoEl.classList.add('hidden');
    infoEl.innerHTML = '';
  }
}

// Asistente rápido de fecha y semana actual (Recomendación 3)
function asignarSemanaActualVenta() {
  const hoy = new Date();
  const semana = getWeekNumber(hoy);
  const anio = hoy.getFullYear();

  const semInput = document.getElementById('venta-semana');
  const anioInput = document.getElementById('venta-anio');

  if (semInput) semInput.value = semana;
  if (anioInput) anioInput.value = anio;

  showToast(`Semana ${semana} de ${anio} asignada.`, 'info');
}

// Renderizado de tabla de ventas con buscador y filtro por año (Recomendación 2)
function renderVentasTable() {
  const tbody = document.getElementById('tabla-ventas-body');
  const filterText = (document.getElementById('filter-ventas-text')?.value || '').toLowerCase().trim();
  const filterAnio = document.getElementById('filter-ventas-anio')?.value || 'todos';

  if (!tbody) return;

  // Actualizar selector de años disponibles
  const selectAnio = document.getElementById('filter-ventas-anio');
  if (selectAnio && selectAnio.options.length <= 1) {
    const aniosDisponibles = [...new Set(AppState.data.ventas_semanales.map(v => getVentaAnio(v)))].sort((a, b) => b - a);
    aniosDisponibles.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = `Año ${a}`;
      selectAnio.appendChild(opt);
    });
  }

  tbody.innerHTML = '';

  const list = AppState.data.ventas_semanales.filter(v => {
    const p = AppState.data.productos.find(prod => prod.id_producto === v.id_producto);
    const prodNombre = (p?.nombre || '').toLowerCase();
    const prodRef = (p?.referencia || '').toLowerCase();

    const coincideTexto = !filterText || prodNombre.includes(filterText) || prodRef.includes(filterText);
    const vAnio = getVentaAnio(v);
    const coincideAnio = (filterAnio === 'todos') || (String(vAnio) === String(filterAnio));

    return coincideTexto && coincideAnio;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-5 py-6 text-center text-slate-400">No se encontraron ventas que coincidan con los filtros.</td></tr>`;
    return;
  }

  list.slice(0, 100).forEach(v => {
    const p = AppState.data.productos.find(prod => prod.id_producto === v.id_producto);
    const safeNombre = escapeHtml(p ? p.nombre : 'Producto');
    const safeRef = escapeHtml(p?.referencia || '');
    const vAnio = getVentaAnio(v);
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 border-b border-slate-200 transition-colors';
    tr.innerHTML = `
      <td class="px-5 py-3 font-medium text-slate-800">
        <div>${safeNombre}</div>
        <div class="text-[10px] text-slate-400 font-mono">${safeRef}</div>
      </td>
      <td class="px-4 py-3 text-center text-slate-600 font-semibold">Semana ${escapeHtml(v.semana)}</td>
      <td class="px-4 py-3 text-center text-slate-600">${escapeHtml(vAnio)}</td>
      <td class="px-4 py-3 text-right font-bold text-sky-700">${escapeHtml(v.unidades_vendidas)} uds</td>
      <td class="px-4 py-3 text-right">
        <button onclick="abrirEditarVenta('${escapeHtml(v.id_venta)}')" class="text-xs text-sky-700 hover:text-sky-900 font-semibold underline">
          Editar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function abrirEditarVenta(idVenta) {
  const v = AppState.data.ventas_semanales.find(item => item.id_venta === idVenta);
  if (!v) return;

  document.getElementById('edit-venta-id').value = v.id_venta;

  const selProd = document.getElementById('edit-venta-producto');
  if (selProd) {
    selProd.innerHTML = '';
    AppState.data.productos.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id_producto;
      opt.textContent = `${p.nombre} [${p.referencia}] - ${p.categoria}`;
      selProd.appendChild(opt);
    });
    selProd.value = v.id_producto;
  }

  document.getElementById('edit-venta-semana').value = v.semana;
  document.getElementById('edit-venta-anio').value = getVentaAnio(v);
  document.getElementById('edit-venta-unidades').value = v.unidades_vendidas;

  abrirModal('modal-editar-venta');
}

async function guardarEditarVenta(e) {
  e.preventDefault();
  if (!AppState.supabase) {
    showToast('Supabase no conectado.', 'warning');
    return;
  }

  const idVenta = document.getElementById('edit-venta-id').value;
  const prodId = document.getElementById('edit-venta-producto').value;
  const semana = parseInt(document.getElementById('edit-venta-semana').value, 10);
  const anio = parseInt(document.getElementById('edit-venta-anio').value, 10);
  const unidades = parseInt(document.getElementById('edit-venta-unidades').value, 10);

  if (!idVenta || !prodId || isNaN(semana) || isNaN(anio) || isNaN(unidades)) {
    showToast('Completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (unidades < 0) {
    showToast('Las unidades vendidas no pueden ser negativas.', 'error');
    return;
  }

  if (semana < 1 || semana > 53) {
    showToast('La semana debe estar entre 1 y 53.', 'error');
    return;
  }

  // Validar si ya existe otro registro diferente para el mismo producto, semana y año
  const duplicado = AppState.data.ventas_semanales.find(
    v => v.id_producto === prodId && Number(v.semana) === semana && getVentaAnio(v) === anio && v.id_venta !== idVenta
  );

  if (duplicado) {
    showToast(`Ya existe otro registro para este producto en la Semana ${semana} de ${anio}.`, 'error');
    return;
  }

  const { error } = await AppState.supabase
    .from('venta_semanal')
    .update({
      id_producto: prodId,
      semana: semana,
      año: anio,
      unidades_vendidas: unidades
    })
    .eq('id_venta', idVenta);

  if (error) {
    showToast(`Error al actualizar venta: ${error.message}`, 'error');
    return;
  }

  cerrarModal('modal-editar-venta');
  showToast('Venta actualizada correctamente.', 'success');
  await loadAllData();
}


function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function setInitialDates() {
  const hoy = new Date();
  const regFecha = document.getElementById('reg-fecha-inicio');
  if (regFecha) regFecha.value = hoy.toISOString().split('T')[0];

  const ventaSemana = document.getElementById('venta-semana');
  const ventaAnio = document.getElementById('venta-anio');
  if (ventaSemana) ventaSemana.value = getWeekNumber(hoy);
  if (ventaAnio) ventaAnio.value = hoy.getFullYear();
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  let bg = 'bg-slate-900';
  if (type === 'success') bg = 'bg-emerald-600';
  if (type === 'error') bg = 'bg-rose-600';
  if (type === 'warning') bg = 'bg-amber-600';

  toast.className = `fixed bottom-5 right-5 z-50 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2 ${bg}`;
  toast.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showError(el, msg) {
  el.innerText = msg;
  el.classList.remove('hidden');
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}


// Inicialización
window.addEventListener('DOMContentLoaded', () => {
  setInitialDates();
  initSupabase();

  const filterInput = document.getElementById('filter-multi-text');
  const filterSelect = document.getElementById('filter-multi-estado');
  if (filterInput) filterInput.addEventListener('input', renderMultiimplantacionesTable);
  if (filterSelect) filterSelect.addEventListener('change', renderMultiimplantacionesTable);
});