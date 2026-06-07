// --- CONFIGURACIÓN ---
const scriptURL = 'https://script.google.com/macros/s/AKfycbzpbTu4LkhoCE3WXk8J6m-3kksJeF9DE0FVTo5nNS-UQ004CkydYc_1wIQcqlXno3o8/exec'; 

const bloqueCandado = document.getElementById('bloque-candado');
const formAlta = document.getElementById('form-alta');
const btnValidarIngreso = document.getElementById('btn-validar-ingreso');
const selectAltaArea = document.getElementById('select-alta-area');
const selectAltaActividad = document.getElementById('select-alta-actividad');
const statusMessage = document.getElementById('status-message');

const inputPaterno = document.getElementById('txt-paterno');
const inputMaterno = document.getElementById('txt-materno');
const inputMatricula = document.getElementById('txt-matricula');
const inputIdQR = document.getElementById('txt-id');

let adminPasswordCache = ""; 
let usuariosBaseDatosCache = []; 

// 1. CONTROL DE ACCESO
btnValidarIngreso.addEventListener('click', () => {
    const psw = prompt("🔐 Introduce la contraseña de administrador para desbloquear el formulario:");
    if (psw === null) return; 
    if (psw.trim() === "") { alert("La contraseña no puede estar vacía."); return; }

    adminPasswordCache = psw.trim();
    bloqueCandado.style.display = "none";
    formAlta.style.display = "block";
    mostrarMensaje("🔓 Descargando catálogo de dependencias... ⏳", "info");
    descargarDatosParaEstructuraLocal();
});

function descargarDatosParaEstructuraLocal() {
    fetch(`${scriptURL}?accion=obtenerAreas`)
    .then(res => res.json())
    .then(areas => {
        selectAltaArea.innerHTML = '<option value="">-- Selecciona un área --</option>';
        areas.forEach(area => {
            const op = document.createElement('option');
            op.value = area; op.innerText = area;
            selectAltaArea.appendChild(op);
        });
        selectAltaActividad.innerHTML = '<option value="">-- Selecciona primero un área --</option>';
        
        let promesas = areas.map(area => 
            fetch(`${scriptURL}?accion=filtrarPorArea&area=${encodeURIComponent(area)}`).then(r => r.json())
        );
        return Promise.all(promesas);
    })
    .then(resultadosPorArea => {
        usuariosBaseDatosCache = resultadosPorArea.flat();
        mostrarMensaje("✅ Formularios y listas dinámicas listos para usarse.", "success");
    })
    .catch(err => {
        console.error(err);
        mostrarMensaje("⚠️ Error al sincronizar el catálogo dinámico local.", "error");
    });
}

// 2. FILTRADO LOCAL DE ACTIVIDADES
selectAltaArea.addEventListener('change', () => {
    const areaSeleccionada = selectAltaArea.value;
    if (!areaSeleccionada) {
        selectAltaActividad.innerHTML = '<option value="">-- Selecciona primero un área --</option>';
        calcularCodigoQR();
        return;
    }

    const registrosDelArea = usuariosBaseDatosCache.filter(u => u.area && u.area.toString().trim().toUpperCase() === areaSeleccionada.toUpperCase());
    let actividadesUnicas = [];
    registrosDelArea.forEach(r => {
        let act = r.actividades ? r.actividades.toString().trim() : "";
        if (act && actividadesUnicas.indexOf(act) === -1) actividadesUnicas.push(act);
    });
    actividadesUnicas.sort();

    selectAltaActividad.innerHTML = '<option value="">-- Selecciona una actividad --</option>';
    if (actividadesUnicas.length === 0) {
        const op = document.createElement('option'); op.value = "General"; op.innerText = "General"; selectAltaActividad.appendChild(op);
    } else {
        actividadesUnicas.forEach(act => {
            const op = document.createElement('option'); op.value = act; op.innerText = act; selectAltaActividad.appendChild(op);
        });
    }
    
    // Ejecutar el cálculo cada vez que el área cambie
    calcularCodigoQR();
});

// 3. LOGICA CONSTRUCTORA AUTOMÁTICA DEL CÓDIGO QR
function calcularCodigoQR() {
    // A. Obtener mes y día actual (Siempre 2 dígitos cada uno)
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const prefijoFecha = mes + dia; // Ej: "0312"

    // Función interna para limpiar acentos y dejar letras limpias en mayúsculas
    const limpiarTexto = (t) => {
        return t.toUpperCase().trim()
                .replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E")
                .replace(/[ÍÌÏÎ]/g, "I").replace(/[ÓÒÖÔ]/g, "O")
                .replace(/[ÚÙÜÛ]/g, "U").replace(/[^A-Z0-9]/g, "");
    };

    // B. Extraer las primeras 3 letras de los textos o rellenar con 'X' si no se ha escrito completo
    const pat = limpiarTexto(inputPaterno.value).substring(0, 3).padEnd(3, 'X');
    const mat = limpiarTexto(inputMaterno.value).substring(0, 3).padEnd(3, 'X');
    const area = limpiarTexto(selectAltaArea.value).substring(0, 3).padEnd(3, 'X');

    // C. Extraer los últimos 4 dígitos numéricos de la matrícula
    const matriculaLimpia = inputMatricula.value.replace(/[^0-9]/g, ""); // Solo números
    const ultimosCuatroMatricula = matriculaLimpia.substring(matriculaLimpia.length - 4).padStart(4, '0');

    // D. Armar cadena final: MMDD + PATERNO(3) + AREA(3) + MATERNO(3) + MATRICULA(4)
    if(inputPaterno.value || inputMaterno.value || selectAltaArea.value || inputMatricula.value) {
        inputIdQR.value = `${prefijoFecha}${pat}${area}${mat}${ultimosCuatroMatricula}`;
    } else {
        inputIdQR.value = "";
    }
}

// Escuchas para calcular el código en tiempo real mientras el usuario escribe
inputPaterno.addEventListener('input', calcularCodigoQR);
inputMaterno.addEventListener('input', calcularCodigoQR);
inputMatricula.addEventListener('input', calcularCodigoQR);

// 4. ENVÍO DE DATOS COMPLETO AL SERVIDOR
formAlta.addEventListener('submit', (e) => {
    e.preventDefault(); 

    mostrarMensaje("Registrando usuario en la base de datos... ⏳", "info");

    const nuevoUsuario = {
        accion: "registrarNuevoUsuario",
        password: adminPasswordCache, 
        id: inputIdQR.value,
        nombre: document.getElementById('txt-nombre').value.trim(),
        paterno: inputPaterno.value.trim(),
        materno: inputMaterno.value.trim(),
        area: selectAltaArea.value,          
        actividad: selectAltaActividad.value, 
        matricula: inputMatricula.value.trim(),
        correoEdu: document.getElementById('txt-correo-edu').value.trim(),
        correoAlt: document.getElementById('txt-correo-alt').value.trim(),
        asignados: parseInt(document.getElementById('num-asignados').value) || 0,
        estatus: document.getElementById('select-estatus').value
    };

    fetch(scriptURL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify(nuevoUsuario)
    })
    .then(res => res.text())
    .then(respuesta => {
        if (respuesta === "REGISTRO_EXITOSO") {
            mostrarMensaje("✅ ¡Usuario registrado exitosamente en la Base de Datos!", "success");
            usuariosBaseDatosCache.push({ area: nuevoUsuario.area, actividades: nuevoUsuario.actividad });
            formAlta.reset(); 
            document.getElementById('num-asignados').value = "20";
            selectAltaActividad.innerHTML = '<option value="">-- Selecciona primero un área --</option>';
        } else if (respuesta === "CONTRASEÑA_INCORRECTA") {
            alert("❌ Contraseña inválida.");
            formAlta.style.display = "none";
            bloqueCandado.style.display = "block";
            adminPasswordCache = "";
            mostrarMensaje("⚠️ Acceso revocado.", "error");
        } else if (respuesta === "ID_DUPLICADO") {
            mostrarMensaje("⚠️ El Código / ID QR ya existe en el sistema.", "error");
        } else {
            mostrarMensaje("Error: " + respuesta, "error");
        }
    })
    .catch(err => {
        console.error(err);
        mostrarMensaje("❌ Error crítico de red.", "error");
    });
});

function mostrarMensaje(texto, clase) {
    statusMessage.innerText = texto; statusMessage.className = ""; statusMessage.classList.add(clase); statusMessage.style.display = "block";
}