// ============================================================================
// CONFIGURACIÓN DE URL Y SESIÓN GLOBAL
// ============================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzbJrk2Bs3_947_65Lcn6q_JzKlEdUcIdImqWtA0tJ6RMtPWp7AkiZOdFovVPxAkK3S/exec";

let usuarioSesion = null;
let areaActualVista = "";
let datosInscritosActuales = [];
let listaAdminsGlobal = [];
let headersPermisosGlobal = [];
let abortControllerArea = null; // Previene condiciones de carrera en peticiones lentas

// Lista maestra de áreas disponibles
const TODAS_LAS_AREAS = [
  "Administrativo",
  "Consejo Estudiantil",
  "Cuerpo Directivo",
  "Deportes",
  "Difusión Cultural",
  "FiloVerde",
  "Intercambio Estudiantil",
  "Pruebas",
  "Servicio Social",
  "Talentos"
];

// ============================================================================
// UTILS & SEGURIDAD (XSS PREVENTION)
// ============================================================================

/**
 * Escapa caracteres especiales en strings para prevenir XSS/DOM Injection.
 */
function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, function(match) {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
}

function esSuperadmin() {
  if (!usuarioSesion) return false;

  const permisos = usuarioSesion.permisos || (usuarioSesion.adminData || {});
  const tienePermisoSuperadmin = Object.keys(permisos).some(key => {
    return key.trim().toLowerCase() === "superadmin" && (permisos[key] === true || permisos[key] === "SI");
  });

  const rolStr = usuarioSesion.rol || permisos.Rol || permisos.rol || "";
  const tieneRolSuperadmin = rolStr.toString().trim().toUpperCase() === "SUPERADMIN";

  return tienePermisoSuperadmin || tieneRolSuperadmin;
}

function tienePermisoEnviarQR() {
  if (!usuarioSesion) return false;
  if (esSuperadmin()) return true;

  const permisos = usuarioSesion.permisos || (usuarioSesion.adminData || {});
  return Object.keys(permisos).some(key => {
    return key.trim().toLowerCase() === "adminsistema" && (permisos[key] === true || permisos[key] === "SI");
  });
}

/**
 * Valida si el usuario en sesión tiene permiso específico sobre un área.
 */
function tienePermisoSobreArea(areaInscrito) {
  if (!usuarioSesion) return false;
  if (esSuperadmin()) return true;
  if (!areaInscrito || areaInscrito === 'N/A' || areaInscrito === '<em>N/A</em>' || areaInscrito.trim() === '') return false;

  const areasAutorizadas = obtenerAreasUsuario();
  return areasAutorizadas.some(a => a.trim().toLowerCase() === areaInscrito.trim().toLowerCase());
}

function obtenerCorreoPrioritario(reg) {
  const correoDestino = reg.CorreosDestino || reg.correoDestino;
  if (correoDestino && correoDestino.trim() !== "") {
    return { correo: correoDestino.trim(), tipo: "Correo Destino" };
  }

  const correoEDU = reg["Correo EDU"] || reg.correoEdu || reg.correoEDU || reg.CorreoEDU;
  if (correoEDU && correoEDU.trim() !== "") {
    return { correo: correoEDU.trim(), tipo: "EDU" };
  }
  
  const correoInst = reg.CorreoInstitucional || reg.correoInstitucional;
  if (correoInst && correoInst.trim() !== "") {
    return { correo: correoInst.trim(), tipo: "Institucional" };
  }

  const correoPersonal = reg.Correo || reg.correo;
  if (correoPersonal && correoPersonal.trim() !== "") {
    return { correo: correoPersonal.trim(), tipo: "Personal" };
  }

  return { correo: "Sin correo registrado", tipo: "Ninguno" };
}

function formatearFecha(fechaStr) {
  if (!fechaStr || fechaStr === "-" || fechaStr === "") return "-";
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return escapeHTML(fechaStr);
    return d.toLocaleString('es-MX', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return escapeHTML(fechaStr);
  }
}

/**
 * Formatea bloque visual para la auditoría de aprobación con Fecha y Usuario.
 */
function renderizarInfoAprobacion(fechaStr, usuarioStr) {
  if (!fechaStr || fechaStr === "-" || fechaStr === "") {
    return '<span class="text-muted" style="font-size:0.75rem;">Pendiente</span>';
  }
  
  const fechaFormateada = formatearFecha(fechaStr);
  const usuarioEscapado = escapeHTML(usuarioStr || "Sistema");
  
  return `
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; line-height: 1.2; margin-top: 4px;">
      <span class="badge-fecha" style="font-size: 0.72rem; color: #1e293b; font-weight: 500;">📅 ${fechaFormateada}</span>
      <small style="color: #475569; font-size: 0.70rem; font-weight: 600;">👤 ${usuarioEscapado}</small>
    </div>
  `;
}

// ============================================================================
// OBTENER ÁREAS Y ACTIVIDADES
// ============================================================================

function obtenerAreasUsuario() {
  if (!usuarioSesion) return [];
  if (esSuperadmin()) return [...TODAS_LAS_AREAS];

  const permisos = usuarioSesion.permisos || (usuarioSesion.adminData || {});
  return TODAS_LAS_AREAS.filter(area => {
    return Object.keys(permisos).some(
      key => key.trim().toLowerCase() === area.trim().toLowerCase() && (permisos[key] === true || permisos[key] === "SI")
    );
  });
}

function obtenerActividadesUnicas() {
  if (!Array.isArray(datosInscritosActuales) || datosInscritosActuales.length === 0) {
    return [];
  }

  const conjuntoActividades = new Set();
  datosInscritosActuales.forEach(reg => {
    for (let i = 1; i <= 5; i++) {
      const act = reg[`Actividad${i}`] || reg[`actividad${i}`];
      if (act && typeof act === "string" && act.trim() !== "") {
        conjuntoActividades.add(act.trim());
      }
    }
  });

  return Array.from(conjuntoActividades);
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  cargarListaUsuarios();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarModalEditar();
      cerrarModalMatrizPermisos();
      cerrarModalAgregarUsuario();
    }
  });

  const modalEdit = document.getElementById("modalEditarInscrito");
  if (modalEdit) {
    modalEdit.addEventListener("click", (e) => {
      if (e.target === modalEdit) cerrarModalEditar();
    });
  }

  const modalPermisos = document.getElementById("modalMatrizPermisos");
  if (modalPermisos) {
    modalPermisos.addEventListener("click", (e) => {
      if (e.target === modalPermisos) cerrarModalMatrizPermisos();
    });
  }

  const modalNuevo = document.getElementById("modalAgregarUsuario");
  if (modalNuevo) {
    modalNuevo.addEventListener("click", (e) => {
      if (e.target === modalNuevo) cerrarModalAgregarUsuario();
    });
  }
});

async function cargarListaUsuarios() {
  const select = document.getElementById("loginUsuario") || document.getElementById("selectUsuario");
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>Cargando usuarios...</option>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=obtenerListaResponsables`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const res = await response.json();
    const lista = Array.isArray(res) ? res : (res.datos || []);
    
    select.innerHTML = "";

    if (!Array.isArray(lista) || lista.length === 0) {
      select.innerHTML = '<option value="" disabled selected>No se encontraron usuarios</option>';
      return;
    }

    const optDefault = document.createElement("option");
    optDefault.value = "";
    optDefault.textContent = "-- Seleccione un usuario --";
    optDefault.disabled = true;
    optDefault.selected = true;
    select.appendChild(optDefault);

    lista.forEach(item => {
      const nombre = (typeof item === "object" && item !== null) 
        ? (item.usuario || item.nombre || Object.values(item)[0]) 
        : item;

      if (nombre) {
        const opt = document.createElement("option");
        opt.value = nombre;
        opt.textContent = nombre;
        select.appendChild(opt);
      }
    });

  } catch (error) {
    console.error("Error al cargar lista de usuarios:", error);
    select.innerHTML = '<option value="" disabled selected>⚠️ Error de conexión con el servidor</option>';
  }
}

// ============================================================================
// LOGIN Y DASHBOARD
// ============================================================================
async function ejecutarLogin() {
  const user = document.getElementById("loginUsuario")?.value;
  const pass = document.getElementById("loginPassword")?.value;
  const lblError = document.getElementById("mensajeError");

  if (!user || !pass) {
    if (lblError) {
      lblError.style.color = "#DC2626";
      lblError.textContent = "Por favor seleccione un usuario e ingrese la contraseña.";
    }
    return;
  }

  if (lblError) {
    lblError.style.color = "#002F6C";
    lblError.textContent = "Verificando credenciales...";
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "loginUsuario",
        usuario: user,
        password: pass
      })
    });

    const respuesta = await response.json();

    if (respuesta.exito) {
      if (lblError) lblError.textContent = "";
      usuarioSesion = respuesta;
      cargarDashboard();
    } else {
      if (lblError) {
        lblError.style.color = "#DC2626";
        lblError.textContent = respuesta.mensaje || "Credenciales incorrectas.";
      }
    }
  } catch (err) {
    console.error("Error en login:", err);
    if (lblError) {
      lblError.style.color = "#DC2626";
      lblError.textContent = "Error de conexión. Prueba de nuevo más tarde.";
    }
  }
}

function cargarDashboard() {
  document.getElementById("loginSection")?.classList.add("hidden");
  document.getElementById("dashboardSection")?.classList.remove("hidden");  
  
  const elemBienvenida = document.getElementById("bienvenidaUsuario");
  if (elemBienvenida) {
    const nombreUsuario = usuarioSesion.nombre || usuarioSesion.usuario || (usuarioSesion.adminData ? usuarioSesion.adminData.Usuario : "Usuario");
    elemBienvenida.textContent = "Bienvenido, " + escapeHTML(nombreUsuario);
  }

  const btnSuper = document.getElementById("btnSuperadmin");
  if (btnSuper) {
    btnSuper.classList.toggle("hidden", !esSuperadmin());
  }

  const btnMasivo = document.getElementById("btnAccionEspecial");
  if (btnMasivo) {
    btnMasivo.classList.toggle("hidden", !tienePermisoEnviarQR());
  }

  poblarDropdownAreas();
}

function poblarDropdownAreas() {
  const selectArea = document.getElementById("selectArea");
  if (!selectArea) return;

  selectArea.innerHTML = '<option value="" disabled selected>Seleccione un Área...</option>';

  const areasAutorizadas = obtenerAreasUsuario();

  if (areasAutorizadas.length === 0) {
    selectArea.innerHTML = '<option value="" disabled selected>Sin áreas asignadas</option>';
    return;
  }

  areasAutorizadas.forEach(area => {
    const opt = document.createElement("option");
    opt.value = area;
    opt.textContent = area;
    selectArea.appendChild(opt);
  });
}

function cerrarSesion() {
  usuarioSesion = null;
  areaActualVista = "";
  datosInscritosActuales = [];

  const passInput = document.getElementById("loginPassword");
  if (passInput) passInput.value = "";
  
  const lblError = document.getElementById("mensajeError");
  if (lblError) lblError.textContent = "";

  const selectAct = document.getElementById("selectActividad");
  if (selectAct) {
    selectAct.disabled = true;
    selectAct.innerHTML = '<option value="">Todas las actividades</option>';
  }

  document.getElementById("dashboardSection")?.classList.add("hidden");
  document.getElementById("loginSection")?.classList.remove("hidden");
  
  cargarListaUsuarios();
}

// ============================================================================
// DROPDOWNS Y FILTRADO DE INSCRITOS
// ============================================================================
async function alCambiarArea() {
  const selectArea = document.getElementById("selectArea");
  if (!selectArea) return;  
  
  const areaSeleccionada = selectArea.value;
  areaActualVista = areaSeleccionada;

  const selectActividad = document.getElementById("selectActividad");
  if (selectActividad) {
    selectActividad.disabled = true;
    selectActividad.innerHTML = '<option value="">Cargando actividades...</option>';
  }

  await cargarInscritosPorArea(areaSeleccionada);
}

async function cargarInscritosPorArea(nombreArea) {
  const titulo = document.getElementById("tituloAreaInscritos");
  const contenedor = document.getElementById("contenedorInscritos") || document.getElementById("tablaInscritosBody");

  if (titulo) titulo.textContent = `Usuarios Inscritos: ${nombreArea}`;
  if (contenedor) contenedor.innerHTML = '<div class="text-center p-4">⌛ Cargando registros de inscritos...</div>';

  if (abortControllerArea) {
    abortControllerArea.abort();
  }
  abortControllerArea = new AbortController();

  try {
    const response = await fetch(
      `${SCRIPT_URL}?action=obtenerInscritosPorArea&area=${encodeURIComponent(nombreArea)}`,
      { signal: abortControllerArea.signal }
    );
    const res = await response.json();

    if (!res.exito || !res.datos || res.datos.length === 0) {
      datosInscritosActuales = [];
      if (contenedor) contenedor.innerHTML = '<div class="text-center text-muted p-4">No se encontraron inscritos para esta área.</div>';
      poblarDropdownActividades();
      return;
    }

    datosInscritosActuales = res.datos;
    poblarDropdownActividades();
    renderizarTablaInscritos(datosInscritosActuales);

  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error("Error al obtener inscritos por área:", error);
    if (contenedor) contenedor.innerHTML = '<div class="text-center text-error p-4">⚠️ Error al cargar datos del servidor.</div>';
  }
}

function poblarDropdownActividades() {
  const selectActividad = document.getElementById("selectActividad");
  if (!selectActividad) return;

  const actividades = obtenerActividadesUnicas();
  selectActividad.innerHTML = '<option value="">Todas las actividades</option>';

  actividades.forEach(act => {
    const opt = document.createElement("option");
    opt.value = act;
    opt.textContent = act;
    selectActividad.appendChild(opt);
  });

  selectActividad.disabled = false;
}

function filtrarInscritosPorActividad() {
  const selectAct = document.getElementById("selectActividad");
  if (!selectAct) return;

  const actividadSeleccionada = selectAct.value;

  if (!actividadSeleccionada) {
    renderizarTablaInscritos(datosInscritosActuales);
    return;
  }

  const filtrados = datosInscritosActuales.filter(reg => {
    const a1 = reg.Actividad1 || reg.actividad1 || "";
    const a2 = reg.Actividad2 || reg.actividad2 || "";
    const a3 = reg.Actividad3 || reg.actividad3 || "";
    const a4 = reg.Actividad4 || reg.actividad4 || "";
    const a5 = reg.Actividad5 || reg.actividad5 || "";
    return [a1, a2, a3, a4, a5].includes(actividadSeleccionada);
  });

  renderizarTablaInscritos(filtrados);
}

// ============================================================================
// RENDERIZADO COMPACTO Y RESPONSIVO DE INSCRITOS (VALIDACIÓN DE PERMISOS DE ÁREA)
// ============================================================================


// ============================================================================
// CLIENTE: Renderizado de estado leyendo 'StatusGeneral' o 'EstadoQR'
// ============================================================================
function renderizarTablaInscritos(lista) {
  const contenedor = document.getElementById("contenedorInscritos") || document.getElementById("tablaInscritosBody");
  if (!contenedor) return;

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = '<div class="text-center text-muted p-4">No hay inscritos en la selección realizada.</div>';
    return;
  }

  const puedeEnviarQR = tienePermisoEnviarQR();
  let htmlCards = '';

  lista.forEach((reg, index) => {
    const matricula = escapeHTML(reg.Matricula || reg.ID || (index + 1));
    const idQR = escapeHTML(reg.IdQR || reg.ID || 'Sin QR');
    const nombreCompleto = escapeHTML(`${reg.Nombre || ''} ${reg.ApellidoPaterno || ''} ${reg.ApellidoMaterno || reg["Apellido Materno"] || ''}`.trim() || 'Sin Nombre');
    
    const infoCorreo = obtenerCorreoPrioritario(reg);
    const labelCorreo = infoCorreo.tipo !== "Ninguno" 
      ? `<span>${escapeHTML(infoCorreo.correo)}</span> <small class="text-muted">(${escapeHTML(infoCorreo.tipo)})</small>`
      : `<span style="color:#DC2626;">${escapeHTML(infoCorreo.correo)}</span>`;

    const qrEnviado = reg.QREnviado === 'SI' || reg.QREnviado === true || reg.QRenviadoVF === true;
    const badgeQR = qrEnviado
      ? `<span class="badge" style="background:#D1FAE5; color:#065F46;">✅ QR Enviado</span>`
      : `<span class="badge" style="background:#FEF3C7; color:#92400E;">⏳ QR Pendiente</span>`;

    // Evaluamos StatusGeneral traído de la hoja Inscritos
    const statusGeneral = reg.StatusGeneral || reg.EstadoQR || 'Pendiente';
    const badgeEstadoGeneral = statusGeneral === 'Aprobado' 
      ? `<span class="badge" style="background:#D1FAE5; color:#065F46;">✅ Aprobado</span>`
      : `<span class="badge" style="background:#FEE2E2; color:#991B1B;">❌ ${statusGeneral}</span>`;

    let bloquesHTML = '';
    for (let i = 1; i <= 3; i++) {
      const areaOriginal = reg[`Area${i}`] || reg[`area${i}`] || (i === 1 ? areaActualVista : '');
      const areaVal = escapeHTML(areaOriginal);
      const actVal = escapeHTML(reg[`Actividad${i}`] || reg[`actividad${i}`] || '');
      
      const esAprobado = (
        reg[`Aprobado${i}`] === true || 
        reg[`Aprobado${i}`] === "SI" || 
        reg[`Aprobado${i}`] === "TRUE" ||
        reg[`aprobado${i}`] === "SI"
      );

      const fechaAud = reg[`FechaAct${i}`] || reg[`FechaAprobado${i}`] || reg[`fechaAct${i}`];
      const usuarioAud = reg[`UsuarioAct${i}`] || reg[`UsuarioAprobado${i}`] || reg[`usuarioAct${i}`];
      const tieneActividad = areaVal !== '' || actVal !== '';

      const tienePermisoArea = tienePermisoSobreArea(areaOriginal);
      const disabledAttr = tienePermisoArea ? "" : "disabled";
      const tooltipSinPermiso = tienePermisoArea ? "" : 'title="No tienes permiso de Administrador sobre esta Área"';

      bloquesHTML += `
        <div class="bloque-actividad ${tieneActividad ? 'activa' : 'vacia'}">
          <div>
            <div class="actividad-titulo">Opción ${i}</div>
            <div class="actividad-detalle">
              <div><strong>Área:</strong> ${areaVal || '<em>N/A</em>'}</div>
              <div><strong>Actividad:</strong> ${actVal || '<em>Sin asignar</em>'}</div>
            </div>
          </div>
          <div style="margin-top: 8px;">
            ${tieneActividad ? `
              <label class="check-aprobacion" ${tooltipSinPermiso}>
                <span>Aprobado ${i}</span>
                <input type="checkbox" 
                       ${esAprobado ? 'checked' : ''} 
                       ${disabledAttr}
                       onchange="actualizarEstadoAprobado(${index}, ${i}, this.checked)">
              </label>
              <div id="fecha_ap${i}_${index}">
                ${renderizarInfoAprobacion(fechaAud, usuarioAud)}
              </div>
            ` : '<small class="text-muted">Sin registro</small>'}
          </div>
        </div>
      `;
    }

    const btnQRHtml = puedeEnviarQR 
      ? `<button class="btn btn-primary btn-auto" style="padding: 6px 10px; font-size: 0.8rem;" onclick="enviarCorreoQRDirecto(${index})">📧 Enviar QR</button>`
      : `<button class="btn btn-secondary btn-auto" style="padding: 6px 10px; font-size: 0.8rem; opacity:0.5; cursor:not-allowed;" title="Requiere permiso AdminSistema" disabled>📧 Enviar QR</button>`;

    htmlCards += `
      <div class="inscrito-card">
        <div class="inscrito-header">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <div class="inscrito-nombre">${nombreCompleto}</div>
            <div style="display:flex; gap:6px;" id="badge_estado_${index}">
              ${badgeEstadoGeneral}
              ${badgeQR}
            </div>
          </div>
          <div class="inscrito-meta">
            <strong>Matrícula/ID:</strong> ${matricula} | 
            <strong>IdQR:</strong> <code>${idQR}</code> | 
            <strong>Correo:</strong> ${labelCorreo}
          </div>
        </div>

        <div class="actividades-grid">
          ${bloquesHTML}
        </div>

        <div style="margin-top: 12px; display:flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 8px;">
          <button class="btn btn-gold btn-auto" style="padding: 6px 10px; font-size: 0.8rem;" onclick="abrirModalEditarInscrito(${index})">✏️ Editar Usuario</button>
          ${btnQRHtml}
        </div>
      </div>
    `;
  });

  contenedor.innerHTML = htmlCards;
}

// ============================================================================
// CLIENTE: Función para enviar el cambio de StatusGeneral al servidor
// ============================================================================
async function actualizarEstadoAprobado(index, numAprobado, estaAprobado) {
  const reg = datosInscritosActuales[index];
  if (!reg) return;

  const idQR = reg.IdQR || reg.ID || reg.Matricula;
  const now = new Date();
  const fechaIso = now.toLocaleString("es-MX");
  
  const usuarioNombre = usuarioSesion 
    ? (usuarioSesion.nombre || usuarioSesion.usuario || (usuarioSesion.adminData ? usuarioSesion.adminData.Usuario : "Sistema")) 
    : "Sistema";

  // 1. Actualización de check individual
  reg[`Aprobado${numAprobado}`] = estaAprobado ? "SI" : "NO";
  reg[`FechaAct${numAprobado}`] = fechaIso;
  reg[`UsuarioAct${numAprobado}`] = usuarioNombre;

  // 2. Lógica: Con AL MENOS UNA aprobada, StatusGeneral pasa a "Aprobado"
  const ap1 = reg.Aprobado1 === true || reg.Aprobado1 === "SI" || reg.Aprobado1 === "TRUE";
  const ap2 = reg.Aprobado2 === true || reg.Aprobado2 === "SI" || reg.Aprobado2 === "TRUE";
  const ap3 = reg.Aprobado3 === true || reg.Aprobado3 === "SI" || reg.Aprobado3 === "TRUE";

  const alMenosUnoAprobado = ap1 || ap2 || ap3;
  const nuevoStatusGeneral = alMenosUnoAprobado ? "Aprobado" : "Cancelado";

  // Guardar dinámicamente en el objeto local
  reg.StatusGeneral = nuevoStatusGeneral;

  // 3. Renderizar cambio de auditoría en DOM
  const contenedorFecha = document.getElementById(`fecha_ap${numAprobado}_${index}`);
  if (contenedorFecha) {
    contenedorFecha.innerHTML = renderizarInfoAprobacion(fechaIso, usuarioNombre);
  }

  // 4. Actualizar Badge visualmente
  const elemBadge = document.getElementById(`badge_estado_${index}`);
  if (elemBadge) {
    const qrEnviado = reg.QREnviado === 'SI' || reg.QREnviado === true;
    const badgeQR = qrEnviado
      ? `<span class="badge" style="background:#D1FAE5; color:#065F46;">✅ QR Enviado</span>`
      : `<span class="badge" style="background:#FEF3C7; color:#92400E;">⏳ QR Pendiente</span>`;

    if (alMenosUnoAprobado) {
      elemBadge.innerHTML = `<span class="badge" style="background:#D1FAE5; color:#065F46;">✅ Aprobado</span> ${badgeQR}`;
    } else {
      elemBadge.innerHTML = `<span class="badge" style="background:#FEE2E2; color:#991B1B;">❌ Cancelado</span> ${badgeQR}`;
    }
  }

  // 5. Enviar payload a Apps Script
  try {
    const payload = {
      action: "actualizarAprobacionInscrito",
      idInscrito: idQR,
      idQR: idQR,
      numAprobado: numAprobado,
      valor: estaAprobado ? "SI" : "NO",
      StatusGeneral: nuevoStatusGeneral,
      fecha: fechaIso,
      usuarioModulo: usuarioNombre
    };

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (!res.exito) {
      alert("⚠️ Error al actualizar estado en base de datos: " + (res.mensaje || 'Error desconocido'));
    }
  } catch (err) {
    console.error("Error al guardar estado de aprobación:", err);
  }
}








// ============================================================================
// EDICIÓN DE INSCRITOS Y ENVÍOS DE QR
// ============================================================================
function abrirModalEditarInscrito(index) {
  const reg = datosInscritosActuales[index];
  if (!reg) return;

  const container = document.getElementById("contenedorCamposModal");
  if (!container) return;

  const idQR = escapeHTML(reg.IdQR || reg.ID || reg.Matricula || '');

  container.innerHTML = `
  <input type="hidden" id="edit_ID" value="${escapeHTML(reg.ID || '')}" />
  <input type="hidden" id="edit_FilaNo" value="${escapeHTML(reg.No || '')}" />
  <input type="hidden" id="edit_IdQR" value="${idQR}" />

  <div class="card-section mb-4" style="background:#FFF9E6; border-color:#FFE082; padding: 12px; border-radius: 8px;">
    <h4 style="color:#5C4000; margin-bottom:10px;">👤 Datos Personales</h4>
    <div class="flex-row" style="display: flex; gap: 8px; flex-wrap: wrap;">
      <div class="form-group flex-item"><label>Nombre:</label><input type="text" id="edit_Nombre" value="${escapeHTML(reg.Nombre || '')}"></div>
      <div class="form-group flex-item"><label>A. Paterno:</label><input type="text" id="edit_ApellidoPaterno" value="${escapeHTML(reg.ApellidoPaterno || '')}"></div>
      <div class="form-group flex-item"><label>A. Materno:</label><input type="text" id="edit_ApellidoMaterno" value="${escapeHTML(reg["Apellido Materno"] || reg.ApellidoMaterno || '')}"></div>
      <div class="form-group flex-item"><label>Matrícula / Folio:</label><input type="text" id="edit_Matricula" value="${escapeHTML(reg.Matricula || '')}"></div>
      <div class="form-group flex-item"><label>Perfil:</label><input type="text" id="edit_Perfil" value="${escapeHTML(reg.Perfil || '')}"></div>
      <div class="form-group flex-item"><label>Teléfono:</label><input type="text" id="edit_Telefono" value="${escapeHTML(reg.Telefono || '')}"></div>
    </div>
    
    <h4 style="color:#5C4000; margin-top:15px; margin-bottom:10px;">📧 Correos Electrónicos</h4>
    <div class="flex-row" style="display: flex; gap: 8px; flex-wrap: wrap;">
      <div class="form-group flex-item"><label>Correo EDU:</label><input type="email" id="edit_CorreoEDU" value="${escapeHTML(reg["Correo EDU"] || reg.CorreoEDU || '')}"></div>
      <div class="form-group flex-item"><label>Correo Institucional:</label><input type="email" id="edit_CorreoInstitucional" value="${escapeHTML(reg.CorreoInstitucional || '')}"></div>
      <div class="form-group flex-item"><label>Correo Personal:</label><input type="email" id="edit_Correo" value="${escapeHTML(reg.Correo || '')}"></div>

      <div class="form-group flex-item" style="border: 1px solid #F59E0B; padding: 6px; border-radius: 6px; background: #FEF3C7; flex-basis: 100%;">
        <label style="font-weight:bold; color:#92400E;">🎯 Correo Destino (QR):</label>
        <input type="email" id="edit_CorreosDestino" value="${escapeHTML(reg.CorreosDestino || '')}" placeholder="Correo final de envío" style="width: 100%;">
      </div>
    </div>
  </div>

  <div class="card-section" style="padding: 12px; border-radius: 8px; background: #F8FAFC; border: 1px solid #E2E8F0;">
    <h4 style="color:var(--uanl-blue, #002F6C); margin-bottom:10px;">📋 Registro de Áreas y Actividades</h4>
    <div class="flex-row" style="display: flex; gap: 8px; flex-wrap: wrap;">
      <div class="form-group flex-item"><label>Área 1:</label><input type="text" id="edit_Area1" value="${escapeHTML(reg.Area1 || areaActualVista)}"></div>
      <div class="form-group flex-item"><label>Actividad 1:</label><input type="text" id="edit_Actividad1" value="${escapeHTML(reg.Actividad1 || '')}"></div>
      
      <div class="form-group flex-item"><label>Área 2:</label><input type="text" id="edit_Area2" value="${escapeHTML(reg.Area2 || '')}"></div>
      <div class="form-group flex-item"><label>Actividad 2:</label><input type="text" id="edit_Actividad2" value="${escapeHTML(reg.Actividad2 || '')}"></div>

      <div class="form-group flex-item"><label>Área 3:</label><input type="text" id="edit_Area3" value="${escapeHTML(reg.Area3 || '')}"></div>
      <div class="form-group flex-item"><label>Actividad 3:</label><input type="text" id="edit_Actividad3" value="${escapeHTML(reg.Actividad3 || '')}"></div>
    </div>
  </div>
  `;

  document.getElementById("modalEditarInscrito")?.classList.remove("hidden");
}

function cerrarModalEditar() {
  document.getElementById("modalEditarInscrito")?.classList.add("hidden");
}

async function guardarCambiosInscrito() {
  const idQR = document.getElementById("edit_IdQR")?.value;

  if (!idQR) {
    alert("❌ Error al guardar: IdQR inválido o no encontrado.");
    return;
  }

  const payload = {
    action: "guardarCambiosInscrito",
    idQR: idQR,
    ID: document.getElementById("edit_ID")?.value || "",
    No: document.getElementById("edit_FilaNo")?.value || "",
    Nombre: document.getElementById("edit_Nombre")?.value || "",
    ApellidoPaterno: document.getElementById("edit_ApellidoPaterno")?.value || "",
    ApellidoMaterno: document.getElementById("edit_ApellidoMaterno")?.value || "",
    Matricula: document.getElementById("edit_Matricula")?.value || "",
    Perfil: document.getElementById("edit_Perfil")?.value || "",
    Telefono: document.getElementById("edit_Telefono")?.value || "",
    CorreoEDU: document.getElementById("edit_CorreoEDU")?.value || "",
    CorreoInstitucional: document.getElementById("edit_CorreoInstitucional")?.value || "",
    Correo: document.getElementById("edit_Correo")?.value || "",
    CorreosDestino: document.getElementById("edit_CorreosDestino")?.value || "",
    Area1: document.getElementById("edit_Area1")?.value || "",
    Actividad1: document.getElementById("edit_Actividad1")?.value || "",
    Area2: document.getElementById("edit_Area2")?.value || "",
    Actividad2: document.getElementById("edit_Actividad2")?.value || "",
    Area3: document.getElementById("edit_Area3")?.value || "",
    Actividad3: document.getElementById("edit_Actividad3")?.value || ""
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    
    if (resData.exito) {
      alert("✅ Datos actualizados con éxito.");
      cerrarModalEditar();
      
      if (areaActualVista) {
        cargarInscritosPorArea(areaActualVista);
      }
    } else {
      alert("❌ " + resData.mensaje);
    }
  } catch (err) {
    alert("Error de conexión al guardar cambios: " + err.toString());
  }
}

async function ejecutarEnvioCorreoQR(destinoCorreo, idQR, nombreCompleto) {
  if (!tienePermisoEnviarQR()) {
    alert("⛔ Acceso denegado: No cuentas con el permiso 'AdminSistema' para enviar códigos QR.");
    return;
  }

  if (!destinoCorreo || destinoCorreo === "Sin correo registrado") {
    alert("⚠️ El usuario no tiene un correo válido registrado.");
    return;
  }

  const confirmacion = confirm(`¿Deseas enviar el código QR a:\n\n👤 ${nombreCompleto}\n📧 ${destinoCorreo}?`);
  if (!confirmacion) return;

  try {
    const payload = {
      action: "enviarCorreoQR",
      correoPrioritario: destinoCorreo,
      correo: destinoCorreo,
      idQR: idQR,
      nombre: nombreCompleto
    };

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (res.exito) {
      alert("✅ " + res.mensaje);
      cargarInscritosPorArea(areaActualVista);
    } else {
      alert("❌ No se pudo enviar el correo: " + res.mensaje);
    }
  } catch (err) {
    console.error("Error al enviar código QR:", err);
    alert("Error de conexión al procesar el envío del correo.");
  }
}

function enviarCorreoQRDirecto(index) {
  const reg = datosInscritosActuales[index];
  if (!reg) return;

  const idQR = reg.IdQR || reg.ID || reg.Matricula;
  const nombreCompleto = `${reg.Nombre || ''} ${reg.ApellidoPaterno || ''} ${reg.ApellidoMaterno || reg["Apellido Materno"] || ''}`.trim();
  const infoCorreo = obtenerCorreoPrioritario(reg);

  ejecutarEnvioCorreoQR(infoCorreo.correo, idQR, nombreCompleto);
}



// ============================================================================
// ACTUALIZACIÓN DE ESTADO APROBADO CON CAMBIO DINÁMICO (AL MENOS 1 APROBADA)
// ============================================================================
async function actualizarEstadoAprobado(index, numAprobado, estaAprobado) {
  const reg = datosInscritosActuales[index];
  if (!reg) return;

  const idQR = reg.IdQR || reg.ID || reg.Matricula;
  const now = new Date();
  const fechaIso = now.toLocaleString("es-MX");
  
  // Nombre del usuario logueado
  const usuarioNombre = usuarioSesion 
    ? (usuarioSesion.nombre || usuarioSesion.usuario || (usuarioSesion.adminData ? usuarioSesion.adminData.Usuario : "Sistema")) 
    : "Sistema";

  // 1. Actualización local del check específico
  reg[`Aprobado${numAprobado}`] = estaAprobado ? "SI" : "NO";
  reg[`FechaAct${numAprobado}`] = fechaIso;
  reg[`UsuarioAct${numAprobado}`] = usuarioNombre;

  // 2. Evaluamos si AL MENOS UNA actividad está aprobada
  const ap1 = reg.Aprobado1 === true || reg.Aprobado1 === "SI" || reg.Aprobado1 === "TRUE";
  const ap2 = reg.Aprobado2 === true || reg.Aprobado2 === "SI" || reg.Aprobado2 === "TRUE";
  const ap3 = reg.Aprobado3 === true || reg.Aprobado3 === "SI" || reg.Aprobado3 === "TRUE";

  const alMenosUnoAprobado = ap1 || ap2 || ap3;
  const nuevoStatusGeneral = alMenosUnoAprobado ? "Aprobado" : "Cancelado";

  // Guardar estado general en el objeto local (ambas referencias por compatibilidad)
  reg.StatusGeneral = nuevoStatusGeneral;
  reg.EstadoQR = nuevoStatusGeneral;

  // 3. Actualizar auditoría localmente en el DOM
  const contenedorFecha = document.getElementById(`fecha_ap${numAprobado}_${index}`);
  if (contenedorFecha) {
    contenedorFecha.innerHTML = renderizarInfoAprobacion(fechaIso, usuarioNombre);
  }

  // 4. Actualizar dinámicamente el Badge en la tarjeta
  const elemBadge = document.getElementById(`badge_estado_${index}`);
  if (elemBadge) {
    const qrEnviado = reg.QREnviado === 'SI' || reg.QREnviado === true;
    const badgeQR = qrEnviado
      ? `<span class="badge" style="background:#D1FAE5; color:#065F46;">✅ QR Enviado</span>`
      : `<span class="badge" style="background:#FEF3C7; color:#92400E;">⏳ QR Pendiente</span>`;

    if (alMenosUnoAprobado) {
      elemBadge.innerHTML = `<span class="badge" style="background:#D1FAE5; color:#065F46;">✅ Aprobado</span> ${badgeQR}`;
    } else {
      elemBadge.innerHTML = `<span class="badge" style="background:#FEE2E2; color:#991B1B;">❌ Cancelado</span> ${badgeQR}`;
    }
  }

  // 5. Enviar payload completo con StatusGeneral al servidor
  try {
    const payload = {
      action: "actualizarAprobacionInscrito",
      idInscrito: idQR,
      idQR: idQR,
      numAprobador: numAprobado,
      numAprobado: numAprobado,
      valor: estaAprobado ? "SI" : "NO",
      estado: estaAprobado ? "SI" : "NO",
      StatusGeneral: nuevoStatusGeneral,
      estadoGeneralQR: nuevoStatusGeneral,
      fecha: fechaIso,
      usuarioModulo: usuarioNombre
    };

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (!res.exito) {
      alert("⚠️ Error al actualizar estado en base de datos: " + (res.mensaje || 'Error desconocido'));
    }
  } catch (err) {
    console.error("Error al guardar estado de aprobación:", err);
  }
}


// ============================================================================
// CLIENTE: Filtro local por Área (Area1, Area2 o Area3)
// ============================================================================
function filtrarInscritosPorAreaLocal(listaOriginal, areaUsuario) {
  if (!areaUsuario || areaUsuario.toLowerCase() === "todas" || areaUsuario === "AdminSistema") {
    return listaOriginal;
  }

  const areaTarget = areaUsuario.trim().toLowerCase();

  return listaOriginal.filter(reg => {
    const a1 = (reg.Area1 || reg.area1 || "").toString().trim().toLowerCase();
    const a2 = (reg.Area2 || reg.area2 || "").toString().trim().toLowerCase();
    const a3 = (reg.Area3 || reg.area3 || "").toString().trim().toLowerCase();

    return a1 === areaTarget || a2 === areaTarget || a3 === areaTarget;
  });
}



// Arreglo con la estructura exacta de las columnas recibidas
const COLUMNAS_MATRIZ = [
  "usuario", "Area", "Password", "Superadmin", "AdminSistema", 
  "Cuerpo Directivo", "Administrativo", "Consejo Estudiantil", 
  "Deportes", "Difusión Cultural", "FiloVerde", 
  "Intercambio Estudiantil", "Pruebas", "Servicio Social", "Talentos"
];

// Validar visibilidad del botón de acuerdo con la sesión del usuario
function evaluarVisibilidadBotonMatriz() {
  const btn = document.getElementById('btnGestionUsuarios');
  if (usuarioSesion && usuarioSesion.esSuperAdmin === true) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

function abrirModalGestionUsuarios() {
  if (!usuarioSesion || !usuarioSesion.esSuperAdmin) {
    mostrarNotificacion("⛔ Solo los Superadministradores tienen acceso a este panel.", true);
    return;
  }
  
  renderizarMatrizEscritorio();
  renderizarMatrizMovil();
  document.getElementById('modalMatrizUsuarios').classList.remove('hidden');
}

function cerrarModalGestionUsuarios() {
  document.getElementById('modalMatrizUsuarios').classList.add('hidden');
}

// Renderizado para Móviles (Tarjetas individuales por usuario)
function renderizarMatrizMovil() {
  const container = document.getElementById('contenedorTarjetasMobile');
  if (!container) return;

  let html = '';

  usuariosMatriz.forEach((userRow, uIdx) => {
    const nombre = escapeHTML(userRow[0] || '');
    const area = escapeHTML(userRow[1] || '');
    const esSuper = esVerdadero(userRow[3]);
    const esAdminSys = esVerdadero(userRow[4]);

    html += `
      <div class="user-card-mobile">
        <div class="user-card-header">
          <div>
            <div class="user-title">👤 ${nombre}</div>
            <div class="user-area">📌 Área: ${area || 'Sin Área'}</div>
          </div>
        </div>

        <div class="section-tag">👑 Roles Globales</div>
        <div class="permisos-grid">
          <label class="checkbox-item">
            <input type="checkbox" ${esSuper ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, 3, this.checked)">
            Superadmin
          </label>
          <label class="checkbox-item">
            <input type="checkbox" ${esAdminSys ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, 4, this.checked)">
            AdminSistema
          </label>
        </div>

        <div class="section-tag" style="margin-top:12px;">📂 Módulos de Área Permitidos</div>
        <div class="permisos-grid">
    `;

    // Recorrer desde la columna 5 (Cuerpo Directivo) hasta la 14 (Talentos)
    for (let cIdx = 5; cIdx < COLUMNAS_MATRIZ.length; cIdx++) {
      const colNombre = COLUMNAS_MATRIZ[cIdx];
      const tienePermiso = esVerdadero(userRow[cIdx]);

      html += `
        <label class="checkbox-item">
          <input type="checkbox" ${tienePermiso ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, ${cIdx}, this.checked)">
          ${colNombre}
        </label>
      `;
    }

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Renderizado para Escritorio
function renderizarMatrizEscritorio() {
  const tbody = document.getElementById('tbodyMatrizDesktop');
  if (!tbody) return;

  let html = '';

  usuariosMatriz.forEach((userRow, uIdx) => {
    const nombre = escapeHTML(userRow[0] || '');
    const area = escapeHTML(userRow[1] || '');

    html += `
      <tr>
        <td><strong>${nombre}</strong></td>
        <td>${area}</td>
        <td>
          <label><input type="checkbox" ${esVerdadero(userRow[3]) ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, 3, this.checked)"> Superadmin</label><br>
          <label><input type="checkbox" ${esVerdadero(userRow[4]) ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, 4, this.checked)"> AdminSys</label>
        </td>
        <td>
          <div class="permisos-grid">
    `;

    for (let cIdx = 5; cIdx < COLUMNAS_MATRIZ.length; cIdx++) {
      html += `
        <label class="checkbox-item">
          <input type="checkbox" ${esVerdadero(userRow[cIdx]) ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, ${cIdx}, this.checked)">
          ${COLUMNAS_MATRIZ[cIdx]}
        </label>
      `;
    }

    html += `
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Sincronizar actualización local de la matriz al presionar checkboxes
function actualizarValorMatriz(userIndex, colIndex, valor) {
  if (usuariosMatriz[userIndex]) {
    usuariosMatriz[userIndex][colIndex] = valor ? "TRUE" : "FALSE";
  }
}

// Guardar cambios masivos en Google Apps Script
async function guardarCambiosMatriz() {
  try {
    mostrarNotificacion("⏳ Guardando cambios en la matriz...");
    
    const payload = {
      action: "guardarMatrizUsuarios",
      matriz: usuariosMatriz
    };

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (res.exito) {
      mostrarNotificacion("✅ Matriz de permisos actualizada correctamente.");
      cerrarModalGestionUsuarios();
    } else {
      mostrarNotificacion("❌ Error al guardar la matriz: " + res.mensaje, true);
    }
  } catch (err) {
    mostrarNotificacion("Error de conexión al guardar matriz: " + err.toString(), true);
  }
}

