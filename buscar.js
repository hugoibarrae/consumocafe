// --- CONFIGURACIÓN ---
// REEMPLAZA CON TU URL DE EJECUCIÓN NUEVA DE APPS SCRIPT
const scriptURL = 'https://script.google.com/macros/s/AKfycbzqcLOaCFHnA5Diz6Dy7dYnv13_RDPWWYfuyJugP_aMkGSoqSfjFJKmxQAwe-f4_fX2/exec'; 


const selectArea = document.getElementById('select-area');
const txtBuscar = document.getElementById('txt-buscar');
const btnBuscar = document.getElementById('btn-buscar');
const tabla = document.getElementById('tabla-usuarios');
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const msg = document.getElementById('msg');

// Elementos de la ventana Modal de Edición
const modal = document.getElementById('form-modal');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const btnGuardar = document.getElementById('btn-guardar');

let usuariosCargados = []; // Memoria caché temporal de la consulta en pantalla

// 1. CARGA INICIAL DE LISTA DESPLEGABLE
document.addEventListener('DOMContentLoaded', () => {
    fetch(`${scriptURL}?accion=obtenerAreas`)
    .then(res => res.json())
    .then(areas => {
        selectArea.innerHTML = '<option value="">-- Selecciona un Área --</option>';
        areas.forEach(a => {
            const op = document.createElement('option');
            op.value = a; op.innerText = a;
            selectArea.appendChild(op);
        });
        msg.innerText = "✅ Filtros listos para operar.";
    }).catch(() => msg.innerText = "❌ Error al cargar catálogo de áreas.");
});

// Renderizar las filas obtenidas en la tabla general
function mostrarDatos EnTabla(data) {
    usuariosCargados = data;
    cuerpoTabla.innerHTML = "";
    if (data.length === 0) {
        tabla.style.display = "none";
        msg.innerText = "ℹ️ No se encontraron usuarios coincidentes.";
        return;
    }
    msg.innerText = `📊 Registros localizados: ${data.length}`;
    
    data.forEach((user, idx) => {
        const tr = document.createElement('tr');
        const badgeClase = user.estatus.toLowerCase() === 'cumpliendo' ? 'badge cumple' : 'badge nocumple';
        
        tr.innerHTML = `
            <td><strong>${user.id}</strong></td>
            <td>${user.nombreCompleto}</td>
            <td>${user.area}</td>
            <td>${user.asignados}</td>
            <td style="color:#b91c1c; font-weight:bold;">${user.consumidos}</td>
            <td style="color:#15803d; font-weight:bold;">${user.disponibles}</td>
            <td><span class="${badgeClase}">${user.estatus}</span></td>
            <td><button class="btn-edit" onclick="abrirEditor(${idx})">Editar</button></td>
        `;
        cuerpoTabla.appendChild(tr);
    });
    tabla.style.display = "table";
}

// 2. BUSCADOR A: FILTRO POR DESPLEGABLE DE ÁREAS
selectArea.addEventListener('change', () => {
    if (!selectArea.value) return;
    txtBuscar.value = ""; // Limpiar el otro buscador
    msg.innerText = "Filtrando datos de adscripción... ⏳";
    fetch(`${scriptURL}?accion=filtrarPorArea&area=${encodeURIComponent(selectArea.value)}`)
    .then(res => res.json()).then(mostrarDatosEnTabla);
});

// 3. BUSCADOR B: FILTRO POR TEXTO LIBRE
function realizarBusquedaTexto() {
    if (!txtBuscar.value.trim()) return alert("Escribe un parámetro de búsqueda.");
    selectArea.value = ""; // Limpiar desplegable
    msg.innerText = "Buscando coincidencias en registros... ⏳";
    fetch(`${scriptURL}?accion=buscarTexto&query=${encodeURIComponent(txtBuscar.value.trim())}`)
    .then(res => res.json()).then(mostrarDatosEnTabla);
}
btnBuscar.addEventListener('click', realizarBusquedaTexto);
txtBuscar.addEventListener('keypress', (e) => { if(e.key === 'Enter') realizarBusquedaTexto(); });

// 4. VENTANA EMERGENTE DE EDICIÓN (MODAL)
function abrirEditor(index) {
    const u = usuariosCargados[index];
    document.getElementById('edit-index').value = u.filaIndex;
    document.getElementById('edit-nombre').value = u.nombre;
    document.getElementById('edit-pat').value = u.apellidoPaterno;
    document.getElementById('edit-mat').value = u.apellidoMaterno;
    document.getElementById('edit-area').value = u.area;
    document.getElementById('edit-correo').value = u.correo || "";
    document.getElementById('edit-asignados').value = u.asignados;
    modal.style.display = "block";
}

btnCerrarModal.addEventListener('click', () => modal.style.display = "none");

// 5. ACCIÓN POST: ENVIAR MODIFICACIONES AL EXCEL
btnGuardar.addEventListener('click', () => {
    const payload = {
        accion: "actualizarUsuario",
        filaIndex: document.getElementById('edit-index').value,
        nombre: document.getElementById('edit-nombre').value.trim(),
        apellidoPaterno: document.getElementById('edit-pat').value.trim(),
        apellidoMaterno: document.getElementById('edit-mat').value.trim(),
        area: document.getElementById('edit-area').value.trim(),
        correo: document.getElementById('edit-correo').value.trim(),
        asignados: document.getElementById('edit-asignados').value.trim()
    };

    msg.innerText = "Guardando cambios en DatosGenerales... ⏳";
    modal.style.display = "none";

    fetch(scriptURL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify(payload)
    })
    .then(res => res.text())
    .then(textoRespuesta => {
        if (textoRespuesta === "USUARIO_ACTUALIZADO") {
            msg.innerText = "✅ Registro modificado exitosamente en Google Sheets.";
            // Refrescar la vista actual para constatar los cambios en pantalla
            if (selectArea.value) {
                fetch(`${scriptURL}?accion=filtrarPorArea&area=${encodeURIComponent(selectArea.value)}`).then(res => res.json()).then(mostrarDatosEnTabla);
            } else {
                fetch(`${scriptURL}?accion=buscarTexto&query=${encodeURIComponent(txtBuscar.value.trim())}`).then(res => res.json()).then(mostrarDatosEnTabla);
            }
        } else {
            alert("Error del servidor: " + textoRespuesta);
        }
    })
    .catch(err => {
        console.error(err);
        msg.innerText = "❌ Error de red al intentar actualizar los parámetros.";
    });
});