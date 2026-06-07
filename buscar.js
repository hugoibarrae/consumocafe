// --- CONFIGURACIÓN ---
const scriptURL = 'https://script.google.com/macros/s/AKfycbzpbTu4LkhoCE3WXk8J6m-3kksJeF9DE0FVTo5nNS-UQ004CkydYc_1wIQcqlXno3o8/exec'; 
//act0606_1906
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
    
    if (!areaSeleccionada) {
        tabla.style.display = "none";
        cuerpoTabla.innerHTML = "";
        statusMessage.innerText = "";
        return;
    }

    statusMessage.innerText = `Buscando personal de: ${areaSeleccionada}... ⏳`;
    tabla.style.display = "none";
    cuerpoTabla.innerHTML = "";

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
            
            // Evaluamos el estatus actual para definir qué opción estará seleccionada por defecto
            const esCumpliendo = user.estatus.toLowerCase() === 'cumpliendo';

            tr.innerHTML = `
                <td><strong>${user.id}</strong></td>
                <td>${user.nombre}</td> 
                <td>${user.area}</td> 
                <td>${user.actividades}</td>
                <td>
                    <select class="select-estatus-dinamico" 
                            data-fila="${user.filaIndex}" 
                            data-anterior="${user.estatus.toLowerCase()}"
                            style="padding: 4px; border-radius: 4px; font-weight: bold; background-color: ${esCumpliendo ? '#dcfce7' : '#fee2e2'}; color: ${esCumpliendo ? '#166534' : '#991b1b'};">
                        <option value="cumpliendo" ${esCumpliendo ? 'selected' : ''}>Cumpliendo</option>
                        <option value="no cumpliendo" ${!esCumpliendo ? 'selected' : ''}>No cumpliendo</option>
                    </select>
                </td>
                <td>${user.asignados}</td>
                <td style="color: #b91c1c; font-weight: bold;">${user.consumidos}</td>
                <td style="color: #15803d; font-weight: bold;">${user.disponibles}</td>
            `;
            cuerpoTabla.appendChild(tr);
        });

        // Vinculamos el evento de cambio de contraseña a cada menú desplegable inyectado
        asignarEventosEstatus();

        tabla.style.display = "table";
    })
    .catch(err => {
        console.error(err);
        statusMessage.innerText = "❌ Error de comunicación al traer los datos del personal.";
    });
});

// 3. CONTROLADOR INTERNO: Escucha cambios en las listas desplegables de la tabla
function asignarEventosEstatus() {
    const selectores = document.querySelectorAll('.select-estatus-dinamico');
    
    selectores.forEach(select => {
        select.addEventListener('change', (e) => {
            const el = e.target;
            const filaIndex = el.getAttribute('data-fila');
            const valorAnterior = el.getAttribute('data-anterior');
            const nuevoValor = el.value;

            // Solicitar contraseña de administrador mediante cuadro nativo del navegador
            const passwordIngresada = prompt(`🔐 Validación Requerida:\nPara cambiar el estatus de este registro a "${nuevoValor.toUpperCase()}", ingresa la contraseña de administrador:`);

            // Si el usuario canceló o dejó en blanco, restauramos la opción previa
            if (passwordIngresada === null || passwordIngresada.trim() === "") {
                el.value = valorAnterior;
                return;
            }

            statusMessage.innerText = "Validando credenciales y aplicando cambios... ⏳";

            // Estructuramos el payload POST para Apps Script
            const datosEnvio = {
                accion: "cambiarEstatus",
                filaIndex: filaIndex,
                nuevoEstatus: nuevoValor,
                password: passwordIngresada.trim()
            };

            fetch(scriptURL, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify(datosEnvio)
            })
            .then(res => res.text())
            .then(respuestaTexto => {
                if (respuestaTexto === "ESTATUS_ACTUALIZADO_OK") {
                    statusMessage.innerText = "✅ Estatus actualizado con éxito en la base de datos.";
                    // Actualizamos los atributos internos para reflejar el cambio consolidado
                    el.setAttribute('data-anterior', nuevoValor);
                    // Cambiamos dinámicamente el estilo visual según el color asignado
                    const esCumpliendo = nuevoValor === 'cumpliendo';
                    el.style.backgroundColor = esCumpliendo ? '#dcfce7' : '#fee2e2';
                    el.style.color = esCumpliendo ? '#166534' : '#991b1b';
                } else if (respuestaTexto === "CONTRASEÑA_INCORRECTA") {
                    alert("❌ Contraseña de administrador inválida. El cambio no fue aplicado.");
                    el.value = valorAnterior; // Revertir visualmente
                    statusMessage.innerText = "⚠️ Operación rechazada: credenciales incorrectas.";
                } else {
                    alert("Error devuelto por el servidor: " + respuestaTexto);
                    el.value = valorAnterior;
                    statusMessage.innerText = "❌ Fallo en la actualización de celdas.";
                }
            })
            .catch(err => {
                console.error(err);
                alert("Fallo crítico de red al intentar actualizar.");
                el.value = valorAnterior;
                statusMessage.innerText = "❌ Error de conexión de red.";
            });
        });
    });
}