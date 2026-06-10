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

// 6. RENDERIZADOR CON GENERACIÓN DE QR + CLAVE INTEGRADA EN LA IMAGEN
function inyectarFilasEnTabla(listaUsuarios) {
    cuerpoTabla.innerHTML = "";
    
    if (listaUsuarios.length === 0) {
        tabla.style.display = "none";
        return;
    }

    listaUsuarios.forEach(user => {
        const tr = document.createElement('tr');
        const esCumpliendo = user.estatus.toLowerCase() === 'cumpliendo';
        const telefonoDestino = user.telefono || ""; 

        // 1. GENERAMOS LA URL DE LA IMAGEN COMBINADA (QR + CLAVE ABAJO)
        // Usamos quickchart.io que permite agregar texto (caption) de forma nativa en la misma imagen
        const urlQRConTexto = `https://quickchart.io/qr?text=${encodeURIComponent(user.id)}&caption=${encodeURIComponent(user.id)}&captionFontSize=16&margin=2&size=350`;

        // 2. CONSTRUCCIÓN DEL MENSAJE PARA WHATSAPP
        const textoMensaje = `¡Hola! 👋 Te hacemos entrega de tu credencial digital con código QR para el Módulo de Vales de Cafetería de la FFyL.\n\n*Tu ID de acceso es:* ${user.id}\n\n*Descarga y guarda tu imagen QR desde este enlace:* \n${urlQRConTexto}\n\n(Abre el enlace para ver tu código QR con tu clave integrada abajo, puedes guardarlo directamente en tu galería).`;
        const enlaceWhatsApp = `https://wa.me/${telefonoDestino}?text=${encodeURIComponent(textoMensaje)}`;

        tr.innerHTML = `
            <td class="celda-adaptable" style="width: 100%;">
                <div class="fila-movil">
                    
                    <div class="linea-1">
                        <div class="usuario-info">
                            <div class="usuario-id">${user.id}</div>
                            <div style="font-weight: 600; color: #111827;">${user.nombre}</div>
                            <div style="font-size: 11px; color: #6b7280;">${user.area} • ${user.actividades}</div>
                        </div>
                        <div>
                            <select class="select-estatus-dinamico" 
                                    data-fila="${user.filaIndex}" 
                                    data-anterior="${user.estatus.toLowerCase()}"
                                    style="padding: 6px; border-radius: 4px; font-weight: bold; font-size: 12px; background-color: ${esCumpliendo ? '#dcfce7' : '#fee2e2'}; color: ${esCumpliendo ? '#166534' : '#991b1b'}; border: 1px solid ${esCumpliendo ? '#bbf7d0' : '#fecaca'};">
                                <option value="cumpliendo" ${esCumpliendo ? 'selected' : ''}>Cumpliendo</option>
                                <option value="no cumpliendo" ${!esCumpliendo ? 'selected' : ''}>No cumpliendo</option>
                            </select>
                        </div>
                    </div>

                    <div class="linea-2">
                        <div class="valores-vales">
    Asig: <strong style="cursor:pointer; color:#1e3a8a; text-decoration:underline;" class="txt-ajustar-vales" data-fila="${user.filaIndex}" data-id="${user.id}" data-actual="${user.asignados}"> ${user.asignados} ✏️</strong> | 
    Cons: <strong style="color: #b91c1c;">${user.consumidos}</strong> | 
    Disp: <strong style="color: #15803d;">${user.disponibles}</strong>
 </div>
                        
                        <div class="acciones-contenedor">
                            <button class="btn-enviar-qr" 
                                    data-fila="${user.filaIndex}" 
                                    data-id="${user.id}" 
                                    style="background-color: #1e3a8a; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">
                                ✉️ Correo
                            </button>
                            
                            <a href="${enlaceWhatsApp}" 
                               target="_blank" 
                               class="btn-whatsapp-qr"
                               data-fila="${user.filaIndex}"
                               data-id="${user.id}"
                               style="background-color: #25d366; color: white; text-decoration: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">
                                💬 WhatsApp
                            </a>
                        </div>
                    </div>

                </div>
            </td>
        `;
        cuerpoTabla.appendChild(tr);
    });

    asignarEventosEstatus();
    asignarEventosEnvioQR(); 
    asignarEventosRegistroFechaWhatsApp(); 
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

// NUEVO: CONTROLADOR PARA AJUSTAR LOS VALES DESDE LA TABLA
function asignarEventosAjusteVales() {
    const elementosAjuste = document.querySelectorAll('.txt-ajustar-vales');
    elementosAjuste.forEach(el => {
        el.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const filaIndex = target.getAttribute('data-fila');
            const idQR = target.getAttribute('data-id');
            const valorActual = target.getAttribute('data-actual');

            const nuevaCantidadStr = prompt(`✏️ Modificar Vales para ID: ${idQR}\nCantidad actual asignada: ${valorActual}\n\nIngresa la NUEVA cantidad total de vales:`);
            
            if (nuevaCantidadStr === null || nuevaCantidadStr.trim() === "") return;
            
            const nuevaCantidad = parseInt(nuevaCantidadStr.trim());
            if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
                alert("❌ Por favor ingresa un número entero válido igual o mayor a 0.");
                return;
            }

            const passwordIngresada = prompt(`🔐 Validación de Seguridad:\nIntroduce la contraseña de administrador para confirmar el ajuste de vales:`);
            if (passwordIngresada === null || passwordIngresada.trim() === "") return;

            const datosAjuste = {
                accion: "ajustarVales",
                filaIndex: filaIndex,
                nuevaCantidad: nuevaCantidad,
                password: passwordIngresada.trim()
            };

            fetch(scriptURL, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify(datosAjuste)
            })
            .then(res => res.text())
            .then(respuestaTexto => {
                if (respuestaTexto === "AJUSTE_VALES_OK") {
                    alert(`✅ ¡Ajuste realizado! Se asignaron ${nuevaCantidad} vales correctamente.`);
                    // Opcional: Volver a ejecutar tu función de búsqueda para refrescar la pantalla automáticamente
                    ejecutarFiltradoDeArea(); 
                } else if (respuestaTexto === "CONTRASEÑA_INCORRECTA") {
                    alert("❌ Contraseña de administrador inválida.");
                } else {
                    alert("Error en el servidor: " + respuestaTexto);
                }
            })
            .catch(err => {
                console.error(err);
                alert("❌ Error de red al intentar procesar el ajuste.");
            });
        });
    });
}