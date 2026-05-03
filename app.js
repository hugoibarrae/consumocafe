function onScanSuccess(decodedText, decodedResult) {
    // Se ejecuta cuando se detecta un código
    document.getElementById('result').innerHTML = `
        <p>Contenido detectado:</p>
        <a href="${decodedText}" target="_blank">${decodedText}</a>
    `;
    
    // Opcional: Detener el escaneo tras el éxito
    // html5QrcodeScanner.clear();
}

function onScanFailure(error) {
    // Este callback se ejecuta en cada frame si no encuentra un QR
    // Se deja vacío para no saturar la consola
}

// Configuración del escáner
let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { fps: 10, qrbox: {width: 250, height: 250} },
    /* verbose= */ false
);

html5QrcodeScanner.render(onScanSuccess, onScanFailure);