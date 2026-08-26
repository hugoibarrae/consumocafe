// ============================================================================
// CONFIGURACIÓN DE URL Y SESIÓN GLOBAL
// ============================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzI0OZOUJR0ANeY5xrCkCv8YGvM610D-BwWwOGW4FpY97nKd7l8iq8fzqTQsIMDhhvs/exec";

let usuarioSesion = null;
let areaActualVista = "";
let datosInscritosActuales = [];
let listaAdminsGlobal = [];
let headersPermisosGlobal = [];

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
// HELPERS DE SEGURIDAD Y PERMISOS
// ============================================================================
function esSuperadmin() {
  if (!usuarioSesion) return false;

  const permisos = usuarioSesion.permisos || {};
  const tienePermisoSuperadmin = Object.keys(permisos).some(key => {
    return key.trim().toLowerCase() === "superadmin" && permisos[key] === true;
  });

  const tieneRolSuperadmin = usuarioSesion.rol && usuarioSesion.rol.trim().toUpperCase() === "SUPERADMIN";

  return tienePermisoSuperadmin || tieneRolSuperadmin;
}

function tienePermisoEnviarQR() {
  if (!usuarioSesion) return false;
  if (esSuperadmin()) return true;

  const permisos = usuarioSesion.permisos || {};
  return Object.keys(permisos).some(key => {
    return key.trim().toLowerCase() === "adminsistema" && permisos[key] === true;
  });
}

function obtenerCorreoPrioritario(reg) {
  const correoDestino = reg.CorreoDestino || reg.correoDestino;
  if (correoDestino && correoDestino.trim() !== "") {
    return { correo: correoDestino.trim(), tipo: "Correo Destino" };
  }

  const correoEDU = reg.CorreoEDU || reg.correoEdu || reg.correoEDU;
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

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  cargarListaUsuarios();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarModalEditar();
      cerrarModalMatrizPermisos();
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
});

async function cargarListaUsuarios() {
  const select = document.getElementById("loginUsuario") || document.getElementById("selectUsuario");
  if (!select) return;

  select.innerHTML = '<option value="" disabled selected>Cargando usuarios...</option>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=obtenerListaResponsables`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const lista = await response.json();
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
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "verificarCredenciales",
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
    elemBienvenida.textContent = "Bienvenido, " + (usuarioSesion.nombre || usuarioSesion.usuario);
  }

  const btnSuper = document.getElementById("btnSuperadmin");
  if (btnSuper) {
    if (esSuperadmin()) {
      btnSuper.classList.remove("hidden");
    } else {
      btnSuper.classList.add("hidden");
    }
  }

  const btnMasivo = document.getElementById("btnAccionEspecial");
  if (btnMasivo) {
    if (tienePermisoEnviarQR()) {
      btnMasivo.classList.remove("hidden");
    } else {
      btnMasivo.classList.add("hidden");
    }
  }

  poblarDropdownAreas();
}

function poblarDropdownAreas() {
  const selectArea = document.getElementById("selectArea");
  if (!selectArea) return;

  selectArea.innerHTML = '<option value="" disabled selected>Seleccione un Área...</option>';

  const permisos = usuarioSesion.permisos || {};
  const esSuper = esSuperadmin();

  const areasAutorizadas = TODAS_LAS_AREAS.filter(area => {
    if (esSuper) return true;
    return Object.keys(permisos).some(p => p.trim().toLowerCase() === area.trim().toLowerCase() && permisos[p] === true);
  });

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
// GESTIÓN DE REGISTROS DE USUARIOS
// ============================================================================
function guardarNuevoUsuario() {
  const txtNombre = document.getElementById("txtNombre")?.value;
  const txtMatricula = document.getElementById("txtMatricula")?.value;
  const txtCorreo = document.getElementById("txtCorreo")?.value;
  const selectArea = document.getElementById("selectArea")?.value;

  if (!txtNombre || !txtMatricula || !txtCorreo) {
    alert("Por favor completa los campos requeridos.");
    return;
  }

  const datosFormulario = {
    action: "registrarNuevoInscrito",
    Nombre: txtNombre,
    Matricula: txtMatricula,
    CorreoEdu: txtCorreo,
    Area1: selectArea || areaActualVista,
    Estatus: "CUMPLIENDO",
    ValesAsignados: 20
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(datosFormulario)
  })
  .then(res => res.json())
  .then(res => {
    alert(res.mensaje);
    if (res.exito && areaActualVista) {
      cargarInscritosPorArea(areaActualVista);
    }
  })
  .catch(err => {
    console.error("Error al registrar usuario:", err);
    alert("Error de conexión al guardar usuario.");
  });
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
  const tbody = document.getElementById("tablaInscritosBody");

  if (titulo) titulo.textContent = `Usuarios Inscritos: ${nombreArea}`;
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center p-3">Cargando registros...</td></tr>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=obtenerInscritosPorArea&area=${encodeURIComponent(nombreArea)}`);
    const res = await response.json();

    if (!res.exito || !res.datos || res.datos.length === 0) {
      datosInscritosActuales = [];
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted p-3">No se encontraron inscritos para esta área.</td></tr>';
      poblarDropdownActividades([]);
      return;
    }

    datosInscritosActuales = res.datos;
    poblarDropdownActividades(res.datos);
    renderizarTablaInscritos(datosInscritosActuales);

  } catch (error) {
    console.error("Error al obtener inscritos por área:", error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-error p-3">Error al cargar datos del servidor.</td></tr>';
  }
}

function poblarDropdownActividades(datos) {
  const selectActividad = document.getElementById("selectActividad");
  if (!selectActividad) return;

  const conjuntoActividades = new Set();

  datos.forEach(reg => {
    if (reg.Actividad1) conjuntoActividades.add(reg.Actividad1);
    if (reg.Actividad2) conjuntoActividades.add(reg.Actividad2);
    if (reg.Actividad3) conjuntoActividades.add(reg.Actividad3);
    if (reg.Actividad4) conjuntoActividades.add(reg.Actividad4);
    if (reg.Actividad5) conjuntoActividades.add(reg.Actividad5);
  });

  selectActividad.innerHTML = '<option value="">Todas las actividades</option>';

  conjuntoActividades.forEach(act => {
    if (act && act.trim() !== "") {
      const opt = document.createElement("option");
      opt.value = act;
      opt.textContent = act;
      selectActividad.appendChild(opt);
    }
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

  const filtrados = datosInscritosActuales.filter(reg => 
    reg.Actividad1 === actividadSeleccionada ||
    reg.Actividad2 === actividadSeleccionada ||
    reg.Actividad3 === actividadSeleccionada ||
    reg.Actividad4 === actividadSeleccionada ||
    reg.Actividad5 === actividadSeleccionada
  );

  renderizarTablaInscritos(filtrados);
}

// ============================================================================
// RENDERIZADO DE TABLA DE INSCRITOS
// ============================================================================
function renderizarTablaInscritos(lista) {
  const tbody = document.getElementById("tablaInscritosBody");
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted p-3">No hay inscritos en la selección realizada.</td></tr>';
    return;
  }

  const puedeEnviarQR = tienePermisoEnviarQR();
  let bodyHtml = '';

  lista.forEach((reg, index) => {
    const matricula = reg.Matricula || reg.ID || reg.idFolio || (index + 1);
    const idQR = reg.IdQR || reg.idQR || reg.ID || 'Sin QR';
    const nombreCompleto = `${reg.Nombre || ''} ${reg.ApellidoPaterno || ''} ${reg.ApellidoMaterno || ''}`.trim() || reg.nombreCompleto || 'Sin Nombre';
    const area = reg.Area1 || reg.area || areaActualVista || '-';
    const actividad = reg.Actividad1 || reg.actividad || '-';
    
    const infoCorreo = obtenerCorreoPrioritario(reg);
    const labelCorreo = infoCorreo.tipo !== "Ninguno" 
      ? `<div>${infoCorreo.correo}</div><small style="color:var(--text-muted); font-size:0.75rem;">(${infoCorreo.tipo})</small>`
      : `<span style="color:#DC2626;">${infoCorreo.correo}</span>`;

    const qrEnviado = reg.EstadoQR === 'Enviado' || reg.qrEnviado === true;
    const badgeEstado = qrEnviado
      ? `<span style="background:#D1FAE5; color:#065F46; padding:3px 8px; border-radius:4px; font-weight:600; font-size:0.8rem;">✅ Enviado</span>`
      : `<span style="background:#FEF3C7; color:#92400E; padding:3px 8px; border-radius:4px; font-weight:600; font-size:0.8rem;">⏳ Pendiente</span>`;

    const btnQRHtml = puedeEnviarQR 
      ? `<button class="btn btn-primary btn-auto" style="padding: 4px 8px; font-size: 0.8rem;" onclick="enviarCorreoQRDirecto(${index})">📧 QR</button>`
      : `<button class="btn btn-secondary btn-auto" style="padding: 4px 8px; font-size: 0.8rem; opacity:0.5; cursor:not-allowed;" title="Requiere permiso AdminSistema" disabled>📧 QR</button>`;

    bodyHtml += `
    <tr>
      <td style="vertical-align: middle;"><strong>${matricula}</strong></td>
      <td style="vertical-align: middle;"><code>${idQR}</code></td>
      <td style="vertical-align: middle; font-weight:600; color:var(--uanl-blue);">${nombreCompleto}</td>
      <td style="vertical-align: middle;">${area}</td>
      <td style="vertical-align: middle;">${actividad}</td>
      <td style="vertical-align: middle;">${labelCorreo}</td>
      <td style="vertical-align: middle; text-align: center;">${badgeEstado}</td>
      <td style="vertical-align: middle; text-align: center;">
        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
          <button class="btn btn-gold btn-auto" style="padding: 4px 8px; font-size: 0.8rem;" onclick="abrirModalEditarInscrito(${index})">✏️ Editar</button>
          ${btnQRHtml}
        </div>
      </td>
    </tr>`;
  });

  tbody.innerHTML = bodyHtml;
}

// ============================================================================
// EDICIÓN DE INSCRITOS Y ENVÍOS DE QR
// ============================================================================
function abrirModalEditarInscrito(index) {
  const reg = datosInscritosActuales[index];
  if (!reg) return;

  const container = document.getElementById("contenedorCamposModal");
  if (!container) return;

  const idQR = reg.IdQR || reg.ID || reg.Matricula || '';

  container.innerHTML = `
  <input type="hidden" id="edit_ID" value="${reg.ID || ''}" />
  <input type="hidden" id="edit_FilaNo" value="${reg.No || ''}" />
  <input type="hidden" id="edit_IdQR" value="${idQR}" />

  <div class="card-section mb-4" style="background:#FFF9E6; border-color:#FFE082;">
    <h4 style="color:#5C4000; margin-bottom:10px;">👤 Datos Personales</h4>
    <div class="flex-row">
      <div class="form-group flex-item"><label>Matrícula / Folio:</label><input type="text" id="edit_Matricula" value="${reg.Matricula || reg.ID || ''}"></div>
      <div class="form-group flex-item"><label>Nombre:</label><input type="text" id="edit_Nombre" value="${reg.Nombre || ''}"></div>
      <div class="form-group flex-item"><label>A. Paterno:</label><input type="text" id="edit_ApellidoPaterno" value="${reg.ApellidoPaterno || ''}"></div>
      <div class="form-group flex-item"><label>A. Materno:</label><input type="text" id="edit_ApellidoMaterno" value="${reg.ApellidoMaterno || ''}"></div>
    </div>
    <div class="flex-row">
      <div class="form-group flex-item" style="border: 1px solid #F59E0B; padding: 4px; border-radius: 6px; background: #FEF3C7;">
        <label style="font-weight:bold; color:#92400E;">🎯 Correo Destino (QR):</label>
        <input type="email" id="edit_CorreoDestino" value="${reg.CorreoDestino || ''}" placeholder="Correo final de envío">
      </div>
      <div class="form-group flex-item"><label>Correo Personal:</label><input type="email" id="edit_Correo" value="${reg.Correo || ''}"></div>
      <div class="form-group flex-item"><label>Correo EDU:</label><input type="email" id="edit_CorreoEDU" value="${reg.CorreoEDU || ''}"></div>
      <div class="form-group flex-item"><label>Perfil:</label><input type="text" id="edit_Perfil" value="${reg.Perfil || ''}"></div>
    </div>
  </div>

  <div class="card-section">
    <h4 style="color:var(--uanl-blue); margin-bottom:10px;">📋 Registro de Área y Actividad Principal</h4>
    <div class="flex-row">
      <div class="form-group flex-item"><label>Área 1:</label><input type="text" id="edit_Area1" value="${reg.Area1 || areaActualVista}"></div>
      <div class="form-group flex-item"><label>Actividad 1:</label><input type="text" id="edit_Actividad1" value="${reg.Actividad1 || ''}"></div>
    </div>
  </div>
  `;

  document.getElementById("modalEditarInscrito")?.classList.remove("hidden");
}

function cerrarModalEditar() {
  document.getElementById("modalEditarInscrito")?.classList.add("hidden");
}

async function guardarCambiosInscrito() {
  const idQR = document.getElementById("editIdQR").value;
  const nombre = document.getElementById("editNombre").value;
  const correo = document.getElementById("editCorreo").value;
  const area = document.getElementById("editArea").value;
  const actividad = document.getElementById("editActividad").value;

  if (!idQR) {
    alert("❌ Error: No se pudo obtener el IdQR del usuario.");
    return;
  }

  const payload = {
    action: "guardarCambiosInscrito",
    idQR: idQR,
    nombre: nombre,
    correo: correo,
    area: area,
    actividad: actividad
  };

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    
    if (resData.exito) {
      alert(resData.mensaje);
      cerrarModalEditar();
      
      // Recargar la lista o tabla
      if (typeof filtrarInscritosPorActividad === 'function') {
        filtrarInscritosPorActividad();
      }
    } else {
      alert(resData.mensaje);
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

  const infoCorreo = obtenerCorreoPrioritario(reg);
  const idQR = reg.IdQR || reg.ID || reg.Matricula;
  const nombreCompleto = `${reg.Nombre || ''} ${reg.ApellidoPaterno || ''} ${reg.ApellidoMaterno || ''}`.trim() || reg.nombreCompleto;

  ejecutarEnvioCorreoQR(infoCorreo.correo, idQR, nombreCompleto);
}

function enviarQRIndividual() {
  const correoDestino = document.getElementById("edit_CorreoDestino")?.value;
  const correoEDU = document.getElementById("edit_CorreoEDU")?.value;
  const correoPersonal = document.getElementById("edit_Correo")?.value;
  
  const correoFinal = correoDestino || correoEDU || correoPersonal;
  const idQR = document.getElementById("edit_IdQR")?.value;
  const nombre = document.getElementById("edit_Nombre")?.value || "";
  const paterno = document.getElementById("edit_ApellidoPaterno")?.value || "";
  const nombreCompleto = `${nombre} ${paterno}`.trim();

  ejecutarEnvioCorreoQR(correoFinal, idQR, nombreCompleto);
}

function ejecutarEnvioMasivo() {
  if (!tienePermisoEnviarQR()) {
    alert("⛔ Acceso denegado: Se requiere el permiso 'AdminSistema' para realizar envíos masivos de QR.");
    return;
  }

  const confirmacion = confirm("¿Estás seguro de enviar los correos personalizados con su QR a todos los usuarios inscritos?");
  if (!confirmacion) return;

  fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "enviarCorreosMasivosQR" })
  })
  .then(res => res.json())
  .then(res => {
    alert(res.mensaje);
    if (res.exito && areaActualVista) {
      cargarInscritosPorArea(areaActualVista);
    }
  })
  .catch(err => {
    console.error("Error en envío masivo:", err);
    alert("Error al procesar la solicitud de envío masivo.");
  });
}

// ============================================================================
// GESTIÓN DE PERMISOS (MODAL SUPERADMIN)
// ============================================================================
function abrirModalMatrizPermisos() {
  if (!esSuperadmin()) {
    alert("Acceso denegado: No tienes privilegios de Superadministrador.");
    return;
  }
  document.getElementById("modalMatrizPermisos")?.classList.remove("hidden");
  cargarMatrizAdministradores();
}

function cerrarModalMatrizPermisos() {
  document.getElementById("modalMatrizPermisos")?.classList.add("hidden");
}

async function cargarMatrizAdministradores() {
  const cardContainer = document.getElementById("tarjetaPermisosAdminMovil");

  if (cardContainer) cardContainer.innerHTML = '<div class="text-center p-3">Cargando administradores...</div>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=obtenerTodosLosAdmins`);
    const res = await response.json();

    if (!res.exito) {
      if (cardContainer) cardContainer.innerHTML = `<div class="text-center text-error p-3">${res.mensaje || 'Error al obtener datos'}</div>`;
      return;
    }

    let headers = res.headersPermisos || [...TODAS_LAS_AREAS];
    if (!headers.some(h => h.trim().toLowerCase() === "adminsistema")) {
      headers.unshift("AdminSistema");
    }

    headersPermisosGlobal = headers;
    listaAdminsGlobal = res.admins || [];

    poblarSelectorAdmins(listaAdminsGlobal);

  } catch (error) {
    console.error("Error al cargar administradores:", error);
    if (cardContainer) cardContainer.innerHTML = '<div class="text-center text-error p-3">Error al obtener los administradores del servidor.</div>';
  }
}

function poblarSelectorAdmins(listaAdmins) {
  const select = document.getElementById("selectAdminMovil");
  const cardContainer = document.getElementById("tarjetaPermisosAdminMovil");
  
  if (!select) return;

  select.innerHTML = '<option value="">-- Elija un Administrador --</option>';
  listaAdmins.forEach((admin, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = `${admin.nombre} (${admin.rol || 'RESPONSABLE'})`;
    select.appendChild(opt);
  });

  if (cardContainer) cardContainer.innerHTML = "";
}

function mostrarPermisosAdminSeleccionado() {
  const select = document.getElementById("selectAdminMovil");
  const containerCard = document.getElementById("tarjetaPermisosAdminMovil");
  if (!select || !containerCard) return;

  const index = select.value;
  if (index === "" || !listaAdminsGlobal[index]) {
    containerCard.innerHTML = "";
    return;
  }

  const admin = listaAdminsGlobal[index];
  let cardHtml = `
    <div style="background:#FFF; padding:16px; border-radius:8px; border:1px solid #D1D5DB; margin-top:10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="font-weight:bold; font-size:1.05rem; color:#1E293B; margin-bottom:4px;">👤 ${admin.nombre}</div>
      <div style="font-size:0.85rem; color:#64748B; margin-bottom:12px;">
        <strong>Rol:</strong> <span class="badge">${admin.rol || 'RESPONSABLE'}</span>
      </div>
      
      <hr style="border:0; border-top:1px solid #E2E8F0; margin:10px 0;" />
      
      <div style="font-weight:bold; font-size:0.9rem; margin-bottom:10px; color:#334155;">Otorgamiento de Permisos:</div>
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
  `;

  headersPermisosGlobal.forEach(col => {
    const estaActivo = admin.permisos && admin.permisos[col] === true;
    const esAdminSistema = col.trim().toLowerCase() === "adminsistema";
    const bgItem = esAdminSistema 
      ? 'background:#EFF6FF; border:1px solid #BFDBFE;' 
      : 'background:#F8FAFC; border:1px solid #E2E8F0;';

    cardHtml += `
      <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; padding:8px; border-radius:6px; ${bgItem} cursor:pointer;">
        <input 
          type="checkbox" 
          style="width: 16px; height: 16px; cursor:pointer;"
          ${estaActivo ? 'checked' : ''} 
          onchange="guardarCambioPermiso(${admin.filaId}, '${col}', this.checked)"
        />
        <span style="${esAdminSistema ? 'font-weight:bold; color:#1E40AF;' : 'color:#334155;'}">${col}</span>
      </label>
    `;
  });

  cardHtml += `</div></div>`;
  containerCard.innerHTML = cardHtml;
}

async function guardarCambioPermiso(filaId, campoPermiso, nuevoValor) {
  try {
    const payload = {
      action: "actualizarPermisoAdmin",
      filaId: filaId,
      campo: campoPermiso,
      valor: nuevoValor
    };

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (!res.exito) {
      alert("⚠️ No se pudo guardar el permiso: " + res.mensaje);
      cargarMatrizAdministradores();
    }
  } catch (err) {
    console.error("Error al actualizar permiso:", err);
    alert("Error de conexión al actualizar el permiso.");
  }
}

async function guardarNuevoAdmin() {
  const nombre = document.getElementById("adminNombre")?.value;
  const pass = document.getElementById("adminPass")?.value;

  if (!nombre || !pass) {
    alert("Por favor ingrese el nombre y la contraseña.");
    return;
  }

  try {
    const payload = {
      action: "guardarNuevoAdmin",
      nombre: nombre,
      password: pass
    };

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (res.exito) {
      alert("✅ Administrador guardado con éxito.");
      if (document.getElementById("adminNombre")) document.getElementById("adminNombre").value = "";
      if (document.getElementById("adminPass")) document.getElementById("adminPass").value = "";
      cargarMatrizAdministradores();
    } else {
      alert("❌ Error: " + res.mensaje);
    }
  } catch (err) {
    console.error("Error al guardar nuevo admin:", err);
    alert("Error de conexión al guardar administrador.");
  }
}


function abrirModalEditar(usuario) {
  const contenedor = document.getElementById("contenedorCamposModal");
  
  // Guardamos usuario.idQR en el campo oculto
  contenedor.innerHTML = `
    <input type="hidden" id="editIdQR" value="${usuario.idQR || usuario.id || ''}">
    
    <div class="form-group">
      <label for="editNombre">Nombre Completo:</label>
      <input type="text" id="editNombre" class="form-control" value="${usuario.nombre || ''}">
    </div>

    <div class="form-group">
      <label for="editCorreo">Correo Destino:</label>
      <input type="email" id="editCorreo" class="form-control" value="${usuario.correo || usuario.correoDestino || ''}">
    </div>

    <div class="form-group">
      <label for="editArea">Área:</label>
      <input type="text" id="editArea" class="form-control" value="${usuario.area || ''}">
    </div>

    <div class="form-group">
      <label for="editActividad">Actividad:</label>
      <input type="text" id="editActividad" class="form-control" value="${usuario.actividad || ''}">
    </div>
  `;

  document.getElementById("modalEditarInscrito").classList.remove("hidden");
}