

// --- CONFIGURACIÓN ---
const scriptURL = 'https://script.google.com/macros/s/AKfycbyvLPebDBfBWbT38qBOgP2crdRvrXs_6Y_lPM8BmA-QcoMtvrMuIWqTtYykoHlca_A/exec'; // <--- PEGA TU URL AQUÍ

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
        if (resultado === "LIMITE_ALCANZADO") {
            statusText.innerHTML = `
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border: 1px solid #ff9800; text-align: center;">
                    <p style="margin: 0; color: #e65100; font-weight: bold;">⚠️ LÍMITE EXCEDIDO</p>
                    <p style="margin: 5px 0 0 0;">Este usuario ya cuenta con sus 2 registros de hoy.</p>
                </div>
            `;
            btnEnviar.innerText = "Denegado";
            btnEnviar.style.backgroundColor = "#ff9800";
        } else {
            statusText.innerHTML = `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold;">✅ REGISTRO EXITOSO</p>
                    <p style="margin: 8px 0 0 0; color: #333;">
                        Este usuario ya está registrado <strong>#${resultado}</strong> veces hoy.
                    </p>
                </div>
            `;
            // Actualizar los contadores visuales
            actualizarContadorGeneral();
            
            // Resetear para el próximo escaneo
            btnEnviar.innerText = "Enviar a Excel";
            btnEnviar.style.backgroundColor = "#ccc";
            ultimoCodigoEscaneado = "";
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusText.innerHTML = `<div style="color:red; padding:10px;">❌ Error de conexión</div>`;
        btnEnviar.disabled = false;
        btnEnviar.innerText = "Reintentar";
    });
});

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