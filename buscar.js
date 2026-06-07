// --- CONFIGURACIÓN ---
const scriptURL = 'https://script.google.com/macros/s/AKfycbw03-hpvBkYuiO1THCCzg2Nb9hRexRrK9jDtNJB7UPVcD6p6uUfqL18WWum5bLfW_U/exec'; 

const selectArea = document.getElementById('select-area');
const selectActividad = document.getElementById('select-actividad');
const contenedorActividad = document.getElementById('contenedor-actividad');
const contenedorBusqueda = document.getElementById('contenedor-busqueda');
const txtBuscarLocal = document.getElementById('txt-buscar-local');
const tabla = document.getElementById('tabla-usuarios');
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const statusMessage = document.getElementById('status-message');

// Memoria caché para gestionar los filtros locales compuestos
let usuariosAreaCache = []; 

// 1. CARGA INICIAL: Obtener las áreas de la base de datos
document.addEventListener('DOMContentLoaded', () => {
    fetch(`${scriptURL}?accion=obtenerAreas`)
    .then(res => res.json())
    .then(areas => {
        selectArea.innerHTML = '<option value="">-- Selecciona un área --</option>';
        if(areas.length === 0) {
            statusMessage.innerText = "⚠️ No se encontraron áreas en la columna AREA1.";
            return;
        }
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.innerText = area;
            selectArea.appendChild(option);
        });
        statusMessage.innerText = "✅ Catálogo de áreas listo.";
    })
    .catch(err => {
        console.error(err);
        statusMessage.innerText = "❌ Error al conectar con el servidor para obtener áreas.";
    });
});

// 2. DETECTOR DE CAMBIOS EN ÁREA
selectArea.addEventListener('change', () => {
    const areaSeleccionada = selectArea.value;
    
    if (!areaSeleccionada) {
        tabla.style.display = "none";
        contenedorActividad.style.display = "none";
        contenedorBusqueda.style.display = "none";
        cuerpoTabla.innerHTML = "";
        statusMessage.innerText = "";
        txtBuscarLocal.value = "";
        usuariosAreaCache = [];
        return;
    }

    statusMessage.innerText = `Consultando personal de: ${areaSeleccionada}... ⏳`;
    tabla.style.display = "none";
    contenedorActividad.style.display = "none";
    contenedorBusqueda.style.display = "none";
    cuerpoTabla.innerHTML = "";
    txtBuscarLocal.value = ""; // Limpiar buscador al cambiar de área

    fetch(`${scriptURL}?accion=filtrarPorArea&area=${encodeURIComponent(areaSeleccionada)}`)
    .then(res => res.json())
    .then(usuarios => {
        if (usuarios.length === 0) {
            statusMessage.innerText = "ℹ️ No hay usuarios registrados en esta área.";
            return;
        }

        usuariosAreaCache = usuarios;

        // Configurar e indicar componentes visuales secundarios
        configurarDesplegableActividades(usuarios);
        contenedorBusqueda.style.display = "block"; // Mostrar el cuadro de texto

        // Renderizar todos inicialmente
        aplicarFiltrosCombinados();
    })
    .catch(err => {
        console.error(err);
        statusMessage.innerText = "❌ Error de comunicación al traer los datos del personal.";
    });
});

// 3. GENERADOR LOCAL DEL SELECT DE ACTIVIDADES
function configurarDesplegableActividades(usuarios) {
    let actividadesUnicas = [];
    usuarios.forEach(u => {
        let act = u.actividades ? u.actividades.toString().trim() : "";
        if (act && actividadesUnicas.indexOf(act) === -1) {
            actividadesUnicas.push(act);
        }
    });
    actividadesUnicas.sort();

    selectActividad.innerHTML = '<option value="TODOS">-- TODOS LOS MIEMBROS --</option>';
    actividadesUnicas.forEach(act => {
        const op = document.createElement('option');
        op.value = act; op.innerText = act;
        selectActividad.appendChild(op);
    });

    contenedorActividad.style.display = "block";
}

// 4. DETECTORES DE FILTRADO LOCAL (Actividad y Buscador de texto)
selectActividad.addEventListener('change', aplicarFiltrosCombinados);
txtBuscarLocal.addEventListener('input', aplicarFiltrosCombinados); // Ejecuta el filtro con cada letra escrita

// 5. FUNCIÓN MAESTRA: Combina el filtro de actividad + la búsqueda por texto de forma limpia
function aplicarFiltrosCombinados() {
    const actividadElegida = selectActividad.value;
    const textoBusqueda = txtBuscarLocal.value.toLowerCase().trim();

    // Función auxiliar interna para quitar acentos de forma segura en la búsqueda local de la web
    const normalizarTextoLocal = (texto) => {
        return texto.toString().toLowerCase()
            .replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e")
            .replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o")
            .replace(/[úùüû]/g, "u");
    };

    const textoBusquedaNormalizado = normalizarTextoLocal(textoBusqueda);

    // Filtrado en cascada
    let resultados = usuariosAreaCache;

    // Paso A: Filtrar por actividad si no es "TODOS"
    if (actividadElegida !== "TODOS") {
        resultados = resultados.filter(u => u.actividades && u.actividades.toString().trim() === actividadElegida);
    }

    // Paso B: Filtrar por texto escrito (Nombre o IDQR)
    if (textoBusquedaNormalizado !== "") {
        resultados = resultados.filter(u => {
            const nombreCompleto = normalizarTextoLocal(u.nombre);
            const idQR = normalizarTextoLocal(u.id);
            
            // Evalúa si el texto buscado está incluido en el nombre o en el ID
            return nombreCompleto.includes(textoBusquedaNormalizado) || idQR.includes(textoBusquedaNormalizado);
        });
    }

    // Renderizar los resultados finales procesados
    inyectarFilasEnTabla(resultados);

    // Ajustar mensajes informativos de estado
    if (textoBusquedaNormalizado !== "") {
        statusMessage.innerText = `🔍 Filtrado local: Coincidencias encontradas: ${resultados.length}`;
    } else if (actividadElegida !== "TODOS") {
        statusMessage.innerText = `🔍 Filtro aplicado: ${resultados.length} miembros en la actividad "${actividadElegida}".`;
    } else {
        statusMessage.innerText = `📊 Mostrando todos los miembros del área (${resultados.length}).`;
    }
}

// 6. RENDERIZADOR DE FILAS EN LA TABLA (Con botones de Correo y WhatsApp)
function inyectarFilasEnTabla(listaUsuarios) {
    cuerpoTabla.innerHTML = "";
    
    if (listaUsuarios.length === 0) {
        tabla.style.display = "none";
        return;
    }

    listaUsuarios.forEach(user => {
        const tr = document.createElement('tr');
        const esCumpliendo = user.estatus.toLowerCase() === 'cumpliendo';

        // Intentamos obtener el teléfono de la base si existiera en un futuro, 
        // de lo contrario, el sistema abrirá la ventana de selección de contacto en WhatsApp.
        // Si tienes una columna de teléfono, podrías mapearla aquí (ej. user.telefono)
        const telefonoDestino = user.telefono || ""; 

        // Construcción del mensaje predefinido para WhatsApp
        const urlQR = `https://api.qrserver.com/v1/create-qr-code/?size=390x390&data=${encodeURIComponent(user.id)}`;
        const textoMensaje = `¡Hola! 👋 Te hacemos entrega de tu credencial digital con código QR para el Módulo de Vales de Cafetería de la FFyL.\n\n*Tu ID de acceso es:* ${user.id}\n\n*Descarga tu imagen QR desde este enlace:* \n${urlQR}\n\nPor favor, guarda la imagen en tu celular para mostrarla al momento de tu consumo. ☕`;
        
        // Enlace final de la API de WhatsApp
        const enlaceWhatsApp = `https://wa.me/${telefonoDestino}?text=${encodeURIComponent(textoMensaje)}`;

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
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-enviar-qr" 
                            data-fila="${user.filaIndex}" 
                            data-id="${user.id}" 
                            style="background-color: #1e3a8a; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">
                        ✉️ Correo
                    </button>
                    
                    <a href="${enlaceWhatsApp}" 
                       target="_blank" 
                       class="btn-whatsapp-qr"
                       data-fila="${user.filaIndex}"
                       data-id="${user.id}"
                       style="background-color: #25d366; color: white; text-decoration: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px; display: inline-flex; align-items: center;">
                        💬 WhatsApp
                    </a>
                </div>
            </td>
        `;
        cuerpoTabla.appendChild(tr);
    });

    asignarEventosEstatus();
    asignarEventosEnvioQR(); 
    asignarEventosRegistroFechaWhatsApp(); // <--- NUEVA MÉTRICA DE REGISTRO
    tabla.style.display = "table";
}

// NUEVO: CONTROLADOR PARA ENVIAR EL CORREO ELECTRÓNICO CON EL QR
function asignarEventosEnvioQR() {
    const botones = document.querySelectorAll('.btn-enviar-qr');
    botones.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            const filaIndex = el.getAttribute('data-fila');
            const idQR = el.getAttribute('data-id');

            // Solicitar contraseña del administrador para mayor seguridad
            const passwordIngresada = prompt(`🔐 Validación de Seguridad:\nIntroduce la contraseña de administrador para proceder con el envío por correo del QR (${idQR}):`);

            if (passwordIngresada === null || passwordIngresada.trim() === "") return;

            statusMessage.innerText = `Generando y enviando código QR para ID: ${idQR}... ⏳`;
            el.disabled = true;
            el.style.backgroundColor = "#9ca3af";

            const datosEnvio = {
                accion: "enviarCodigoQR",
                filaIndex: filaIndex,
                idQR: idQR,
                password: passwordIngresada.trim()
            };

            fetch(scriptURL, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify(datosEnvio)
            })
            .then(res => res.text())
            .then(respuestaTexto => {
                el.disabled = false;
                el.style.backgroundColor = "#1e3a8a";

                if (respuestaTexto === "QR_ENVIADO_OK") {
                    statusMessage.innerText = `✅ Código QR enviado con éxito por correo y registrado en BaseDatos.`;
                    alert(`¡Código QR (${idQR}) enviado exitosamente al usuario!`);
                } else if (respuestaTexto === "CONTRASEÑA_INCORRECTA") {
                    alert("❌ Contraseña de administrador inválida.");
                    statusMessage.innerText = "⚠️ Operación rechazada: credenciales incorrectas.";
                } else if (respuestaTexto === "CORREO_NO_ENCONTRADO") {
                    alert("⚠️ No se encontró una dirección de correo para este usuario en las columnas de la Base de Datos.");
                    statusMessage.innerText = "⚠️ Error: Faltan datos de contacto del usuario.";
                } else {
                    alert("Error devuelto por el servidor: " + respuestaTexto);
                    statusMessage.innerText = "❌ Fallo al procesar el envío.";
                }
            })
            .catch(err => {
                console.error(err);
                el.disabled = false;
                el.style.backgroundColor = "#1e3a8a";
                alert("Fallo crítico de red al intentar conectar.");
                statusMessage.innerText = "❌ Error de conexión de red.";
            });
        });
    });
}

// 7. CONTROLADOR DE CAMBIO DE ESTATUS (Protegido por contraseña)
function asignarEventosEstatus() {
    const selectores = document.querySelectorAll('.select-estatus-dinamico');
    selectores.forEach(select => {
        select.addEventListener('change', (e) => {
            const el = e.target;
            const filaIndex = el.getAttribute('data-fila');
            const valorAnterior = el.getAttribute('data-anterior');
            const nuevoValor = el.value;

            const passwordIngresada = prompt(`🔐 Validación Requerida:\nPara cambiar el estatus de este registro a "${nuevoValor.toUpperCase()}", ingresa la contraseña de administrador:`);

            if (passwordIngresada === null || passwordIngresada.trim() === "") {
                el.value = valorAnterior;
                return;
            }

            statusMessage.innerText = "Validando credenciales y aplicando cambios... ⏳";

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
                    el.setAttribute('data-anterior', nuevoValor);
                    
                    const usuarioCache = usuariosAreaCache.find(u => u.filaIndex == filaIndex);
                    if(usuarioCache) usuarioCache.estatus = nuevoValor;

                    const esCumpliendo = nuevoValor === 'cumpliendo';
                    el.style.backgroundColor = esCumpliendo ? '#dcfce7' : '#fee2e2';
                    el.style.color = esCumpliendo ? '#166534' : '#991b1b';
                } else if (respuestaTexto === "CONTRASEÑA_INCORRECTA") {
                    alert("❌ Contraseña de administrador inválida. El cambio no fue aplicado.");
                    el.value = valorAnterior;
                    statusMessage.innerText = "⚠️ Operación rechazada: credenciales incorrectas.";
                } else {
                    alert("Error devuelto por el servidor: " + respuestaTexto);
                    el.value = valorAnterior;
                    statusMessage.innerText = "❌ Fallo en la actualización.";
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


// NUEVO: REGISTRA LA FECHA EN GOOGLE SHEETS AL DAR CLIC AL BOTÓN DE WHATSAPP
function asignarEventosRegistroFechaWhatsApp() {
    const botonesWA = document.querySelectorAll('.btn-whatsapp-qr');
    botonesWA.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            const filaIndex = el.getAttribute('data-fila');
            const idQR = el.getAttribute('data-id');

            // Hacemos una petición silenciosa al servidor para registrar la fecha en 'envioWA'
            const datosRegistro = {
                accion: "registrarEnvioWhatsApp",
                filaIndex: filaIndex,
                idQR: idQR
            };

            fetch(scriptURL, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify(datosRegistro)
            })
            .then(res => res.text())
            .then(res => {
                console.log("Estampa de tiempo WhatsApp registrada en servidor:", res);
            })
            .catch(err => console.error("Error al registrar estampa de tiempo de WhatsApp:", err));
        });
    });
}