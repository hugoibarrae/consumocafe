const scriptURL = 'https://script.google.com/macros/s/AKfycbx3N_HZ-FnkGSevZVx6C1ekqn0Mc_h7ApmPiBXTBlGa1lzcri8HY8wGFgzGAmit_u0W/exec'; // <--- ACTUALIZA ESTO

let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');
const numTotalDisplay = document.getElementById('num-total');
const btnRefresh = document.getElementById('btn-refresh');

function onScanSuccess(decodedText) {
    ultimoCodigoEscaneado = decodedText;
    statusText.innerHTML = `<div style="color:#1565c0; background:#e3f2fd; padding:12px; border-radius:8px; border:1px solid #90caf9;"><strong>ID detectado:</strong> ${decodedText}</div>`;
    btnEnviar.disabled = false;
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.innerText = "Validar y Canjear";
}

function onScanFailure(error) {}

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;
    btnEnviar.disabled = true;
    btnEnviar.innerText = "Verificando... ⏳";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => response.text())
    .then(resultado => {
        if (resultado === "ID_NO_REGISTRADO") {
            mostrarMensaje("❌ ID no encontrado.", "#c62828", "#ffebee");
        } 
        else if (resultado === "ESTATUS_NO_CUMPLE") {
            mostrarMensaje("🚫 NO AUTORIZADO: Estatus no es 'cumpliendo'.", "#d32f2f", "#fbe9e7");
        }
        else if (resultado === "SIN_VALES_MENSUALES") {
            mostrarMensaje("🚫 Límite mensual agotado.", "#b71c1c", "#ffcdd2");
        } 
        else if (resultado === "LIMITE_DIARIO_ALCANZADO") {
            mostrarMensaje("⚠️ Límite diario de 2 vales alcanzado.", "#e65100", "#fff3e0");
        }
        else if (resultado === "ERROR_COLUMNAS") {
            mostrarMensaje("⚙️ Error: Faltan columnas MAYO o InMayo en Excel.", "#333", "#eee");
        }
        else if (resultado.includes("|")) {
            const [hoy, restante] = resultado.split("|");
            statusText.innerHTML = `
                <div style="background:#e8f5e9; padding:15px; border-radius:8px; border:1px solid #4CAF50; text-align:center;">
                    <p style="margin:0; color:#2e7d32; font-weight:bold;">✅ EXITOSO</p>
                    <p>Vale #${hoy} de hoy. <br> <strong>Restantes: ${restante}</strong></p>
                </div>`;
            actualizarContadorGeneral();
            resetBtn();
        }
    })
    .catch(err => {
        console.error(err);
        mostrarMensaje("❌ Error de comunicación con el servidor.", "#d32f2f", "#ffebee");
        btnEnviar.disabled = false;
    });
});

function mostrarMensaje(txt, color, fondo) {
    statusText.innerHTML = `<div style="background:${fondo}; padding:15px; border-radius:8px; border:1px solid ${color}; text-align:center; color:${color}; font-weight:bold;">${txt}</div>`;
}

function resetBtn() {
    btnEnviar.innerText = "Esperando código...";
    btnEnviar.style.backgroundColor = "#ccc";
    ultimoCodigoEscaneado = "";
}

function actualizarContadorGeneral() {
    fetch(scriptURL).then(r => r.text()).then(t => { if(numTotalDisplay) numTotalDisplay.innerText = t; });
}

if(btnRefresh) btnRefresh.onclick = actualizarContadorGeneral;

actualizarContadorGeneral();
let scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
scanner.render(onScanSuccess, onScanFailure);




// --- LÓGICA DE REPORTES ---
const btnDescargar = document.getElementById('btn-descargar-reporte');
const inputFecha = document.getElementById('fecha-reporte');

// Ponemos la fecha de hoy por defecto al cargar
const hoy = new Date().toISOString().split('T')[0];
inputFecha.value = hoy;

btnDescargar.addEventListener('click', () => {
    const fechaSeleccionada = inputFecha.value;
    if (!fechaSeleccionada) {
        alert("Por favor selecciona una fecha");
        return;
    }

    btnDescargar.innerText = "Generando... ⏳";
    
    // Creamos la URL de descarga con los parámetros
    const downloadURL = `${scriptURL}?accion=descargar&fecha=${fechaSeleccionada}`;
    
    // Abrimos en una nueva pestaña para forzar la descarga
    window.open(downloadURL, '_blank');
    
    setTimeout(() => {
        btnDescargar.innerText = "📥 Descargar Excel";
    }, 2000);
});