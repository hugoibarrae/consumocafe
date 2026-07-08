/**
 * ====================================================================
 * SISTEMA CENTRAL DE VALES ALIMENTARIOS - FRONTEND LOGIC
 * Archivo: lector_logica.js (Para repositorio GitHub)
 * Año: 2026
 * ====================================================================
 */

// 1. REEMPLAZA ESTA URL por la que te dé Google al hacer "Nueva Implementación" -> "Aplicación Web"
const URL_GOOGLE_WEB_APP = "https://script.google.com/macros/s/AKfycbwd-wNPpCPDWQEnx-ckNHaLwapp2t-lgwe32gP9QtVL5K2sBgkaWDyWSYB-uLPZACEp/exec";

var html5QrcodeScanner;
var modalConsumosInstancia;
var listaConsumosCargados = [];

// Inicialización del sistema al cargar la página
window.onload = function() {
    // Vincular la ventana modal de Bootstrap
    modalConsumosInstancia = new bootstrap.Modal(document.getElementById('modalConsumos'));
    
    // Cargar el contador inicial de registros de hoy
    actualizarContadorTotalHoy();

    // Configuración y encendido de la cámara QR
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 220, height: 220 },
        rememberLastUsedCamera: true
    });
    html5QrcodeScanner.render(onScanSuccess);
};

/**
 * MANEJO DE ESCANEO EXITOSO
 * Se activa inmediatamente cuando la cámara detecta un código QR.
 */
function onScanSuccess(decodedText) {
    html5QrcodeScanner.clear(); // Pausa la cámara para evitar lecturas duplicadas en ráfaga
    
    var idQr = decodedText.trim();
    var statusText = document.getElementById("status-text");
    var panelVales = document.getElementById("panel-vales-alumno");
    
    statusText.className = "text-warning fw-bold";
    statusText.innerText = "Procesando código: " + idQr + "...";
    
    // Petición al servidor de Google para registrar el QR en 'Hoja 1'
    fetch(URL_GOOGLE_WEB_APP, {
        method: "POST",
        mode: "no-cors", // Evita bloqueos de seguridad de origen cruzado en navegadores
        body: JSON.stringify({
            accion: "registrarQR",
            idQr: idQr
        })
    })
    .then(function() {
        // Al usar 'no-cors' no podemos leer la respuesta directa, por seguridad hacemos peticiones limpias de actualización:
        statusText.className = "text-success fw-bold";
        statusText.innerText = "¡Escaneo enviado a la base de datos!";
        
        actualizarContadorTotalHoy(); // Actualiza el indicador numérico inferior

        // Consultamos cuántos vales acumulados lleva el alumno
        obtenerValesAcumuladosAlumno(idQr, panelVales);
    })
    .catch(function(err) {
        statusText.className = "text-danger fw-bold";
        statusText.innerText = "Error de conexión: " + err.message;
        reabrirCamaraConRetraso(4000);
    });
}

/**
 * CONSULTA DE VALES DEL ALUMNO
 * Pide al servidor el conteo de vales que tiene registrados el IDQR actual.
 */
function obtenerValesAcumuladosAlumno(idQr, panelVales) {
    var statusText = document.getElementById("status-text");
    
    fetch(URL_GOOGLE_WEB_APP, {
        method: "POST",
        body: JSON.stringify({
            accion: "obtenerContadorAlumno",
            idQr: idQr
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.totalVales !== undefined) {
            document.getElementById("num-vales-alumno").innerText = data.totalVales;
            panelVales.style.display = "block";
        }
        reabrirCamaraConRetraso(3500);
    })
    .catch(function() {
        // Si falla la lectura del contador individual, de igual forma reanudamos la cámara
        reabrirCamaraConRetraso(2000);
    });
}

/**
 * REANUDACIÓN AUTOMÁTICA DEL ESCÁNER
 * Limpia los paneles informativos y reactiva el lector de video.
 */
function reabrirCamaraConRetraso(milisegundos) {
    setTimeout(function() {
        html5QrcodeScanner.render(onScanSuccess);
        var statusText = document.getElementById("status-text");
        statusText.className = "text-secondary small fw-bold";
        statusText.innerText = "Esperando escaneo...";
        document.getElementById("panel-vales-alumno").style.display = "none";
    }, milisegundos);
}

/**
 * ACTUALIZA EL INDICADOR GENERAL DE REGISTROS DIARIOS
 * Carga el número que se muestra en el badge principal de la interfaz.
 */
function actualizarContadorTotalHoy() {
    fetch(URL_GOOGLE_WEB_APP, {
        method: "POST",
        body: JSON.stringify({ accion: "obtenerContador" })
    })
    .then(res => res.json())
    .then(registros => {
        if (registros && Array.isArray(registros)) {
            document.getElementById("num-total").innerText = registros.length;
        } else {
            document.getElementById("num-total").innerText = "0";
        }
    })
    .catch(function() {
        document.getElementById("num-total").innerText = "Error";
    });
}

/**
 * CONTROL DE LA VENTANA MODAL DE REVISIÓN Y BAJAS
 * Sincroniza y despliega la tabla interna de consumos de la 'Hoja 1'.
 */
function abrirModalConsumos() {
    document.getElementById("txtBuscadorConsumos").value = "";
    var tbody = document.getElementById("tbodyConsumosHoy");
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-2"><div class="spinner-border spinner-border-sm text-warning"></div> Sincronizando...</td></tr>';
    modalConsumosInstancia.show();

    fetch(URL_GOOGLE_WEB_APP, {
        method: "POST",
        body: JSON.stringify({ accion: "obtenerContador" })
    })
    .then(res => res.json())
    .then(consumos => {
        listaConsumosCargados = consumos || [];
        construirTablaConsumosHTML(listaConsumosCargados);
    })
    .catch(function() {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-2">Error al conectar con el servidor.</td></tr>';
    });
}

/**
 * RENDERIZA LAS FILAS EN LA TABLA DINÁMICA DE LA MODAL
 */
function construirTablaConsumosHTML(arregloDatos) {
    var tbody = document.getElementById("tbodyConsumosHoy");
    if (!arregloDatos || arregloDatos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-2">Sin consumos registrados hoy.</td></tr>';
        return;
    }

    tbody.innerHTML = arregloDatos.map(function(c) {
        return `
            <tr>
                <td class="fw-bold text-truncate" style="max-width: 150px;">${c.idQr}</td>
                <td>${c.hora}</td>
                <td class="text-center">
                    <button class="btn btn-danger py-0 px-2 shadow-sm" style="font-size: 11px;" onclick="eliminarConsumoIncorrecto(${c.fila}, '${c.idQr}')">
                        <i class="fa-solid fa-trash"></i> Quitar
                    </button>
                </td>
            </tr>`;
    }).join('');
}

/**
 * FILTRO EN TIEMPO REAL DESDE EL BUSCADOR DE LA MODAL
 */
function filtrarConsumosEnPantalla() {
    var busqueda = document.getElementById("txtBuscadorConsumos").value.toLowerCase().trim();
    var filtrados = listaConsumosCargados.filter(function(item) {
        return item.idQr.toLowerCase().includes(busqueda);
    });
    construirTablaConsumosHTML(filtrados);
}

/**
 * PROCESO DE ELIMINACIÓN DE REGISTRO ERRÓNEO
 * Llama a la función de borrado de fila física en 'Hoja 1'.
 */
function eliminarConsumoIncorrecto(numeroFila, idQr) {
    if (confirm(`⚠ ¿Confirmas que deseas ELIMINAR el consumo del IDQR: ${idQr}?\nEsta acción removerá físicamente el registro de la Hoja 1.`)) {
        fetch(URL_GOOGLE_WEB_APP, {
            method: "POST",
            body: JSON.stringify({ 
                accion: "eliminar", 
                fila: numeroFila 
            })
        })
        .then(res => res.json())
        .then(resultado => {
            if (resultado && resultado.estatus === "OK") {
                alert("Registro eliminado de la bitácora con éxito.");
                abrirModalConsumos(); // Refresca la lista interna de la modal
                actualizarContadorTotalHoy(); // Sincroniza el contador exterior
            } else {
                alert(resultado.error || "No se pudo eliminar el registro.");
            }
        })
        .catch(function(err) {
            alert("Error al intentar comunicarse con el servidor: " + err.message);
        });
    }
}