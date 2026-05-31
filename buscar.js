// --- CONFIGURACIÓN ---
// REEMPLAZA CON TU URL DE EJECUCIÓN NUEVA DE APPS SCRIPT
const scriptURL = 'https://script.google.com/macros/s/AKfycbxGc9_NqR1o0dIx3g0t17H1p0qkSdUnCzRYGuCfAhCRe9Ac55uGExS54FReT558ldkP/exec'; 

const selectArea = document.getElementById('select-area');
const tabla = document.getElementById('tabla-usuarios');
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const statusMessage = document.getElementById('status-message');

// 1. CARGA INICIAL: Obtener las áreas de la base de datos para llenar el select
document.addEventListener('DOMContentLoaded', () => {
    fetch(`${scriptURL}?accion=obtenerAreas`)
    .then(res => res.json())
    .then(areas => {
        selectArea.innerHTML = '<option value="">-- Selecciona un área --</option>';
        
        if(areas.length === 0) {
            statusMessage.innerText = "⚠️ No se encontraron áreas o no existe la columna Area_Resp.";
            return;
        }

        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.innerText = area;
            selectArea.appendChild(option);
        });
        statusMessage.innerText = "✅ Áreas cargadas correctamente.";
    })
    .catch(err => {
        console.error(err);
        statusMessage.innerText = "❌ Error al conectar con el servidor para obtener áreas.";
    });
});

// 2. DETECTOR DE CAMBIOS: Cuando el usuario selecciona un área diferente
selectArea.addEventListener('change', () => {
    const areaSeleccionada = selectArea.value;
    
    // Si selecciona la opción por defecto vacía, ocultamos la tabla
    if (!areaSeleccionada) {
        tabla.style.display = "none";
        cuerpoTabla.innerHTML = "";
        statusMessage.innerText = "";
        return;
    }

    statusMessage.innerText = `Buscando personal de: ${areaSeleccionada}... ⏳`;
    tabla.style.display = "none";
    cuerpoTabla.innerHTML = "";

    // Petición al servidor filtrando por el área elegida
    fetch(`${scriptURL}?accion=filtrarPorArea&area=${encodeURIComponent(areaSeleccionada)}`)
    .then(res => res.json())
    .then(usuarios => {
        if (usuarios.length === 0) {
            statusMessage.innerText = "ℹ️ No hay usuarios registrados en esta área.";
            return;
        }

        statusMessage.innerText = `📊 Mostrando ${usuarios.length} usuarios encontrados.`;

        usuarios.forEach(user => {
            const tr = document.createElement('tr');
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

        tabla.style.display = "table";
    })
    .catch(err => {
        console.error(err);
        statusMessage.innerText = "❌ Error de comunicación al traer los datos del personal.";
    });
});