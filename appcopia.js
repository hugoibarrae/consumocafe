// --- CONFIGURACIÓN ---
const scriptURL = 'https://script.google.com/macros/s/AKfycbzxIV9zR07Ttn3_zhy8bYYSoFNr6Ss87_91Rwc8xzeZ3aQSFHFvxXc1A_9l8prDUUcV/exec';

let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');

// --- LÓGICA DEL ESCÁNER ---

function onScanSuccess(decodedText, decodedResult) {
    ultimoCodigoEscaneado = decodedText;
    
    statusText.innerHTML = `
        <div style="color: #1565c0; background: #e3f2fd; padding: 10px; border-radius: 5px; border: 1px solid #90caf9;">
            <strong>Código detectado:</strong> ${decodedText}
        </div>
    `;
    
    btnEnviar.disabled = false;
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.style.color = "red";
    btnEnviar.style.cursor = "pointer";
    btnEnviar.innerText = "Confirmar y Enviar a Excel";
}

function onScanFailure(error) {}

// --- LÓGICA DE ENVÍO ---

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;

    btnEnviar.disabled = true;
    btnEnviar.innerText = "Procesando... ⏳";
    statusText.innerText = "Comunicando con Google Sheets...";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors', // Usamos no-cors para evitar bloqueos, aunque no leeremos el texto de respuesta directo aquí por limitación de Google
        cache: 'no-cache',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(() => {
        // Como 'no-cors' no nos permite leer el cuerpo de la respuesta por seguridad,
        // llamamos a la función de actualización para refrescar los datos
        
        statusText.innerHTML = `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 1.1em;">✅ ¡Registro Enviado!</p>
                <p style="margin: 8px 0 0 0; color: #333;">El registro se procesó correctamente.</p>
            </div>
        `;

        // Actualizamos los contadores
        actualizarContadorGeneral();
        
        // Resetear interfaz
        btnEnviar.innerText = "Enviar a Excel";
        btnEnviar.style.backgroundColor = "#ccc";
        ultimoCodigoEscaneado = "";
    })
    .catch(error => {
        console.error('Error:', error);
        statusText.innerHTML = `
            <div style="color: #c62828; background: #ffebee; padding: 10px; border-radius: 5px; border: 1px solid #ef9a9a;">
                ❌ Error al enviar. Verifica tu conexión o la URL del script.
            </div>
        `;
        btnEnviar.disabled = false;
        btnEnviar.innerText = "Reintentar Envío";
    });
});

// --- CONTADORES ---

function actualizarContadorGeneral() {
    // Al hacer un fetch simple (GET), activamos el doGet de tu Apps Script
    fetch(scriptURL)
    .then(res => res.text())
    .then(total => {
        const elementoContador = document.getElementById('num-total');
        if(elementoContador) {
            elementoContador.innerText = total;
        }
    })
    .catch(err => console.error("Error al actualizar contador:", err));
}

// Ejecutar al cargar la página para mostrar lo que llevamos
actualizarContadorGeneral();

// --- INICIALIZACIÓN ---

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