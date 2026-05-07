const scriptURL = 'https://script.google.com/macros/s/AKfycbx3N_HZ-FnkGSevZVx6C1ekqn0Mc_h7ApmPiBXTBlGa1lzcri8HY8wGFgzGAmit_u0W/exec'; // <--- ACTUALIZA ESTO


let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');
const numTotalDisplay = document.getElementById('num-total');
const btnRefresh = document.getElementById('btn-refresh');

// Elementos de Reporte
const btnDescargar = document.getElementById('btn-descargar-reporte');
const inputFecha = document.getElementById('fecha-reporte');

// --- 1. INICIALIZACIÓN ---

// Poner fecha de hoy por defecto en el selector de reportes
if (inputFecha) {
    const today = new Date().toISOString().split('T')[0];
    inputFecha.value = today;
}

// Cargar contador general al abrir la página
actualizarContadorGeneral();

// --- 2. LÓGICA DEL ESCÁNER ---

function onScanSuccess(decodedText) {
    ultimoCodigoEscaneado = decodedText;
    
    statusText.innerHTML = `
        <div style="color: #1565c0; background: #e3f2fd; padding: 12px; border-radius: 8px; border: 1px solid #90caf9; margin-bottom: 10px;">
            <strong>ID Detectado:</strong><br>
            <span style="word-break: break-all;">${decodedText}</span>
        </div>
    `;
    
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Validar y Canjear";
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.style.color = "blue";
}

function onScanFailure(error) { /* Silencioso */ }

// --- 3. ENVÍO Y VALIDACIONES (POST) ---

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;

    btnEnviar.disabled = true;
    btnEnviar.innerText = "Verificando en Base de Datos... ⏳";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => response.text())
    .then(resultado => {
        if (resultado === "ID_NO_REGISTRADO") {
            mostrarMensaje("❌ ERROR: ID no existe en BaseDatos.", "#c62828", "#ffebee");
        } 
        else if (resultado === "ESTATUS_NO_CUMPLE") {
            mostrarMensaje("🚫 BLOQUEADO: No tiene estatus 'cumpliendo'.", "#d32f2f", "#fbe9e7");
        }
        else if (resultado === "SIN_VALES_MENSUALES") {
            mostrarMensaje("🚫 AGOTADO: Límite mensual alcanzado.", "#b71c1c", "#ffcdd2");
        } 
        else if (resultado === "LIMITE_DIARIO_ALCANZADO") {
            mostrarMensaje("⚠️ LÍMITE: Ya usó sus 2 vales de hoy.", "#e65100", "#fff3e0");
        }
        else if (resultado === "ERROR_COLUMNAS") {
            mostrarMensaje("⚙️ Error de configuración en Excel (Columnas).", "#333", "#eee");
        }
        else if (resultado.includes("|")) {
            const [hoy, restante] = resultado.split("|");
            statusText.innerHTML = `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 1.2em;">✅ REGISTRO EXITOSO</p>
                    <p style="margin: 10px 0 0 0; color: #333;">
                        Vale <strong>#${hoy}</strong> de hoy.<br>
                        <span style="color: #1565c0;">Quedan <strong>${restante}</strong> vales este mes.</span>
                    </p>
                </div>
            `;
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

// --- 4. LÓGICA DE REPORTES (DESCARGA) ---

if (btnDescargar) {
    btnDescargar.addEventListener('click', () => {
        const fechaVal = inputFecha.value;
        if (!fechaVal) return alert("Selecciona una fecha");

        btnDescargar.innerText = "Generando... ⏳";
        
        // La URL para descargar el CSV
        const urlFinal = `${scriptURL}?accion=descargar&fecha=${fechaVal}`;
        
        // Abrir en pestaña nueva para disparar la descarga del archivo
        window.open(urlFinal, '_blank');
        
        setTimeout(() => {
            btnDescargar.innerText = "📥 Descargar Excel";
        }, 2000);
    });
}

// --- 5. FUNCIONES DE APOYO ---

function mostrarMensaje(txt, color, fondo) {
    statusText.innerHTML = `
        <div style="background: ${fondo}; padding: 15px; border-radius: 8px; border: 1px solid ${color}; text-align: center; color: ${color}; font-weight: bold;">
            ${txt}
        </div>
    `;
    btnEnviar.style.backgroundColor = color;
    btnEnviar.innerText = "Denegado";
}

function resetBtn() {
    btnEnviar.innerText = "Esperando Escaneo...";
    btnEnviar.style.backgroundColor = "#ccc";
    ultimoCodigoEscaneado = "";
}

function actualizarContadorGeneral() {
    if(numTotalDisplay) numTotalDisplay.innerText = "...";
    fetch(scriptURL)
        .then(r => r.text())
        .then(t => { if(numTotalDisplay) numTotalDisplay.innerText = t; })
        .catch(e => console.log("Error contador:", e));
}

if(btnRefresh) btnRefresh.onclick = actualizarContadorGeneral;

// --- 6. INICIO DEL ESCÁNER ---

let scanner = new Html5QrcodeScanner(
    "reader", 
    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
    false
);
scanner.render(onScanSuccess, onScanFailure);