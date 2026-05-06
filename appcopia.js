const scriptURL = 'https://script.google.com/macros/s/AKfycbxXkhvyfHezzLR2DyCMVvb0nRsdXXLl7Uswe5D9R-DDjLveD0uahWJWLGPud-_mqCKO/exec'; // <--- ACTUALIZA ESTO


let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');
const numTotalDisplay = document.getElementById('num-total');
const btnRefresh = document.getElementById('btn-refresh');

// --- 1. LÓGICA DEL ESCÁNER ---

function onScanSuccess(decodedText, decodedResult) {
    ultimoCodigoEscaneado = decodedText;
    
    statusText.innerHTML = `
        <div style="color: #1565c0; background: #e3f2fd; padding: 12px; border-radius: 8px; border: 1px solid #90caf9; margin-bottom: 10px;">
            <strong>ID Detectado:</strong><br>
            <span style="word-break: break-all;">${decodedText}</span>
        </div>
    `;
    
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Confirmar y Canjear Vale";
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.style.color = "yellow";
    btnEnviar.style.cursor = "pointer";
}

function onScanFailure(error) { /* Silencioso para no saturar consola */ }

// --- 2. ENVÍO Y VALIDACIÓN ---

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;

    btnEnviar.disabled = true;
    btnEnviar.innerText = "Consultando Disponibilidad... ⏳";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => response.text())
    .then(resultado => {
        // Manejo de errores lógicos desde el servidor
        if (resultado === "ID_NO_REGISTRADO") {
            mostrarMensaje("❌ ERROR: Este ID no existe en la Base de Datos.", "#c62828", "#ffebee");
        } 
        else if (resultado === "SIN_VALES_MENSUALES") {
            mostrarMensaje("🚫 BLOQUEADO: Límite mensual agotado para este ID.", "#b71c1c", "#ffcdd2");
        } 
        else if (resultado === "LIMITE_DIARIO_ALCANZADO") {
            mostrarMensaje("⚠️ AVISO: Ya utilizó sus 2 registros permitidos por día.", "#e65100", "#fff3e0");
        } 
        else if (resultado.includes("|")) {
            // ÉXITO: Recibimos "conteoHoy|restantesMes"
            const datos = resultado.split("|");
            const hoy = datos[0];
            const restantes = datos[1];

            statusText.innerHTML = `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 1.2em;">✅ REGISTRO EXITOSO</p>
                    <p style="margin: 10px 0 0 0; color: #333;">
                        Vale <strong>#${hoy}</strong> de hoy.<br>
                        <span style="color: #1565c0; font-size: 0.9em;">Disponibles este mes: <strong>${restantes}</strong></span>
                    </p>
                </div>
            `;
            
            actualizarContadorGeneral();
            resetearBotonEnvio();
            ultimoCodigoEscaneado = "";
        } else {
            throw new Error("Respuesta desconocida del servidor");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarMensaje("❌ Error de comunicación con el servidor.", "#d32f2f", "#ffebee");
        btnEnviar.disabled = false;
        btnEnviar.innerText = "Reintentar Envío";
    });
});

// --- 3. FUNCIONES AUXILIARES Y CONTADORES ---

function mostrarMensaje(texto, color, fondo) {
    statusText.innerHTML = `
        <div style="background: ${fondo}; padding: 15px; border-radius: 8px; border: 1px solid ${color}; text-align: center; color: ${color}; font-weight: bold;">
            ${texto}
        </div>
    `;
    btnEnviar.style.backgroundColor = color;
}

function resetearBotonEnvio() {
    btnEnviar.innerText = "Esperando Escaneo...";
    btnEnviar.style.backgroundColor = "#ccc";
}

function actualizarContadorGeneral() {
    if(numTotalDisplay) numTotalDisplay.innerText = "...";
    
    fetch(scriptURL)
    .then(res => res.text())
    .then(total => {
        if(numTotalDisplay) numTotalDisplay.innerText = total;
    })
    .catch(err => console.log("Error al cargar total:", err));
}

// Lógica del botón de refresco manual
if(btnRefresh) {
    btnRefresh.addEventListener('click', () => {
        btnRefresh.disabled = true;
        actualizarContadorGeneral();
        setTimeout(() => { btnRefresh.disabled = false; }, 1000);
    });
}

// Carga inicial
actualizarContadorGeneral();

// --- 4. INICIALIZACIÓN DEL LECTOR ---

let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    }, 
    false
);
html5QrcodeScanner.render(onScanSuccess, onScanFailure);