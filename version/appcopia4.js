// La URL que te genera Google Apps Script al implementar como Web App
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyaKaCpoiCRLdyilLy0G_YwGhF1V2tLot6iTELdo3OeJsGU1qyyDNWdMxVCRXLWsE8H/exec";

let mapaActividades = {}; 
let mapaVales = {}; 

const nombresMeses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const mesActual = nombresMeses[new Date().getMonth()];

document.addEventListener("DOMContentLoaded", function() {
  cargarAreasYActividades();

  // Escuchadores para regenerar el QR en tiempo real al modificar cualquier campo clave
  document.getElementById("txtPaterno").addEventListener("input", generarIdQR);
  document.getElementById("txtMaterno").addEventListener("input", generarIdQR);
  document.getElementById("txtMatricula").addEventListener("input", generarIdQR);

  // Evento cuando cambia el Área
  document.getElementById("selectArea").addEventListener("change", function(evento) {
    const areaSeleccionada = evento.target.value;
    actualizarDropdownActividades(areaSeleccionada);
    generarIdQR();
  });

  // Evento cuando cambia la Actividad
  document.getElementById("selectActividad").addEventListener("change", function(evento) {
    const actividadSeleccionada = evento.target.value;
    actualizarVales(actividadSeleccionada);
    generarIdQR();
  });

  // Evento al enviar el Formulario
  document.getElementById("formRegistro").addEventListener("submit", enviarRegistro);
});

// Función centralizada para construir la clave QR
function generarIdQR() {
  const pat = document.getElementById("txtPaterno").value.trim().toUpperCase();
  const mat = document.getElementById("txtMaterno").value.trim().toUpperCase();
  const area = document.getElementById("selectArea").value.trim().toUpperCase();
  const act = document.getElementById("selectActividad").value.trim().toUpperCase();
  const matic = document.getElementById("txtMatricula").value.trim();

  // Validar que los campos indispensables tengan al menos algo escrito
  if (!pat || !area || !act || matic.length < 3) {
    document.getElementById("txtIdQR").value = "";
    return;
  }

  // 1. Fecha actual (MMDD y YY)
  const hoy = new Date();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  const yy = String(hoy.getFullYear()).slice(-2);

  // 2. Extracción de subcadenas (3 caracteres cada una)
  const iniPaterno = pat.padEnd(3, 'X').substring(0, 3);
  const iniArea = area.replace(/[^A-Z0-9]/g, '').padEnd(3, 'X').substring(0, 3);
  const iniAct = act.replace(/[^A-Z0-9]/g, '').padEnd(3, 'X').substring(0, 3);
  const ultMatricula = matic.slice(-3);
  const iniMaterno = mat ? mat.padEnd(3, 'X').substring(0, 3) : "XXX";

  // Formato final: MMDD + IBA + CUE + SUB + 885 + ELI + YY
  const codigoQR = `${mm}${dd}${iniPaterno}${iniArea}${iniAct}${ultMatricula}${iniMaterno}${yy}`;
  
  document.getElementById("txtIdQR").value = codigoQR;
}

function cargarAreasYActividades() {
  const selectArea = document.getElementById("selectArea");
  
  fetch(WEB_APP_URL)
    .then(response => response.json())
    .then(data => {
      if (data.exito) {
        mapaActividades = data.actividadesPorArea; 
        mapaVales = data.valesPorActividad; 
        
        selectArea.innerHTML = '<option value="">-- Selecciona un Área --</option>';
        data.areas.forEach(area => {
          const option = document.createElement("option");
          option.value = area;
          option.textContent = area;
          selectArea.appendChild(option);
        });
      } else {
        selectArea.innerHTML = `<option value="">Error: ${data.mensaje}</option>`;
      }
    })
    .catch(error => {
      console.error("Error al conectar:", error);
      selectArea.innerHTML = '<option value="">Error de conexión</option>';
    });
}

function actualizarDropdownActividades(area) {
  const selectActividad = document.getElementById("selectActividad");
  const inputVales = document.getElementById("inputVales");
  
  selectActividad.innerHTML = '<option value="">-- Selecciona una Actividad --</option>';
  inputVales.value = 0;

  if (area === "") {
    selectActividad.disabled = true;
    return;
  }

  selectActividad.disabled = false;
  const actividades = mapaActividades[area] || [];

  actividades.forEach(actividad => {
    const option = document.createElement("option");
    option.value = actividad;
    option.textContent = actividad;
    selectActividad.appendChild(option);
  });
}

function actualizarVales(actividad) {
  const inputVales = document.getElementById("inputVales");
  
  if (actividad === "" || !mapaVales[actividad]) {
    inputVales.value = 0;
    return;
  }

  const cantidadDeVales = mapaVales[actividad][mesActual] || 0;
  inputVales.value = cantidadDeVales;
}

function enviarRegistro(e) {
  e.preventDefault();

  const btnGuardar = document.getElementById("btnGuardar");
  btnGuardar.disabled = true;

  const payload = {
    Nombre: document.getElementById("txtNombre").value,
    ApellidoPaterno: document.getElementById("txtPaterno").value,
    ApellidoMaterno: document.getElementById("txtMaterno").value,
    Area1: document.getElementById("selectArea").value,
    Actividad1: document.getElementById("selectActividad").value,
    Matricula: document.getElementById("txtMatricula").value,
    IdQR: document.getElementById("txtIdQR").value,
    CorreoEdu: document.getElementById("txtCorreoEdu").value,
    CorreoAlt: document.getElementById("txtCorreoAlt").value,
    ASIGNADOS: document.getElementById("inputVales").value
  };

  mostrarMensaje("Guardando registro en la base de datos...", "info");

  fetch(WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    btnGuardar.disabled = false;
    if (res.exito) {
      mostrarMensaje(res.mensaje, "success");
      document.getElementById("formRegistro").reset();
      document.getElementById("txtIdQR").value = "";
      document.getElementById("selectActividad").disabled = true;
    } else {
      mostrarMensaje(res.mensaje, "error");
    }
  })
  .catch(err => {
    btnGuardar.disabled = false;
    mostrarMensaje("❌ Error al guardar: " + err.message, "error");
  });
}

function mostrarMensaje(msg, tipo) {
  const el = document.getElementById("status-message");
  if (el) {
    el.textContent = msg;
    el.className = tipo;
    el.style.display = "block";
  }
}