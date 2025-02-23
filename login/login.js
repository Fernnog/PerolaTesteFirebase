// ==== INÍCIO SEÇÃO - IMPORTS FIREBASE SDKS ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// ==== FIM SEÇÃO - IMPORTS FIREBASE SDKS ====

// ==== INÍCIO SEÇÃO - CONFIGURAÇÃO FIREBASE ====
const firebaseConfig = {
    apiKey: "AIzaSyAydkMsxydduoAFD9pdtg_KIFuckA_PIkE",
    authDomain: "precificacao-64b06.firebaseapp.com",
    databaseURL: "https://precificacao-64b06-default-rtdb.firebaseio.com",
    projectId: "precificacao-64b06",
    storageBucket: "precificacao-64b06.firebasestorage.app",
    messagingSenderId: "872035099760",
    appId: "1:872035099760:web:1c1c7d2ef0f442b366c0b5",
    measurementId: "G-6THHCNMHD6"
};
// ==== FIM SEÇÃO - CONFIGURAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - INICIALIZAÇÃO FIREBASE ====
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); // Certifique-se de ter o Firestore aqui, se precisar dele no futuro
const auth = getAuth(app);
// ==== FIM SEÇÃO - INICIALIZAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE (login.js) ====
async function registrarUsuario(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Registro bem-sucedido.';
        document.getElementById('auth-message').style.color = 'green';
        // Redireciona para a página principal após o registro
        window.location.href = "../precificacao.html";
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        document.getElementById('auth-message').textContent = 'Erro ao registrar usuário: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}

async function loginUsuario(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Login bem-sucedido.';
        document.getElementById('auth-message').style.color = 'green';
        // Redireciona para a página principal após o login
        window.location.href = "../precificacao.html";
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        document.getElementById('auth-message').textContent = 'Erro ao fazer login: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}

async function enviarEmailRedefinicaoSenha(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        document.getElementById('auth-message').textContent = 'Email de redefinição de senha enviado.';
        document.getElementById('auth-message').style.color = 'blue';
    } catch (error) {
        console.error("Erro ao enviar email de redefinição de senha:", error);
        document.getElementById('auth-message').textContent = 'Erro ao enviar email de redefinição de senha: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}
// ==== FIM SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE (login.js) ====

// ==== INÍCIO SEÇÃO - EVENT LISTENERS (login.js) ====
document.addEventListener('DOMContentLoaded', () => {

    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            registrarUsuario(emailInput.value, passwordInput.value);
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginUsuario(emailInput.value, passwordInput.value);
        });
    }

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', () => {
            enviarEmailRedefinicaoSenha(emailInput.value);
        });
    }
});
// ==== FIM SEÇÃO - EVENT LISTENERS (login.js) ====
