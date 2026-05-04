// --- CONFIGURACIÓN ---
// 1. Reemplaza esta URL por la que obtuviste en "Implementar > Gestionar implementaciones"
const scriptURL = 'https://script.google.com/macros/s/AKfycbwMwRfMSNVtUKAmRBVIds7rHdqxZ5zWj116Klp71JNQ9wG71Uw6qEpdVJsgtt9K2DnI/exec';

let ultimoCodigoEscaneado = "";
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');

// --- LÓGICA DEL ESCÁNER ---

// Función que se ejecuta cuando la cámara detecta un código
function onScanSuccess(decodedText, decodedResult) {
    // Guardamos el texto detectado
    ultimoCodigoEscaneado = decodedText;
    
    // Actualizamos la interfaz
    statusText.innerHTML = `
        <div style="color: #1565c0; background: #e3f2fd; padding: 10px; border-radius: 5px; border: 1px solid #90caf9;">
            <strong>Código detectado:</strong> ${decodedText}
        </div>
    `;
    
    // Habilitamos el botón de envío
    btnEnviar.disabled = false;
    btnEnviar.style.backgroundColor = "#2e7d32";
    btnEnviar.style.color = "white";
    btnEnviar.style.cursor = "pointer";
    btnEnviar.innerText = "Confirmar y Enviar a Excel";
}

// Función que se ejecuta si hay error de lectura (opcional)
function onScanFailure(error) {
    // No ponemos nada aquí para no saturar la consola del navegador
}

// --- LÓGICA DE ENVÍO ---

btnEnviar.addEventListener('click', () => {
    if (!ultimoCodigoEscaneado) return;

    // Bloqueamos el botón para evitar múltiples envíos
    btnEnviar.disabled = true;
    btnEnviar.innerText = "Procesando... ⏳";
    statusText.innerText = "Comunicando con Google Sheets...";

    // Enviamos el dato al Apps Script
    fetch(scriptURL, {
        method: 'POST',
        mode: 'cors', // Permitir recibir respuesta
        cache: 'no-cache',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => {
        if (!response.ok) throw new Error('Error en la red');
        return response.text(); // Recibimos el número (conteo)
    })
    .then(totalEscaneos => {
        // Mostramos éxito y el total de repeticiones
        statusText.innerHTML = `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50; text-align: center;">
                <p style="margin: 0; color: #2e7d32; font-weight: bold; font-size: 1.1em;">✅ ¡Registro Exitoso!</p>
                <p style="margin: 8px 0 0 0; color: #333;">
                    Este código se ha registrado <strong style="font-size: 1.4em;">${totalEscaneos}</strong> veces.
                </p>
            </div>
        `;

        document.getElementById('num-total').innerText = respuesta; // Actualiza con el nuevo número
        
        // Resetear interfaz para el siguiente escaneo
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

// --- INICIALIZACIÓN DEL LECTOR ---

let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { 
        fps: 15,           // Velocidad de escaneo (cuadros por segundo)
        qrbox: { width: 250, height: 250 }, // Tamaño del área de enfoque
        aspectRatio: 1.0   // Proporción cuadrada
    },
    /* verbose= */ false
);

html5QrcodeScanner.render(onScanSuccess, onScanFailure);



// Función para obtener el total del día desde el servidor
function actualizarContadorGeneral() {
    fetch(scriptURL + "?action=getTotalDia")
    .then(res => res.text())
    .then(total => {
        document.getElementById('num-total').innerText = total;
    });
}

// Ejecutar al cargar la página
actualizarContadorGeneral();