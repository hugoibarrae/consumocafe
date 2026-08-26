RegistroInscrito


// ⚠️ REEMPLAZA ESTA URL CON TU URL DE APLICACIÓN WEB DESPLEGADA EN GOOGLE APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwd6MdKmyfd-FWe36H8NRlVqgl8ivmNQuBk6T9P_-2lEECs9NISrHKIfGWRsH3qeXx1/exec";

// Estado local
let catalogos = { areas: [], actividades: [] };

// Evento al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  cargarCatalogos();
});

// Función para obtener catalogos via GET fetch
async function cargarCatalogos() {
  const loader = document.getElementById("loaderCatalogos");
  if (loader) loader.classList.remove("hidden");

  try {
    const urlConsulta = `${WEB_APP_URL}?action=obtenerCatalogos`;
    console.log("📡 Solicitando catálogos a:", urlConsulta);

    const response = await fetch(urlConsulta);
    const respuesta = await response.json();

    console.log("📦 Respuesta de catálogos recibida:", respuesta);

    if (loader) loader.classList.add("hidden");

    if (respuesta && respuesta.exito) {
      catalogos.areas = respuesta.areas || [];
      catalogos.actividades = respuesta.actividades || [];
      
      console.log(`✅ ${catalogos.areas.length} Áreas y ${catalogos.actividades.length} Actividades cargadas.`);
      poblarSelects();
    } else {
      console.error("❌ Error devuelto por Apps Script:", respuesta ? respuesta.mensaje : "Sin respuesta");
      alert("Error al obtener los catálogos: " + (respuesta ? respuesta.mensaje : "Respuesta no válida"));
    }
  } catch (error) {
    if (loader) loader.classList.add("hidden");
    console.error("❌ Error de red/CORS o JSON inválido:", error);
    alert("Error de conexión al cargar catálogos. Presiona F12 para ver la Consola.");
  }
}

// Poblar desplegables
function poblarSelects() {
  const selectsArea = document.querySelectorAll('.select-area');
  const selectsActividad = document.querySelectorAll('.select-actividad');

  selectsArea.forEach(select => {
    const valorActual = select.value;
    const esSecundario = select.id === 'Area2';
    
    select.innerHTML = esSecundario 
      ? '<option value="">-- Opcional --</option>' 
      : '<option value="">-- Selecciona Área --</option>';

    catalogos.areas.forEach(area => {
      const opt = document.createElement('option');
      opt.value = String(area).trim();
      opt.textContent = String(area).trim();
      select.appendChild(opt);
    });
    select.value = valorActual;
  });

  selectsActividad.forEach(select => {
    const valorActual = select.value;
    const esSecundario = select.id === 'Actividad2';
    
    select.innerHTML = esSecundario 
      ? '<option value="">-- Opcional --</option>' 
      : '<option value="">-- Selecciona Actividad --</option>';

    catalogos.actividades.forEach(act => {
      const opt = document.createElement('option');
      opt.value = String(act).trim();
      opt.textContent = String(act).trim();
      select.appendChild(opt);
    });
    select.value = valorActual;
  });
}

// Generación de la nomenclatura del IdQR
function generarIdQR(datos) {
  const fechaActual = new Date();
  const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaActual.getDate()).padStart(2, '0');
  const anio = String(fechaActual.getFullYear()).slice(-2);
  
  const mmdd = `${mes}${dia}`;

  const tomarLetras = (texto, cantidad = 3) => {
    if (!texto) return 'XXX';
    return texto.trim().substring(0, cantidad).toUpperCase();
  };

  const pal = tomarLetras(datos.apellidoPaterno, 3);
  const ser = tomarLetras(datos.areaTrabajo, 3);
  const sab = tomarLetras(datos.actividad, 3);

  const matriculaLimpia = String(datos.matricula || '').trim();
  const ultimosDigitos = matriculaLimpia.length >= 4 
    ? matriculaLimpia.slice(-4) 
    : matriculaLimpia.padStart(4, '0');

  return `${mmdd}:${pal}:${ser}:${sab}:${ultimosDigitos}:${anio}`;
}

// Guardar datos mediante POST fetch
async function guardarUsuario(e) {
  e.preventDefault();

  const btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  const correoEdu = document.getElementById('CorreoEDU').value.trim();
  const correoInst = document.getElementById('CorreoInstitucional').value.trim();
  const correoPers = document.getElementById('Correo').value.trim();
  const apellidoPaterno = document.getElementById('ApellidoPaterno').value.trim();
  const area1 = document.getElementById('Area1').value;
  const actividad1 = document.getElementById('Actividad1').value;
  const matricula = document.getElementById('Matricula').value.trim();

  const idQRGenerado = generarIdQR({
    apellidoPaterno: apellidoPaterno,
    areaTrabajo: area1,
    actividad: actividad1,
    matricula: matricula
  });

  const datosInscrito = {
    IdQR: idQRGenerado,
    Matricula: matricula,
    Nombre: document.getElementById('Nombre').value.trim(),
    ApellidoPaterno: apellidoPaterno,
    ApellidoMaterno: document.getElementById('ApellidoMaterno').value.trim(),
    Perfil: document.getElementById('Perfil').value.trim(),
    Telefono: document.getElementById('Telefono').value.trim(),
    CorreoEDU: correoEdu,
    CorreoInstitucional: correoInst,
    Correo: correoPers,
    CorreosDestino: [correoEdu, correoInst, correoPers].filter(Boolean).join(', '),
    Area1: area1,
    Actividad1: actividad1,
    Area2: document.getElementById('Area2').value,
    Actividad2: document.getElementById('Actividad2').value,
    IngresadoAlSistema: "SI",
    Nuevo: "SI"
  };

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Ayuda a evitar inconvenientes de CORS con Apps Script
      },
      body: JSON.stringify(datosInscrito)
    });

    const res = await response.json();

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Registrar en Sistema';

    if (res.exito) {
      alert('✅ ' + res.mensaje + '\nIdQR Asignado: ' + idQRGenerado);
      document.getElementById('formInscrito').reset();
    } else {
      alert('❌ ' + res.mensaje);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Registrar en Sistema';
    console.error("Error de envío:", err);
    alert('❌ Error al procesar solicitud: ' + err.message);
  }
}