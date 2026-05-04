// --- CONFIGURACIÓN ---
// Asegúrate de que esta URL sea la de tu última implementación (Nueva versión)
const scriptURL = 'https://script.google.com/macros/s/AKfycbwPbEKAjAOzQPwDYe2mNMXmLcUgI6T7NCRBlFWIripSvekO5lLwgMGO-C7V0lzeeOZk/exec';

let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');

// --- 1. LÓGICA DEL ESCÁNER (CÁMARA) ---

function onScanSuccess(decodedText, decodedResult) {
    ultimoCodigoEscaneado = decodedText;
    
    // Mostramos lo que se detectó
    statusText.innerHTML = `
        <div style="color: #1565c0; background: #e3f2fd; padding: 10px; border-radius: 5px; border: 1px solid #90caf9; margin-bottom: 10px;">
            <strong>Código detectado:</strong><br>${decodedText}
        </div>
    `;
    
    // Preparamos el botón
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Confirmar y Enviar";
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.style.color = "white";
    btnEnviar.style.cursor = "pointer";
}

function onScanFailure(error) {
    // Ignorado para fluidez
}

// --- 2. LÓGICA DE ENVÍO Y VALIDACIÓN DE LÍMITE ---

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;

    btnEnviar.disabled = true;
    btnEnviar.innerText = "Validando ID... ⏳";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'cors', 
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => {
        if (!response.ok) throw new Error('Error en servidor');
        return response.text(); 
    })
    .then(resultado => {
        if (resultado === "LIMITE_ALCANZADO") {
            // Caso: El ID ya tiene 2 registros hoy
            statusText.innerHTML = `
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border: 1px solid #ff9800; text-align: center;">
                    <p style="margin: 0; color: #e65100; font-weight: bold;">⚠️ LÍMITE EXCEDIDO</p>
                    <p style="margin: 5px 0 0 0;">Este ID ya alcanzó los 2 registros permitidos por hoy.</p>
                </div>
            `;
            btnEnviar.innerText = "Acceso Denegado";
            btnEnviar.style.backgroundColor = "#ff9800";
        } else {
            // Caso: Registro exitoso
            statusText.innerHTML = `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold;">✅ REGISTRO EXITOSO</p>
                    <p style="margin: 5px 0 0 0;">Vale registrado correctamente en Excel.</p>
                </div>
            `;
            
            // Actualizamos el contador general de la pantalla
            actualizarContadorGeneral();
            
            // Limpiamos para el siguiente
            btnEnviar.innerText = "Enviar a Excel";
            btnEnviar.style.backgroundColor = "#ccc";
            ultimoCodigoEscaneado = "";
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusText.innerHTML = `
            <div style="color: #c62828; background: #ffebee; padding: 10px; border-radius: 5px; border: 1px solid #ef9a9a;">
                ❌ Error de conexión. Reintenta o verifica la URL del script.
            </div>
        `;
        btnEnviar.disabled = false;
        btnEnviar.innerText = "Reintentar Envío";
    });
});

// --- 3. CONTADORES (CARGA INICIAL Y ACTUALIZACIÓN) ---

function actualizarContadorGeneral() {
    // Esta petición activa el doGet en Google Apps Script
    fetch(scriptURL)
    .then(res => res.text())
    .then(total => {
        const elementoContador = document.getElementById('num-total');
        if(elementoContador) {
            elementoContador.innerText = total;
        }
    })
    .catch(err => console.error("Error al cargar contador:", err));
}

// Cargar el conteo apenas se abre la página
actualizarContadorGeneral();

// --- 4. INICIALIZACIÓN DEL LECTOR ---

let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { 
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    },
    false
);

html5QrcodeScanner.render(onScanSuccess, onScanFailure);