let ultimoCodigoEscaneado = ""; // Variable para guardar el texto del QR
const btnEnviar = document.getElementById('btn-enviar');
const statusText = document.getElementById('status-text');

// 1. Función que se activa al detectar el QR
function onScanSuccess(decodedText, decodedResult) {
    ultimoCodigoEscaneado = decodedText; // Guardamos el valor
    
    // Mostramos al usuario qué se detectó y activamos el botón
    statusText.innerText = "Código detectado: " + decodedText;
    btnEnviar.disabled = false; 
    btnEnviar.style.backgroundColor = "#4CAF50"; // Verde para indicar listo
    btnEnviar.style.color = "orange";
}

// 2. Función para enviar los datos (se activa al hacer clic)
btnEnviar.addEventListener('click', () => {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwwXo4U1VgRqf4luWE09UDxKglSmb-2Cy_3zSwAKg6xM-yG7Z9quGJnF220A0sUr_hR/exec';

    // Cambiamos el estado mientras envía
    btnEnviar.disabled = true;
    btnEnviar.innerText = "Enviando...";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors', // Importante para evitar bloqueos de CORS en Apps Script
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(() => {
        statusText.innerText = "✅ ¡Registrado con éxito!";
        btnEnviar.innerText = "Enviar a Excel";
        
        // Limpiamos después de enviar para evitar duplicados
        ultimoCodigoEscaneado = "";
        setTimeout(() => { 
            statusText.innerText = "Esperando nuevo escaneo..."; 
        }, 3000);
    })
    .catch(error => {
        console.error('Error:', error);
        statusText.innerText = "❌ Error al enviar.";
        btnEnviar.disabled = false;
    });
});

function onScanFailure(error) {
    // Errores de lectura ignorados para fluidez
}

// Inicializar el escáner
let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { fps: 10, qrbox: {width: 250, height: 250} },
    false
);

html5QrcodeScanner.render(onScanSuccess, onScanFailure);