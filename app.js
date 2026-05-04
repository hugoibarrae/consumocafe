// --- CONFIGURACIÓN ---
// Sustituye esta URL por la que obtienes al "Implementar" en Google Apps Script
const scriptURL = 'https://script.google.com/macros/s/AKfycbwMwRfMSNVtUKAmRBVIds7rHdqxZ5zWj116Klp71JNQ9wG71Uw6qEpdVJsgtt9K2DnI/exec';

let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');

// --- 1. LÓGICA DEL LECTOR (CÁMARA) ---

function onScanSuccess(decodedText, decodedResult) {
    // Al detectar un código, lo guardamos y preparamos la interfaz
    ultimoCodigoEscaneado = decodedText;
    
    statusText.innerHTML = `
        <div style="color: #1565c0; background: #e3f2fd; padding: 12px; border-radius: 8px; border: 1px solid #90caf9; margin-bottom: 10px;">
            <strong>Código detectado:</strong><br>
            <span style="word-break: break-all;">${decodedText}</span>
        </div>
    `;
    
    // Configuramos el botón para el envío
    btnEnviar.disabled = false;
    btnEnviar.innerText = "Confirmar Registro";
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.style.color = "blue";
    btnEnviar.style.cursor = "pointer";
    btnEnviar.style.border = "none";
    btnEnviar.style.padding = "12px 24px";
    btnEnviar.style.borderRadius = "5px";
    btnEnviar.style.fontSize = "16px";
}

function onScanFailure(error) {
    // Ignoramos errores de escaneo silenciosos para no saturar la consola
}

// --- 2. LÓGICA DE ENVÍO Y VALIDACIÓN ---

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;

    // Bloqueamos el botón inmediatamente para evitar clics dobles
    btnEnviar.disabled = true;
    btnEnviar.innerText = "Verificando en Excel... ⏳";
    btnEnviar.style.backgroundColor = "#9e9e9e";

    // Enviamos el dato al Apps Script
    fetch(scriptURL, {
        method: 'POST',
        mode: 'cors', 
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => {
        if (!response.ok) throw new Error('Error en la comunicación con Google');
        return response.text(); // Recibimos la respuesta del servidor
    })
    .then(respuesta => {
        if (respuesta === "LIMITE_ALCANZADO") {
            // Caso: Ya tiene 2 registros hoy
            statusText.innerHTML = `
                <div style="background: #fff3e0; padding: 20px; border-radius: 8px; border: 1px solid #ff9800; text-align: center;">
                    <p style="margin: 0; color: #e65100; font-weight: bold; font-size: 1.1em;">⚠️ ACCESO DENEGADO</p>
                    <p style="margin: 10px 0 0 0; color: #333;">
                        Este código ya alcanzó el máximo de <strong>2 registros</strong> por hoy.
                    </p>
                </div>
            `;
            btnEnviar.innerText = "Límite Excedido";
        } else if (respuesta.includes("ERROR")) {
            // Caso: Error reportado por el script de Google
            throw new Error(respuesta);
        } else {
            // Caso: Registro exitoso (respuesta será "1" o "2")
            statusText.innerHTML = `
                <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                    <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 1.1em;">✅ REGISTRO EXITOSO</p>
                    <p style="margin: 10px 0 0 0; color: #333;">
                        Ingreso guardado. Registro <strong>#${respuesta}</strong> del día.
                    </p>
                </div>
            `;
            btnEnviar.innerText = "Listo";
            // Limpiamos el código actual para obligar a un nuevo escaneo
            ultimoCodigoEscaneado = "";
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusText.innerHTML = `
            <div style="color: #c62828; background: #ffebee; padding: 10px; border-radius: 5px; border: 1px solid #ef9a9a; text-align: center;">
                ❌ Error: No se pudo conectar con el servidor.<br>
                <small>${error.message}</small>
            </div>
        `;
        btnEnviar.disabled = false;
        btnEnviar.innerText = "Reintentar Envío";
        btnEnviar.style.backgroundColor = "#c62828";
    });
});

// --- 3. INICIALIZACIÓN DEL LECTOR ---

let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { 
        fps: 10,           // Velocidad (frames por segundo)
        qrbox: { width: 250, height: 250 }, // Tamaño visual del cuadro
        aspectRatio: 1.0
    },
    false
);

html5QrcodeScanner.render(onScanSuccess, onScanFailure);