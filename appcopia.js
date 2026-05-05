// --- CONFIGURACIÓN ---
const scriptURL = 'https://script.google.com/macros/s/AKfycby5xGM-cEQGdBHoon2O7IYuTHNCPPJz490KUKp8HbSoC5snn0Zgo_lHLm4HsDxRML-G/exec'; // <--- PEGA TU URL AQUÍ

let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');
const numTotalDisplay = document.getElementById('num-total');

// --- 1. LÓGICA DEL ESCÁNER ---

function onScanSuccess(decodedText, decodedResult) {
    ultimoCodigoEscaneado = decodedText;
    
    statusText.innerHTML = `
        <div style="color: #1565c0; background: #e3f2fd; padding: 12px; border-radius: 8px; border: 1px solid #90caf9; margin-bottom: 10px;">
            <strong>Código detectado:</strong><br>
            <span style="word-break: break-all;">${decodedText}</span>
        </div>
    `;
    
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Confirmar Registro";
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.style.color = "white";
    btnEnviar.style.cursor = "pointer";
}

function onScanFailure(error) { /* Silencioso */ }

// --- 2. ENVÍO Y RESPUESTA DEL SERVIDOR ---

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;

    btnEnviar.disabled = true;
    btnEnviar.innerText = "Validando... ⏳";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => response.text())
    .then(resultado => {
        if (resultado === "ID_NO_REGISTRADO") {
            mostrarMensaje("❌ ID no encontrado en la base de datos.", "#c62828", "#ffebee");
        } 
        else if (resultado === "SIN_VALES_MENSUALES") {
            mostrarMensaje("🚫 LÍMITE MENSUAL AGOTADO. No le quedan vales disponibles.", "#b71c1c", "#ffcdd2");
        } 
        else if (resultado === "LIMITE_DIARIO_ALCANZADO") {
            mostrarMensaje("⚠️ LÍMITE DIARIO ALCANZADO. Ya usó sus 2 vales de hoy.", "#e65100", "#fff3e0");
        } 
        else {
            // Resultado viene como "conteoHoy|restante"
            const partes = resultado.split("|");
            const hoy = partes[0];
            const restante = partes[1];

            statusText.innerHTML = `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold;">✅ REGISTRO EXITOSO</p>
                    <p style="margin: 8px 0 0 0; color: #333;">
                        Vale <strong>#${hoy}</strong> de hoy.<br>
                        <span style="color: #1565c0;">Le quedan <strong>${restante}</strong> vales en el mes.</span>
                    </p>
                </div>
            `;
            actualizarContadorGeneral();
            btnEnviar.innerText = "Enviar a Excel";
            btnEnviar.style.backgroundColor = "#ccc";
            ultimoCodigoEscaneado = "";
        }
    })

// Función auxiliar para no repetir código de mensajes
function mostrarMensaje(texto, color, fondo) {
    statusText.innerHTML = `
        <div style="background: ${fondo}; padding: 15px; border-radius: 8px; border: 1px solid ${color}; text-align: center; color: ${color}; font-weight: bold;">
            ${texto}
        </div>
    `;
    btnEnviar.innerText = "Denegado";
    btnEnviar.style.backgroundColor = color;
}

// --- 3. FUNCIONES DE CONTADOR ---

function actualizarContadorGeneral() {
    fetch(scriptURL)
    .then(res => res.text())
    .then(total => {
        if(numTotalDisplay) numTotalDisplay.innerText = total;
    })
    .catch(err => console.log("Error al cargar total:", err));
}

// Ejecutar al abrir la app
actualizarContadorGeneral();

// --- 4. INICIALIZACIÓN DEL LECTOR ---

let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", { fps: 10, qrbox: 250 }, false








);
html5QrcodeScanner.render(onScanSuccess, onScanFailure);



