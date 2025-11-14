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

const firebaseConfig = {
  // !! REEMPLAZA ESTO CON TU CONFIGURACIÓN REAL !!
  const firebaseConfig = {
 apiKey: "AIzaSyAv3gGv-t00ZxNC8678xYCbBdIRPEjW9TY",
 authDomain: "neonacimientos.firebaseapp.com",
 projectId: "neonacimientos",
 storageBucket: "neonacimientos.firebasestorage.app",
 messagingSenderId: "543451053150",
 appId: "1:543451053150:web:ae78f34c7fbcc0b6a348cf"
};"
  // !! FIN DE LA ZONA DE REEMPLAZO !!
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
        if (configToUse.apiKey === "TU_API_KEY_VA_AQUI") {
            throw new Error("Configuración de Firebase no reemplazada.");
        }

        const app = initializeApp(configToUse);
        db = getFirestore(app);
        auth = getAuth(app);
        
        setLogLevel('Debug'); // Útil para depurar

        // Autenticación (con token si existe, sino an
