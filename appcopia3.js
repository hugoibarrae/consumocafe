// --- CONFIGURACIÓN ---
// Sustituye por tu URL de la última implementación (Versión Nueva)
const scriptURL = 'https://script.google.com/macros/s/AKfycbxulBWo9Ex6Z9xC8DIF1jHpe7mSTqsKw4NeBrlwxjg9J0-vsNpAdbbPCDjhpHu2Lw7h/exec'; 


let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');
const numTotalDisplay = document.getElementById('num-total');
const btnRefresh = document.getElementById('btn-refresh');

// Elementos de Reporte
const btnDescargar = document.getElementById('btn-descargar-reporte');
const btnEmail = document.getElementById('btn-email-reporte');
const inputFecha = document.getElementById('fecha-reporte');

// --- 1. INICIALIZACIÓN ---

// Poner fecha de hoy por defecto al cargar
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
    btnEnviar.style.color = "yellow";
    btnEnviar.style.cursor = "pointer";
}

function onScanFailure(error) { /* Silencioso */ }

// --- 3. ENVÍO DE DATOS Y VALIDACIONES (doPost) ---

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
            mostrarMensaje("❌ ERROR: ID no existe en Base de Datos.", "#c62828", "#ffebee");
        } 
        else if (resultado === "ESTATUS_NO_CUMPLE") {
            mostrarMensaje("🚫 NO AUTORIZADO: Estatus no es 'cumpliendo'.", "#d32f2f", "#fbe9e7");
        }
        else if (resultado === "SIN_VALES_MENSUALES") {
            mostrarMensaje("🚫 AGOTADO: Límite mensual alcanzado.", "#b71c1c", "#ffcdd2");
        } 
        else if (resultado === "LIMITE_DIARIO_ALCANZADO") {
            mostrarMensaje("⚠️ LÍMITE: Ya usó sus 2 vales de hoy.", "#e65100", "#fff3e0");
        }
        else if (resultado === "ERROR_COLUMNAS") {
            mostrarMensaje("⚙️ Error: Faltan columnas MAYO o InMayo.", "#333", "#eee");
        }
        else if (resultado.includes("|")) {
            const [hoy, restante] = resultado.split("|");
            statusText.innerHTML = `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 1.2em;">✅ REGISTRO EXITOSO</p>
                    <p style="margin: 10px 0 0 0; color: #333;">
                        Vale <strong>#${hoy}</strong> de hoy.<br>
                        <span style="color: #1565c0;">Restan <strong>${restante}</strong> este mes.</span>
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
        btnEnviar.innerText = "Reintentar";
    });
});

// --- 4. LÓGICA DE REPORTES (GET) ---

// Descarga de CSV
if (btnDescargar) {
    btnDescargar.addEventListener('click', () => {
        const fechaVal = inputFecha.value;
        if (!fechaVal) return alert("Selecciona una fecha");
        const urlFinal = `${scriptURL}?accion=descargar&fecha=${fechaVal}`;
        window.open(urlFinal, '_blank');
    });
}

// Envío por Email
if (btnEmail) {
    btnEmail.addEventListener('click', () => {
        const fechaVal = inputFecha.value;
        if (!fechaVal) return alert("Selecciona una fecha");

        btnEmail.innerText = "Enviando... 📧";
        btnEmail.disabled = true;

        fetch(`${scriptURL}?accion=enviarEmail&fecha=${fechaVal}`)
        .then(r => r.text())
        .then(res => {
            if (res === "EMAIL_ENVIADO") {
                alert("✅ Reporte enviado a cafetas_ff@hotmail.com");
            } else {
                alert("❌ Error: " + res);
            }
            btnEmail.innerText = "📧 Enviar por Correo";
            btnEmail.disabled = false;
        })
        .catch(err => {
            alert("❌ Error de conexión");
            btnEmail.disabled = false;
            btnEmail.innerText = "📧 Enviar por Correo";
        });
    });
}

// --- 5. FUNCIONES AUXILIARES ---

function mostrarMensaje(txt, color, fondo) {
    statusText.innerHTML = `
        <div style="background: ${fondo}; padding: 15px; border-radius: 8px; border: 1px solid ${color}; text-align: center; color: ${color}; font-weight: bold;">
            ${txt}
        </div>
    `;
    btnEnviar.style.backgroundColor = color;
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