/**

 * MÓDULO DE MATRIZ DE PERMISOS CON SEGURIDAD REFORZADA (FRONTEND)

 */



// URL de despliegue de tu Google Apps Script (Web App)

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_SaIu2qESMPDdxn5F6E5MQEWoCzriiMFFQIh9qK1JiRYLbqhAajIb9V6gVqGhVxZe/exec";



// Estructura de columnas esperada

const COLUMNAS_MATRIZ = [

  "usuario", "Area", "Password", "Superadmin", "AdminSistema", 

  "Cuerpo Directivo", "Administrativo", "Consejo Estudiantil", 

  "Deportes", "Difusión Cultural", "FiloVerde", 

  "Intercambio Estudiantil", "Pruebas", "Servicio Social", "Talentos"

];



let usuariosMatriz = [];



// ----------------------------------------------------------------------------

// GESTIÓN SEGURA DE SESIÓN EN CLIENTE

// ----------------------------------------------------------------------------



function obtenerSesionSegura() {

  const token = sessionStorage.getItem("app_token");

  const usuario = sessionStorage.getItem("app_user");

  const esSuperAdmin = sessionStorage.getItem("app_role") === "true";



  if (!token || !usuario) return null;



  return { token, usuario, esSuperAdmin };

}



function evaluarVisibilidadBotonMatriz() {

  const btn = document.getElementById('btnGestionUsuarios');

  if (!btn) return;

  

  const sesion = obtenerSesionSegura();

  

  // Ocultar visualmente si no es Superadmin

  if (sesion && sesion.esSuperAdmin) {

    btn.classList.remove('hidden');

  } else {

    btn.classList.add('hidden');

  }

}



// ----------------------------------------------------------------------------

// OPERACIONES DEL MODAL

// ----------------------------------------------------------------------------



async function abrirModalGestionUsuarios() {

  const sesion = obtenerSesionSegura();



  if (!sesion || !sesion.esSuperAdmin) {

    alert("⛔ Acceso denegado. Se requieren permisos de Superadministrador.");

    return;

  }



  // Cargar matriz desde el servidor antes de renderizar

  const cargado = await cargarMatrizDesdeServidor();

  if (cargado) {

    renderizarMatrizEscritorio();

    renderizarMatrizMovil();

    document.getElementById('modalMatrizUsuarios')?.classList.remove('hidden');

  }

}



function cerrarModalGestionUsuarios() {

  document.getElementById('modalMatrizUsuarios')?.classList.add('hidden');

}



async function cargarMatrizDesdeServidor() {

  const sesion = obtenerSesionSegura();

  mostrarNotificacion("⏳ Cargando permisos...");



  try {

    const response = await fetch(SCRIPT_URL, {

      method: "POST",

      headers: { "Content-Type": "text/plain;charset=utf-8" },

      body: JSON.stringify({

        action: "obtenerMatrizUsuarios",

        token: sesion.token

      })

    });



    const res = await response.json();

    if (res.exito) {

      usuariosMatriz = res.matriz;

      return true;

    } else {

      alert("❌ Error: " + res.mensaje);

      return false;

    }

  } catch (err) {

    console.error("Error al cargar matriz:", err);

    alert("Error de conexión al cargar la matriz.");

    return false;

  }

}



async function guardarCambiosMatriz() {

  const sesion = obtenerSesionSegura();

  if (!sesion) return;



  try {

    mostrarNotificacion("⏳ Guardando cambios en el servidor...");



    const response = await fetch(SCRIPT_URL, {

      method: "POST",

      headers: { "Content-Type": "text/plain;charset=utf-8" },

      body: JSON.stringify({

        action: "guardarMatrizUsuarios",

        token: sesion.token,

        matriz: usuariosMatriz

      })

    });



    const res = await response.json();

    if (res.exito) {

      alert("✅ Permisos actualizados con éxito.");

      cerrarModalGestionUsuarios();

    } else {

      alert("❌ " + res.mensaje);

    }

  } catch (err) {

    console.error("Error al guardar matriz:", err);

    alert("Error de conexión al guardar cambios.");

  }

}



// ----------------------------------------------------------------------------

// RENDERIZADO

// ----------------------------------------------------------------------------



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



    html += `</div></td></tr>`;

  });



  tbody.innerHTML = html;

}



function renderizarMatrizMovil() {

  const container = document.getElementById('contenedorTarjetasMobile');

  if (!container) return;



  let html = '';

  usuariosMatriz.forEach((userRow, uIdx) => {

    const nombre = escapeHTML(userRow[0] || '');

    const area = escapeHTML(userRow[1] || '');



    html += `

      <div class="user-card-mobile">

        <div class="user-card-header">

          <div class="user-title">👤 ${nombre}</div>

          <div class="user-area">📌 Área: ${area || 'Sin Área'}</div>

        </div>

        <div class="section-tag">👑 Roles Globales</div>

        <div class="permisos-grid">

          <label class="checkbox-item">

            <input type="checkbox" ${esVerdadero(userRow[3]) ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, 3, this.checked)"> Superadmin

          </label>

          <label class="checkbox-item">

            <input type="checkbox" ${esVerdadero(userRow[4]) ? 'checked' : ''} onchange="actualizarValorMatriz(${uIdx}, 4, this.checked)"> AdminSys

          </label>

        </div>

        <div class="section-tag" style="margin-top:12px;">📂 Módulos Permitidos</div>

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



    html += `</div></div>`;

  });



  container.innerHTML = html;

}



function actualizarValorMatriz(userIndex, colIndex, valor) {

  if (usuariosMatriz[userIndex]) {

    usuariosMatriz[userIndex][colIndex] = valor ? "TRUE" : "FALSE";

  }

}



// Helpers

function esVerdadero(val) {

  return val === true || val === "TRUE" || val === "SI" || val === 1;

}



function escapeHTML(str) {

  return String(str).replace(/[&<>"']/g, m => ({

    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'

  })[m]);

}



function mostrarNotificacion(m) { console.log(m); } 