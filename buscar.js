// --- CONFIGURACIÓN ---
// Sustituye por la URL exacta de tu Google Apps Script (La misma de tu app principal)
const scriptURL = 'https://script.google.com/macros/s/AKfycbzSkFJ17L8EN3vo_3nr4VJ-5iXRLd-2bdMeHI6KF76HzKC2BYv4CFGMWcLBxYx8IbeO/exec'; //2020

const inputBusqueda = document.getElementById('input-busqueda');
const btnBuscar = document.getElementById('btn-buscar');
const loading = document.getElementById('loading');
const noResults = document.getElementById('no-results');
const tabla = document.getElementById('tabla-resultados');
const cuerpoTabla = document.getElementById('cuerpo-resultados');

function ejecutarBusqueda() {
    const valorQuery = inputBusqueda.value.trim();
    if (!valorQuery) return alert("Por favor ingresa un término de búsqueda.Demo30_1443");

    // Resetear interfaz
    tabla.style.display = "none";
    noResults.style.display = "none";
    loading.style.display = "block";
    cuerpoTabla.innerHTML = "";

    // Petición GET al script con la acción y la palabra clave
    fetch(`${scriptURL}?accion=buscarUsuario&query=${encodeURIComponent(valorQuery)}`)
    .then(response => response.json())
    .then(usuarios => {
        loading.style.display = "none";

        if (usuarios.length === 0) {
            noResults.style.display = "block";
            return;
        }

        // Construir filas correspondientes
        usuarios.forEach(user => {
            const tr = document.createElement('tr');
            
            // Evaluamos la clase del estatus para pintar de verde o rojo
            const claseBadge = user.estatus.toLowerCase() === 'cumpliendo' ? 'badge cumple' : 'badge nocumple';

            tr.innerHTML = `
                <td><strong>${user.id}</strong></td>
                <td>${user.nombre}</td>
                <td><span class="${claseBadge}">${user.estatus}</span></td>
                <td>${user.asignados}</td>
                <td style="color: #b91c1c; font-weight: bold;">${user.consumidos}</td>
                <td style="color: #15803d; font-weight: bold;">${user.disponibles}</td>
            `;
            cuerpoTabla.appendChild(tr);
        });

        tabla.style.style.display = "table"; // Mostramos la tabla estructurada
        tabla.style.display = "table";
    })
    .catch(err => {
        console.error(err);
        loading.style.display = "none";
        alert("❌ Error de comunicación con la base de datos.");
    });
}

// Escuchar evento Click del botón
btnBuscar.addEventListener('click', ejecutarBusqueda);

// Permitir buscar al presionar la tecla "Enter" en el teclado
inputBusqueda.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') ejecutarBusqueda();
});