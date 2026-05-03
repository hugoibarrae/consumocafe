function onScanSuccess(decodedText, decodedResult) {
    function onScanSuccess(decodedText, decodedResult) {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzXaLG3bIyVzR4SbMprnf2jvuCatK5rWLj-uORETwZlnovNu659kMv9r_Qmi2iWv9k9/exec';

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify({ qrTexto: decodedText }),
    })
    .then(response => {
        document.getElementById('result').innerHTML = "Registrado en Excel: " + decodedText;
    })
    .catch(error => console.error('Error!', error.message));
}
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




