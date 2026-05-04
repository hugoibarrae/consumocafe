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
btbtnEnviar.addEventListener('click', () => {
    const scriptURL = 'TU_URL_DE_APPS_SCRIPT_AQUI';

    btnEnviar.disabled = true;
    btnEnviar.innerText = "Enviando...";

    fetch(scriptURL, {
        method: 'POST',
        // Cambiamos a 'cors' para poder leer la respuesta de Google
        mode: 'cors', 
        body: JSON.stringify({ qrTexto: ultimoCodigoEscaneado }),
    })
    .then(response => response.text()) // Leemos la respuesta del script (el contador)
    .then(totalEscaneos => {
        statusText.innerHTML = `
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #4CAF50;">
                <p style="margin: 0; color: #2e7d32; font-weight: bold;">✅ ¡Registro exitoso!</p>
                <p style="margin: 5px 0 0 0; font-size: 1.2em;">
                    Este código se ha escaneado <strong>${totalEscaneos}</strong> veces en total.
                </p>
            </div>
        `;
        btnEnviar.innerText = "Enviar a Excel";
        ultimoCodigoEscaneado = "";
    })
    .catch(error => {
        console.error('Error:', error);
        statusText.innerText = "❌ Error al conectar con el servidor.";
        btnEnviar.disabled = false;
        btnEnviar.innerText = "Reintentar envío";
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