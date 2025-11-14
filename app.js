import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    onSnapshot,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// ----- Lógica de Modales (Definida primero para evitar errores) -----
        
const messageModal = document.getElementById('messageModal');
const messageTitle = document.getElementById('messageTitle');
const messageBody = document.getElementById('messageBody');
const messageOk = document.getElementById('messageOk');

function showMessage(title, body) {
    messageTitle.textContent = title;
    messageBody.textContent = body;
    messageModal.classList.remove('hidden');
    setTimeout(() => messageModal.classList.remove('opacity-0'), 10);
    setTimeout(() => messageModal.querySelector('.modal-content').classList.remove('scale-95'), 10);
}
messageOk.onclick = () => {
    messageModal.classList.add('opacity-0');
    messageModal.querySelector('.modal-content').classList.add('scale-95');
    setTimeout(() => messageModal.classList.add('hidden'), 300);
};

const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmBody = document.getElementById('confirmBody');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');
let confirmPromiseResolve = null;

function showConfirm(title, body) {
    confirmTitle.textContent = title;
    confirmBody.textContent = body;
    confirmModal.classList.remove('hidden');
    setTimeout(() => confirmModal.classList.remove('opacity-0'), 10);
    setTimeout(() => confirmModal.querySelector('.modal-content').classList.remove('scale-95'), 10);

    return new Promise((resolve) => {
        confirmPromiseResolve = resolve;
    });
}
confirmCancel.onclick = () => {
    confirmModal.classList.add('opacity-0');
    confirmModal.querySelector('.modal-content').classList.add('scale-95');
    setTimeout(() => confirmModal.classList.add('hidden'), 300);
    if (confirmPromiseResolve) confirmPromiseResolve(false);
};
confirmOk.onclick = () => {
    confirmModal.classList.add('opacity-0');
    confirmModal.querySelector('.modal-content').classList.add('scale-95');
    setTimeout(() => confirmModal.classList.add('hidden'), 300);
    if (confirmPromiseResolve) confirmPromiseResolve(true);
};

// ===================================================================
// !!!!! ¡¡ATENCIÓN!! LEER ESTO PARA IMPLEMENTAR EN TU SERVIDOR !!!!!
// ===================================================================
//
// La configuración de Firebase (`firebaseConfig`) que ves abajo es
// SÓLO UN EJEMPLO y no funcionará.
//
// PASO 1: VE A https://firebase.google.com/ Y CREA UN NUEVO PROYECTO.
//
// PASO 2: EN TU PROYECTO, CREA UNA "WEB APP" Y COPIA EL OBJETO
//         `firebaseConfig` QUE TE DARÁN.
//
// PASO 3: REEMPLAZA EL BLOQUE `firebaseConfig` DE EJEMPLO DE AQUÍ ABAJO
//         CON EL TUYO REAL.
//
// !!!!! PEGA TU CÓDIGO DE FIREBASE AQUÍ ABAJO !!!!!
// ===================================================================

// --- ¡¡¡ESTE BLOQUE ESTÁ CORREGIDO!!! ---
// REEMPLAZÁ ESTO CON TUS DATOS REALES DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAv3gGv-t00ZxNC8678xYCbBdIRPEjW9TY",
  authDomain: "neonacimientos.firebaseapp.com",
  projectId: "neonacimientos",
  storageBucket: "neonacimientos.firebasestorage.app",
  messagingSenderId: "543451053150",
  appId: "1:543451053150:web:ae78f34c7fbcc0b6a348cf"
};

// ===================================================================
// !!!!! ¡¡ATENCIÓN!! PASO FINAL DE SEGURIDAD (MUY IMPORTANTE) !!!!!
// ===================================================================
//
// PASO 4: EN TU PANEL DE FIREBASE, VE A Firestore Database -> Rules (Reglas).
//
// PASO 5: REEMPLAZA LAS REGLAS QUE VEAS CON ESTAS:
/*
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Permitir que CUALQUIER USUARIO AUTENTICADO lea o escriba 
        // en la colección de pacientes.
        match /pacientes/{pacienteId} {
          allow read, write: if request.auth != null;
        }
      }
    }
*/
//
// PASO 6: PRESIONA "PUBLICAR".
//
// SI NO HACES ESTOS PASOS, LA APP MOSTRARÁ EL "ERROR CRÍTICO".
// ===================================================================


// ----- Variables Globales -----
let db, auth;
let pacientesCache = []; // Caché para guardar todos los pacientes
let vistaActualPacientes = []; // Para la exportación filtrada
const coleccionPacientes = "pacientes";
const loadingIndicator = document.getElementById('loadingIndicator');

// ----- Lógica de Pestañas -----
const tabButtons = [
    { btn: document.getElementById('tab-ingreso-btn'), content: document.getElementById('tab-ingreso-content') },
    { btn: document.getElementById('tab-consulta-btn'), content: document.getElementById('tab-consulta-content') }
];

tabButtons.forEach(tab => {
    tab.btn.addEventListener('click', () => {
        // Ocultar todo
        tabButtons.forEach(t => {
            t.content.classList.add('hidden');
            t.btn.classList.remove('active-tab');
            t.btn.classList.add('inactive-tab');
            t.btn.classList.remove('border-b-2', 'border-teal-700', '-mb-px', 'text-teal-700', 'font-semibold');
            t.btn.classList.add('text-gray-500', 'hover:text-teal-700');
        });
        // Mostrar activo
        tab.content.classList.remove('hidden');
        tab.btn.classList.add('active-tab');
        tab.btn.classList.remove('inactive-tab');
        tab.btn.classList.add('border-b-2', 'border-teal-700', '-mb-px', 'text-teal-700', 'font-semibold');
    });
});

// ----- Inicialización de Firebase -----
async function initFirebase() {
    try {
        // Usar configuración mágica si existe, sino la manual
        const configToUse = typeof __firebase_config !== 'undefined' 
            ? JSON.parse(__firebase_config) 
            : firebaseConfig;

        // Validar que la configuración manual no sea la de ejemplo
        if (configToUse.apiKey === "TU_API_KEY_REAL") {
            throw new Error("Configuración de Firebase no reemplazada. Pegá tus datos reales en el objeto firebaseConfig.");
        }

        const app = initializeApp(configToUse);
        db = getFirestore(app);
        auth = getAuth(app);
        
        setLogLevel('Debug'); // Útil para depurar

        // Autenticación (con token si existe, sino anónimo)
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        
        console.log("Firebase inicializado y autenticado.");
        return true;

    } catch (error) {
        console.error("Error crítico al inicializar Firebase:", error);
        showMessage("Error Crítico", "No se pudo inicializar la aplicación. Verifique la configuración de Firebase en el código. (Error: " + error.message + ")");
        loadingIndicator.textContent = "Error al cargar. Verifique la configuración.";
        return false;
    }
}

// ----- Lógica de Formulario de Ingreso -----
const formIngreso = document.getElementById('formIngreso');
formIngreso.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardar');
    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        const formData = new FormData(formIngreso);
        const data = Object.fromEntries(formData.entries());
        
        // --- 1. VALIDACIÓN DE CAMPOS OBLIGATORIOS ---
        if (!data.apellido || !data.nombre || !data.fechaNacimiento) {
            // Si falta un campo, mostramos error y detenemos todo.
            showMessage("Error de Validación", "Apellido, Nombre y Fecha de Nacimiento no pueden estar vacíos.");
            btn.disabled = false;
            btn.textContent = "Guardar Paciente";
            return; // Detiene la ejecución de la función
        }

        // --- 2. VALIDACIÓN Y CONVERSIÓN DE NÚMEROS ---
        const camposNumericos = ['pesoNacer', 'talla', 'perimetroCefalico', 'edadGestacional', 'apgar1', 'apgar5', 'edadMaterna', 'gestas', 'partos', 'controles'];
        
        for (const campo of camposNumericos) {
            if (data[campo]) { // Si el campo NO está vacío
                const valorNum = parseFloat(data[campo]);
                if (isNaN(valorNum)) {
                    // ¡Error! El usuario escribió texto (ej: "mil")
                    showMessage("Error de Validación", `El campo '${campo}' debe ser un número. Ingresaste: '${data[campo]}'`);
                    btn.disabled = false;
                    btn.textContent = "Guardar Paciente";
                    return; // Detiene la ejecución
                }
                data[campo] = valorNum; // Guardamos el número limpio (ej: 1500)
            } else {
                data[campo] = null; // Si estaba vacío, lo guardamos como 'null' en la base de datos
            }
        }
        
        // Recolectar diagnósticos
        const diagnosticos = [];
        formIngreso.querySelectorAll('input[name="diagnostico"]:checked').forEach(cb => {
            diagnosticos.push(cb.value);
        });
        data.diagnosticos = diagnosticos; // Guardar como array

        // Limpiar 'diagnostico' individual que FormData toma por error
        delete data.diagnostico;

        // Añadir timestamp
        data.createdAt = new Date().toISOString();

        await addDoc(collection(db, coleccionPacientes), data);
        
        showMessage("Éxito", "Paciente guardado correctamente.");
        formIngreso.reset();
        // Cerrar menús desplegables
        formIngreso.querySelectorAll('details').forEach(d => d.removeAttribute('open'));

    } catch (error) {
        console.error("Error al guardar:", error);
        showMessage("Error", "No se pudo guardar el paciente. " + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar Paciente";
    }
});

// ----- Lógica de Consulta y Búsqueda -----
        
// Escuchar cambios en tiempo real
function escucharPacientes() {
    loadingIndicator.textContent = "Cargando pacientes...";
    const q = query(collection(db, coleccionPacientes));
    
    onSnapshot(q, (snapshot) => {
        pacientesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        pacientesCache.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Más nuevos primero
        loadingIndicator.textContent = "";
        
        // ==========================================================
        // ===== ¡¡¡AQUÍ ESTÁ LA CORRECCIÓN!!! =====
        // Antes decía: renderTablaResultados([]);
        // Ahora, carga todos los pacientes al inicio.
        renderTablaResultados(pacientesCache); 
        // ==========================================================
        
        console.log(`Caché actualizado: ${pacientesCache.length} pacientes.`);
        
    }, (error) => {
        console.error("Error al escuchar pacientes:", error);
        loadingIndicator.textContent = "Error al cargar datos.";
        showMessage("Error de Carga", "No se pudieron cargar los datos en tiempo real. " + error.message);
    });
}

// Renderizar la tabla
function renderTablaResultados(pacientes) {
    vistaActualPacientes = pacientes; // Actualizar vista para exportación
    const container = document.getElementById('resultadosContainer');
    
    if (pacientes.length === 0) {
        // Si no hay pacientes EN EL FILTRO, muestra esto
        container.innerHTML = '<p class="text-center text-gray-500 py-4">No se encontraron resultados para esta búsqueda.</p>';
        return;
    }

    let tableHtml = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col" class="table-header">Apellido y Nombre</th>
                    <th scope="col" class="table-header">Fecha Nac.</th>
                    <th scope="col" class="table-header">Peso (gr)</th>
                    <th scope="col" class="table-header">EG (sem)</th>
                    <th scope="col" class="table-header">Diagnósticos</th>
                    <th scope="col" class="table-header">Acciones</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    pacientes.forEach(p => {
        const diagnosticos = Array.isArray(p.diagnosticos) ? p.diagnosticos.join(', ') : (p.diagnosticoOtros || 'N/A');
        tableHtml += `
            <tr>
                <td class="table-cell">${p.apellido || ''}, ${p.nombre || ''}</td>
                <td class="table-cell">${p.fechaNacimiento || 'N/A'}</td>
                <td class="table-cell">${p.pesoNacer || 'N/A'}</td>
                <td class="table-cell">${p.edadGestacional || 'N/A'}</td>
                <td class="table-cell">${diagnosticos}</td>
                <td class="table-cell space-x-2">
                    <button class="btn-edit" data-id="${p.id}">Editar</button>
                    <button class="btn-delete" data-id="${p.id}">Borrar</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;

    // Añadir listeners a los botones de la tabla
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEdicion(btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => borrarPaciente(btn.dataset.id));
    });
}

// Lógica de botones de búsqueda
const btnBuscar = document.getElementById('btnBuscar');
const btnLimpiar = document.getElementById('btnLimpiar');
        
btnBuscar.addEventListener('click', () => {
    const apellido = document.getElementById('buscarApellido').value.toLowerCase().trim();
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;

    let filtrados = pacientesCache;

    if (apellido) {
        filtrados = filtrados.filter(p => p.apellido && p.apellido.toLowerCase().includes(apellido));
    }
    if (fechaDesde) {
        filtrados = filtrados.filter(p => p.fechaNacimiento && p.fechaNacimiento >= fechaDesde);
    }
    if (fechaHasta) {
        filtrados = filtrados.filter(p => p.fechaNacimiento && p.fechaNacimiento <= fechaHasta);
    }
    
    // Si no hay filtros, mostrar todos
    if (!apellido && !fechaDesde && !fechaHasta) {
         filtrados = [...pacientesCache];
    }

    renderTablaResultados(filtrados);
});

btnLimpiar.addEventListener('click', () => {
    document.getElementById('buscarApellido').value = '';
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';
    
    // Al limpiar, mostramos todos los pacientes de nuevo
    renderTablaResultados(pacientesCache); 
});


// ----- Lógica de Edición y Borrado -----
        
const editModal = document.getElementById('editModal');
const modalContent = editModal.querySelector('.modal-content');

function abrirModalEdicion(id) {
    const paciente = pacientesCache.find(p => p.id === id);
    if (!paciente) return;

    // Rellenar el formulario de edición
    document.getElementById('editDocId').value = paciente.id;
    document.getElementById('editApellido').value = paciente.apellido || '';
    document.getElementById('editNombre').value = paciente.nombre || '';
    document.getElementById('editFechaNacimiento').value = paciente.fechaNacimiento || '';
    document.getElementById('editHoraNacimiento').value = paciente.horaNacimiento || '';
    document.getElementById('editEdadMaterna').value = paciente.edadMaterna || '';
    document.getElementById('editGestas').value = paciente.gestas || '';
    document.getElementById('editPartos').value = paciente.partos || '';
    document.getElementById('editControlada').value = paciente.controlada || '';
    document.getElementById('editControles').value = paciente.controles || '';
    
    // Serología
    document.getElementById('editFechaVDRL').value = paciente.fechaVDRL || '';
    document.getElementById('editResultadoVDRL').value = paciente.resultadoVDRL || '';
    document.getElementById('editFechaHIV').value = paciente.fechaHIV || '';
    document.getElementById('editResultadoHIV').value = paciente.resultadoHIV || '';
    document.getElementById('editFechaChagas').value = paciente.fechaChagas || '';
    document.getElementById('editResultadoChagas').value = paciente.resultadoChagas || '';
    document.getElementById('editFechaHBV').value = paciente.fechaHBV || '';
    document.getElementById('editResultadoHBV').value = paciente.resultadoHBV || '';
    document.getElementById('editFechaToxo').value = paciente.fechaToxo || '';
    document.getElementById('editResultadoToxo').value = paciente.resultadoToxo || '';
    document.getElementById('editFechaCMV').value = paciente.fechaCMV || '';
    document.getElementById('editResultadoCMV').value = paciente.resultadoCMV || '';
    document.getElementById('editNotasSerologia').value = paciente.notasSerologia || '';

    // Nacimiento
    document.getElementById('editPesoNacer').value = paciente.pesoNacer || '';
    document.getElementById('editTalla').value = paciente.talla || '';
    document.getElementById('editPerimetroCefalico').value = paciente.perimetroCefalico || '';
    document.getElementById('editEdadGestacional').value = paciente.edadGestacional || '';
    document.getElementById('editApgar1').value = paciente.apgar1 || '';
    document.getElementById('editApgar5').value = paciente.apgar5 || '';
    document.getElementById('editTipoNacimiento').value = paciente.tipoNacimiento || '';

    // Grupo
    document.getElementById('editGrupoMaterno').value = paciente.grupoMaterno || '';
    document.getElementById('editRhMaterno').value = paciente.rhMaterno || '';
    document.getElementById('editGrupoPaciente').value = paciente.grupoPaciente || '';
    document.getElementById('editRhPaciente').value = paciente.rhPaciente || '';

    // Diagnóstico y Evolución
    document.getElementById('editEvolucion').value = paciente.evolucion || '';
    document.getElementById('editNotas').value = paciente.notas || '';
    document.getElementById('editDiagnosticoOtros').value = paciente.diagnosticoOtros || '';

    // Diagnósticos (Checkboxes)
    const checks = document.querySelectorAll('input[name="editDiagnostico"]');
    checks.forEach(cb => cb.checked = false); // Limpiar
    if (Array.isArray(paciente.diagnosticos)) {
        paciente.diagnosticos.forEach(diag => {
            const cb = document.querySelector(`input[name="editDiagnostico"][value="${diag}"]`);
            if (cb) cb.checked = true;
        });
    }

    // Mostrar modal
    editModal.classList.remove('hidden');
    setTimeout(() => editModal.classList.remove('opacity-0'), 10);
    setTimeout(() => modalContent.classList.remove('opacity-0', 'scale-95'), 10);
}

document.getElementById('btnCerrarModal').addEventListener('click', () => {
    editModal.classList.add('opacity-0');
    modalContent.classList.add('opacity-0', 'scale-95');
    setTimeout(() => editModal.classList.add('hidden'), 300);
});

// --- ESTA FUNCIÓN ESTÁ ACTUALIZADA Y CORREGIDA ---
document.getElementById('btnActualizar').addEventListener('click', async () => {
    const btn = document.getElementById('btnActualizar');
    btn.disabled = true;
    btn.textContent = "Validando...";

    try {
        const formEdicion = document.getElementById('formEdicion');
        const formData = new FormData(formEdicion);
        const dataForm = Object.fromEntries(formData.entries()); // Datos del form (ej: 'editApellido')
        const docId = dataForm.editDocId;

        // --- 1. VALIDACIÓN CAMPOS OBLIGATORIOS ---
        if (!dataForm.editApellido || !dataForm.editNombre || !dataForm.editFechaNacimiento) {
            throw new Error("Apellido, Nombre y Fecha de Nacimiento no pueden estar vacíos.");
        }

        // --- 2. CREAR OBJETO LIMPIO (CORRIGE EL BUG) ---
        // (Esto convierte 'editApellido' en 'apellido', etc.)
        const dataParaActualizar = {}; // Objeto limpio para Firebase
        for (const key in dataForm) {
            if (key.startsWith('edit')) {
                const newKey = key.substring(4); // "editApellido" -> "Apellido"
                const lowerKey = newKey.charAt(0).toLowerCase() + newKey.slice(1); // "Apellido" -> "apellido"
                dataParaActualizar[lowerKey] = dataForm[key];
            }
        }

        // --- 3. VALIDACIÓN Y CONVERSIÓN DE NÚMEROS ---
        const camposNumericos = ['pesoNacer', 'talla', 'perimetroCefalico', 'edadGestacional', 'apgar1', 'apgar5', 'edadMaterna', 'gestas', 'partos', 'controles'];
        for (const campo of camposNumericos) {
            if (dataParaActualizar[campo]) { // Si el campo tiene *algo* escrito
                const valorNum = parseFloat(dataParaActualizar[campo]);
                if (isNaN(valorNum)) {
                    throw new Error(`El campo '${campo}' debe ser un número. Ingresaste: '${dataParaActualizar[campo]}'`);
                }
                dataParaActualizar[campo] = valorNum; // Guardamos el número limpio
            } else {
                dataParaActualizar[campo] = null; // Si está vacío, guardamos null
            }
        }

        // --- 4. MANEJAR DIAGNÓSTICOS ---
        const diagnosticos = [];
        formEdicion.querySelectorAll('input[name="editDiagnostico"]:checked').forEach(cb => {
            diagnosticos.push(cb.value);
        });
        dataParaActualizar.diagnosticos = diagnosticos;
        
        // Limpiamos campos que no van a la DB
        delete dataParaActualizar.diagnostico;

        // --- 5. ACTUALIZAR EN FIREBASE ---
        btn.textContent = "Actualizando...";
        if (!docId) throw new Error("ID de documento no encontrado.");
        
        const docRef = doc(db, coleccionPacientes, docId);
        await updateDoc(docRef, dataParaActualizar); // ¡Usamos el objeto limpio!

        showMessage("Éxito", "Paciente actualizado.");
        document.getElementById('btnCerrarModal').click(); // Cerrar modal

        // Forzar re-renderizado de la búsqueda actual
        btnBuscar.click();

    } catch (error) {
        console.error("Error al actualizar:", error);
        // Usamos throw new Error() en las validaciones, así todos los errores caen aquí
        showMessage("Error", "No se pudo actualizar: " + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Actualizar";
    }
});

async function borrarPaciente(id) {
    const confirmado = await showConfirm("Confirmar Borrado", "¿Estás seguro de que deseas borrar este paciente? Esta acción no se puede deshacer.");
    
    if (confirmado) {
        try {
            await deleteDoc(doc(db, coleccionPacientes, id));
            showMessage("Éxito", "Paciente borrado.");
            // Forzar re-renderizado de la búsqueda actual
            btnBuscar.click();
        } catch (error) {
            console.error("Error al borrar:", error);
            showMessage("Error", "No se pudo borrar el paciente. " + error.message);
        }
    }
}


// ----- Lógica de Exportación a CSV -----

function exportarACSV(pacientes, nombreArchivo) {
    if (pacientes.length === 0) {
        showMessage("Exportar", "No hay datos para exportar.");
        return;
    }

    // Crear encabezados dinámicamente desde el primer objeto
    const primerPaciente = pacientes[0];
    let headers = Object.keys(primerPaciente);
    
    // Filtrar claves no deseadas (como 'id' o 'createdAt')
    headers = headers.filter(h => h !== 'id' && h !== 'createdAt');
    // Poner claves importantes primero
    const ordenColumnas = [
        'apellido', 'nombre', 'fechaNacimiento', 'horaNacimiento', 'pesoNacer', 'talla', 'perimetroCefalico', 'edadGestacional', 
        'apgar1', 'apgar5', 'tipoNacimiento', 'evolucion', 'diagnosticos', 'diagnosticoOtros', 'notas',
        'edadMaterna', 'gestas', 'partos', 'controlada', 'controles',
        'grupoMaterno', 'rhMaterno', 'grupoPaciente', 'rhPaciente',
        'fechaVDRL', 'resultadoVDRL', 'fechaHIV', 'resultadoHIV', 'fechaChagas', 'resultadoChagas',
        'fechaHBV', 'resultadoHBV', 'fechaToxo', 'resultadoToxo', 'fechaCMV', 'resultadoCMV', 'notasSerologia'
    ];
    
    // Combinar orden deseado con claves restantes
    const headersOrdenados = [...ordenColumnas, ...headers.filter(h => !ordenColumnas.includes(h))];

    let csvContent = headersOrdenados.join(';') + '\n'; // Usar punto y coma para Excel en español

    pacientes.forEach(p => {
        const fila = headersOrdenados.map(header => {
            let valor = p[header];
            if (valor === undefined || valor === null) {
                return '';
            }
            if (Array.isArray(valor)) {
                return `"${valor.join(', ')}"`; // Manejar arrays (ej. diagnósticos)
            }
            if (typeof valor === 'string') {
                // Escapar comillas dobles y strings que contienen el separador
                valor = valor.replace(/"/g, '""');
                if (valor.includes(';') || valor.includes('\n') || valor.includes(',')) {
                    return `"${valor}"`;
                }
            }
            return valor;
        });
        csvContent += fila.join(';') + '\n';
    });

    // Crear y descargar el archivo
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF para BOM (Byte Order Mark)
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${nombreArchivo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

document.getElementById('btnExportarFiltrado').addEventListener('click', () => {
    exportarACSV(vistaActualPacientes, 'pacientes_filtrados');
});

document.getElementById('btnExportarTodo').addEventListener('click', () => {
    exportarACSV(pacientesCache, 'pacientes_todos');
});


// ----- Punto de Entrada Principal -----
(async () => {
    const firebaseListo = await initFirebase();
    if (firebaseListo) {
        escucharPacientes();
    }
})();
