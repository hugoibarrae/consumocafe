// =========================================================================
// CONFIGURACIÓN CENTRALIZADA DEL MENÚ (Agrega o quita opciones aquí fácilmente)
// =========================================================================
const opcionesMenu = [
    {
        id: "buscar",
        titulo: "Buscar Personal",
        descripcion: "Consulta saldos, cambia estatus y envía códigos QR por Correo o WhatsApp.",
        icono: "🔍",
        enlace: "buscar.html" // URL a la que redirige
    },
    {
        id: "registro",
        titulo: "Nuevo Registro",
        descripcion: "Da de alta personal con generación automática de ID QR y catálogo dinámico.",
        icono: "📝",
        enlace: "registro.html"
    },
    {
        id: "scanner",
        titulo: "Escanear Código QR",
        descripcion: "Cámara del escáner en tiempo real para la validación y rebaje de vales.",
        icono: "📷",
        enlace: "index.html"
    }
    /* Pistas para el futuro: Para agregar más opciones en el mañana, simplemente descomenta esto:
    ,{
        id: "reportes",
        titulo: "Reportes e Historial",
        descripcion: "Descarga de archivos CSV de consumos y envíos diarios automáticos.",
        icono: "📊",
        enlace: "reportes.html"
    }
    */
];

// =========================================================================
// RENDERIZADOR DINÁMICO DEL MENÚ
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("contenedor-menu");
    contenedor.innerHTML = ""; // Limpiar contenedor

    opcionesMenu.forEach(opcion => {
        // Creamos la etiqueta de enlace interactiva
        const botonMenu = document.createElement("a");
        botonMenu.href = opcion.enlace;
        botonMenu.className = "menu-item";
        botonMenu.id = `btn-menu-${opcion.id}`;

        // Inyectamos la estructura modular responsiva
        botonMenu.innerHTML = `
            <div class="menu-icon">${opcion.icono}</div>
            <div class="menu-text">
                <span class="menu-title">${opcion.titulo}</span>
                <span class="menu-desc">${opcion.descripcion}</span>
            </div>
            <div class="menu-arrow">❯</div>
        `;

        // Si prefieres que en lugar de cambiar de página ejecute una función de JavaScript en la misma hoja:
        /*
        botonMenu.addEventListener("click", (e) => {
            e.preventDefault();
            console.log(`Cargando módulo: ${opcion.id}`);
            // Aquí puedes llamar a una función personalizada de tu arquitectura SPA
        });
        */

        contenedor.appendChild(botonMenu);
    });
});