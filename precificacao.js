// ==== INÍCIO - Configuração e Inicialização do Firebase (SDK Modular) ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Suas configurações do Firebase - **SUBSTITUÍDO COM OS DADOS FORNECIDOS**
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

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Inicializar o Firebase Analytics (opcional)
const db = getFirestore(app); // Inicializar o Firestore
const auth = getAuth(app); // Inicializar o Firebase Auth

// ==== FIM - Configuração e Inicialização do Firebase ====

// ==== INÍCIO - VARIÁVEIS GLOBAIS ====
let materiais = [];
let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
let custosIndiretosPredefinidosBase = [
    { descricao: "Energia elétrica", valorMensal: 0 },
    { descricao: "Água", valorMensal: 0 },
    { descricao: "Gás", valorMensal: 0 },
    { descricao: "Aluguel do espaço", valorMensal: 0 },
    { descricao: "Depreciação de máquinas e equipamentos", valorMensal: 0 },
    { descricao: "Manutenção predial e de equipamentos", valorMensal: 0 },
    { descricao: "Despesas com segurança", valorMensal: 0 },
    { descricao: "Limpeza e conservação", valorMensal: 0 },
    { descricao: "Material de escritório", valorMensal: 0 },
    { descricao: "Impostos e taxas indiretos", valorMensal: 0 },
    { descricao: "Marketing institucional", valorMensal: 0 },
    { descricao: "Transporte e logística", valorMensal: 0 },
    { descricao: "Despesas com utilidades", valorMensal: 0 },
    { descricao: "Demais custos administrativos", valorMensal: 0 }
];
let custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase));
let custosIndiretosAdicionais = [];
let produtos = [];
let modoEdicaoMaoDeObra = false;
let itemEdicaoCustoIndireto = null;
let novoCustoIndiretoCounter = 0;
let taxaCredito = { percentual: 5, incluir: false };
let margemLucroPadrao = 50;
let precificacoesGeradas = [];
let proximoNumeroPrecificacao = 1;
let produtoEmEdicao = null;
let usuarioLogado = null;

// ==== FIM - VARIÁVEIS GLOBAIS ====

// *** FUNÇÃO MOSTRAR SUBMENU - Assegure-se que está *fora* do document ready e no escopo global ***
function mostrarSubMenu(submenuId) {
    const conteudos = ['materiais-insumos', 'mao-de-obra', 'custos-indiretos', 'produtos-cadastrados', 'calculo-precificacao', 'precificacoes-geradas'];
    conteudos.forEach(id => document.getElementById(id).style.display = 'none');
    document.getElementById(submenuId).style.display = 'block';
}

function formatarMoeda(valor) {
    if (typeof valor !== 'number') return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function limparFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}

function calcularCustoTotalItem(item) {
    let custoTotal = 0;
    if (item.tipo === "comprimento") custoTotal = item.material.custoUnitario * (item.comprimento / 100);
    else if (item.tipo === "area") custoTotal = item.material.custoUnitario * (item.largura * item.altura / 10000);
    else if (item.tipo === "litro") custoTotal = item.material.custoUnitario * (item.volume / 1000);
    else if (item.tipo === "quilo") custoTotal = item.material.custoUnitario * (item.peso / 1000);
    else if (item.tipo === "unidade") custoTotal = item.material.custoUnitario * item.quantidade;
    return custoTotal;
}


// ==== INÍCIO - FUNÇÕES DE AUTENTICAÇÃO ====
async function registrarUsuario(email, password) { /* ... Funções de Autenticação ... */ }
async function loginUsuario(email, password) { /* ... Funções de Autenticação ... */ }
async function logoutUsuario() { /* ... Funções de Autenticação ... */ }
async function enviarEmailRedefinicaoSenha(email) { /* ... Funções de Autenticação ... */ }
function atualizarInterfaceUsuario(user) { /* ... Funções de Autenticação ... */ }
// *** Copie e cole AQUI as funções de autenticação COMPLETAS do código anterior ***
// *** (registrarUsuario, loginUsuario, logoutUsuario, enviarEmailRedefinicaoSenha, atualizarInterfaceUsuario) ***
// *** para garantir que não faltam implementações. ***
async function registrarUsuario(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Registro bem-sucedido. Usuário logado.';
        document.getElementById('auth-message').style.color = 'green';
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        document.getElementById('auth-message').textContent = 'Erro ao registrar usuário: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}

async function loginUsuario(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Login bem-sucedido.';
        document.getElementById('auth-message').style.color = 'green';
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        document.getElementById('auth-message').textContent = 'Erro ao fazer login: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}

async function logoutUsuario() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert('Erro ao fazer logout.');
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

function atualizarInterfaceUsuario(user) {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const userInfoDisplay = document.getElementById('user-info');
    const authMessageDisplay = document.getElementById('auth-message');

    if (user) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userInfoDisplay.textContent = 'Usuário logado: ' + user.email;
        usuarioLogado = user;
        carregarDados();
    } else {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        userInfoDisplay.textContent = '';
        authMessageDisplay.textContent = 'Nenhum usuário autenticado';
        authMessageDisplay.style.color = '#555';
        usuarioLogado = null;
    }
}
// ==== FIM - FUNÇÕES DE AUTENTICAÇÃO ====


// ==== INÍCIO SEÇÃO - EVENT LISTENERS GLOBAIS ====
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, atualizarInterfaceUsuario);

    document.getElementById('registerBtn').addEventListener('click', () => {
        registrarUsuario(document.getElementById('email').value, document.getElementById('password').value);
    });

    document.getElementById('loginBtn').addEventListener('click', () => {
        loginUsuario(document.getElementById('email').value, document.getElementById('password').value);
    });

    document.getElementById('logoutBtn').addEventListener('click', logoutUsuario);

    document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
        enviarEmailRedefinicaoSenha(document.getElementById('email').value);
    });

    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => { /* ... Event listeners tipo-material ... */ });
    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const camposComprimento = document.getElementById('campos-comprimento');
            const camposLitro = document.getElementById('campos-litro');
            const camposQuilo = document.getElementById('campos-quilo');
            const camposArea = document.getElementById('campos-area');

            camposComprimento.style.display = 'none';
            camposLitro.style.display = 'none';
            camposQuilo.style.display = 'none';
            camposArea.style.display = 'none';

            if (this.value === "comprimento") camposComprimento.style.display = "block";
            else if (this.value === "litro") camposLitro.style.display = "block";
            else if (this.value === "quilo") camposQuilo.style.display = "block";
            else if (this.value === "area") camposArea.style.display = "block";
        });
    });


    carregarCustosIndiretosPredefinidos();
    atualizarTabelaCustosIndiretos();

    mostrarSubMenu('calculo-precificacao'); // Mostrar Cálculo da Precificação por padrão

    document.getElementById('margem-lucro-final').value = margemLucroPadrao;
    document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
    document.getElementById('incluir-taxa-credito-sim').checked = taxaCredito.incluir;
    document.getElementById('incluir-taxa-credito-nao').checked = !taxaCredito.incluir;


    calcularCustos();
    salvarTaxaCredito();

    document.addEventListener('click', function (event) { /* ... Event listener para autocomplete ... */ });
    document.addEventListener('click', function (event) {
        const autocompleteDiv = document.getElementById('produto-resultados');
        const inputPesquisa = document.getElementById('produto-pesquisa');
        if (event.target !== autocompleteDiv && event.target !== inputPesquisa) {
            autocompleteDiv.classList.add('hidden');
        }
    });


    document.getElementById('produto-pesquisa').addEventListener('input', buscarProdutosAutocomplete);

});
// ==== FIM SEÇÃO - EVENT LISTENERS GLOBAIS ====


// ==== INÍCIO SEÇÕES DE FUNCIONALIDADE (Materiais, Mão de Obra, Custos, Produtos, Precificação, etc.) ====
// *** Copie e cole AQUI TODO o restante do código JavaScript (funções para cadastrar materiais, produtos, cálculos, tabelas, etc.) ***
// *** do código anterior. Assegure-se de incluir TODAS as funções abaixo de '==== FIM SEÇÃO - EVENT LISTENERS GLOBAIS ====' ***
// *** para garantir que todas as funcionalidades estejam presentes. ***
// ==== INÍCIO SEÇÃO - CÁLCULO DO CUSTO UNITÁRIO ====
function calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm) { /* ... */ }
// *** Copie e cole AQUI as funções restantes COMPLETAS do código anterior ***
// *** (calcularCustoUnitario, cadastrarMaterialInsumo, atualizarTabelaMateriaisInsumos, buscarMateriaisCadastrados, editarMaterialInsumo, removerMaterialInsumo, calcularValorHora, calcularCustoFerias13o, salvarMaoDeObra, editarMaoDeObra, carregarCustosIndiretosPredefinidos, salvarCustoIndiretoPredefinido, adicionarNovoCustoIndireto, salvarNovoCustoIndiretoLista, removerNovoCustoIndiretoLista, atualizarTabelaCustosIndiretos, zerarCustoIndireto, buscarCustosIndiretosCadastrados, cadastrarProduto, atualizarTabelaProdutosCadastrados, buscarProdutosCadastrados, adicionarMaterialNaTabelaProduto, editarProduto, removerProduto, removerLinhaMaterial, buscarProdutosAutocomplete, selecionarProduto, carregarDadosProduto, calcularCustos, calcularPrecoVendaFinal, salvarTaxaCredito, calcularTotalComTaxas, gerarNotaPrecificacao, atualizarTabelaPrecificacoesGeradas, buscarPrecificacoesGeradas, visualizarPrecificacaoHTML, abrirPrecificacaoEmNovaJanela, salvarDados, carregarDados, limparPagina) ***
// *** para garantir que não falte nenhuma funcionalidade. ***
// ==== INÍCIO SEÇÃO - CÁLCULO DO CUSTO UNITÁRIO ====
function calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm) {
    let custoUnitario = 0;
    switch (tipo) {
        case "comprimento":
            custoUnitario = valorTotal / (comprimentoCm / 100);
            break;
        case "litro":
            custoUnitario = valorTotal / (volumeMl / 1000);
            break;
        case "quilo":
            custoUnitario = valorTotal / (pesoG / 1000);
            break;
        case "unidade":
            custoUnitario = valorTotal;
            break;
        case "area":
            custoUnitario = valorTotal / ((larguraCm / 100) * (alturaCm / 100));
            break;
    }
    return custoUnitario;
}
// ==== FIM SEÇÃO - CÁLCULO DO CUSTO UNITÁRIO ====

// ==== INÍCIO SEÇÃO - CADASTRO DE MATERIAL/INSUMO ====
async function cadastrarMaterialInsumo() { /* ... */ }
async function atualizarTabelaMateriaisInsumos() { /* ... */ }
function buscarMateriaisCadastrados() { /* ... */ }
async function editarMaterialInsumo(materialId) { /* ... */ }
async function removerMaterialInsumo(materialId, isEditing = false) { /* ... */ }
async function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value;
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value);
    const comprimentoCm = (tipo === 'comprimento') ? parseFloat(document.getElementById('comprimento-cm').value) : 0;
    const volumeMl = (tipo === 'litro') ? parseFloat(document.getElementById('volume-ml').value) : 0;
    const pesoG = (tipo === 'quilo') ? parseFloat(document.getElementById('peso-g').value) : 0;
    const larguraCm = (tipo === 'area') ? parseFloat(document.getElementById('largura-cm').value) : 0;
    const alturaCm = (tipo === 'area') ? parseFloat(document.getElementById('altura-cm').value) : 0;

    const custoUnitario = calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm);

    const material = {
        nome,
        tipo,
        valorTotal,
        comprimentoCm,
        volumeMl,
        pesoG,
        larguraCm,
        alturaCm,
        custoUnitario
    };

    try {
        await addDoc(collection(db, "materiais-insumos"), material);
        atualizarTabelaMateriaisInsumos();
        limparFormulario('form-materiais-insumos');

        const produtosImpactados = produtos.filter(produto =>
            produto.materiais.some(item => item.material.nome === material.nome)
        );

        produtosImpactados.forEach(produto => {
            produto.materiais.forEach(item => {
                if (item.material.nome === material.nome && item.tipo === material.tipo) {
                    item.material.custoUnitario = material.custoUnitario;
                    item.custoTotal = calcularCustoTotalItem(item);
                }
            });
            produto.custoTotal = produto.materiais.reduce((total, item) => total + item.custoTotal, 0);
        });

        salvarDados(); // Manter para outras configurações (margem, taxa, etc.)
        atualizarTabelaProdutosCadastrados();

        const produtoSelecionadoNome = document.getElementById('produto-pesquisa').value;
        if(produtoSelecionadoNome){
            const produtoSelecionado = produtos.find(p => p.nome === produtoSelecionadoNome);
            if(produtoSelecionado){
                carregarDadosProduto(produtoSelecionado);
                calcularCustos();
            }
        }
        alert('Material/Insumo cadastrado com sucesso no Firebase!');

    } catch (error) {
        console.error("Erro ao cadastrar material no Firebase:", error);
        alert('Erro ao cadastrar material/insumo no Firebase.');
    }
}
// ==== FIM SEÇÃO - CADASTRO DE MATERIAL/INSUMO ====

// ==== INÍCIO SEÇÃO - TABELA DE MATERIAL/INSUMO ====
async function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "materiais-insumos"));
        materiais = []; // Limpa array local antes de popular com dados do Firebase
        querySnapshot.forEach((doc) => {
            materiais.push({ id: doc.id, ...doc.data() }); // Inclui o ID do documento
        });

        materiais.forEach((material) => { // Removido index, pois agora usamos IDs do Firestore
            const row = tbody.insertRow();

            row.insertCell().textContent = material.nome;
            row.insertCell().textContent = material.tipo;

            let dimensoes = '';
            switch (material.tipo) {
                case 'comprimento':
                    dimensoes = `${material.comprimentoCm} cm`;
                    break;
                case 'litro':
                    dimensoes = `${material.volumeMl} ml`;
                    break;
                case 'quilo':
                    dimensoes = `${material.pesoG} g`;
                    break;
                case 'unidade':
                    dimensoes = 'N/A';
                    break;
                case 'area':
                    dimensoes = `${material.larguraCm} x ${material.alturaCm} cm`;
                    break;
            }
            row.insertCell().textContent = dimensoes;
            row.insertCell().textContent = formatarMoeda(material.custoUnitario);

            const cellAcoes = row.insertCell();
            const btnEditar = document.createElement('button');
            btnEditar.textContent = 'Editar';
            btnEditar.onclick = () => editarMaterialInsumo(material.id); // Passa o ID para edição
            const btnRemover = document.createElement('button');
            btnRemover.textContent = 'Remover';
            btnRemover.onclick = () => removerMaterialInsumo(material.id); // Passa o ID para remoção
            cellAcoes.appendChild(btnEditar);
            cellAcoes.appendChild(btnRemover);
        });
    } catch (error) {
        console.error("Erro ao carregar materiais do Firebase:", error);
        // Tratar erro de carregamento, se necessário
    }
}


function buscarMateriaisCadastrados() {
    const termoBusca = document.getElementById('busca-material').value.toLowerCase();
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';

    materiais.filter(material => material.nome.toLowerCase().includes(termoBusca)).forEach((material) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = material.nome;
        row.insertCell().textContent = material.tipo;

        let dimensoes = '';
            switch (material.tipo) {
                case 'comprimento':
                    dimensoes = `${material.comprimentoCm} cm`;
                    break;
                case 'litro':
                    dimensoes = `${material.volumeMl} ml`;
                    break;
                case 'quilo':
                    dimensoes = `${material.pesoG} g`;
                    break;
                case 'unidade':
                    dimensoes = 'N/A';
                    break;
                case 'area':
                    dimensoes = `${material.larguraCm} x ${material.alturaCm} cm`;
                    break;
            }
        row.insertCell().textContent = dimensoes;
        row.insertCell().textContent = formatarMoeda(material.custoUnitario);

        const cellAcoes = row.insertCell();
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => editarMaterialInsumo(material.id); // Passa o ID
        const btnRemover = document.createElement('button');
        btnRemover.textContent = 'Remover';
        btnRemover.onclick = () => removerMaterialInsumo(material.id); // Passa o ID
        cellAcoes.appendChild(btnEditar);
        cellAcoes.appendChild(btnRemover);
    });
}


async function editarMaterialInsumo(materialId) {
    const material = materiais.find(m => m.id === materialId); // Encontra material pelo ID

    if (!material) {
        alert('Material não encontrado para edição.');
        return;
    }

    document.getElementById('nome-material').value = material.nome;
    document.querySelector(`input[name="tipo-material"][value="${material.tipo}"]`).checked = true;
    document.getElementById('valor-total-material').value = material.valorTotal;

    document.querySelectorAll('.form-group[id^="campos-"]').forEach(el => el.style.display = 'none');
    if (material.tipo === 'comprimento') {
        document.getElementById('campos-comprimento').style.display = 'block';
        document.getElementById('comprimento-cm').value = material.comprimentoCm;
    } else if (material.tipo === 'litro') {
        document.getElementById('campos-litro').style.display = 'block';
        document.getElementById('volume-ml').value = material.volumeMl;
    } else if (material.tipo === 'quilo') {
        document.getElementById('campos-quilo').style.display = 'block';
        document.getElementById('peso-g').value = material.pesoG;
    } else if (material.tipo === 'area') {
        document.getElementById('campos-area').style.display = 'block';
        document.getElementById('largura-cm').value = material.larguraCm;
        document.getElementById('altura-cm').value = material.alturaCm;
    }

    await removerMaterialInsumo(materialId, true); // Passa 'true' para indicar que é edição
}

async function removerMaterialInsumo(materialId, isEditing = false) {
    try {
        await deleteDoc(doc(db, "materiais-insumos", materialId));
        if (!isEditing) { // Atualiza a tabela apenas se não for parte da edição
            atualizarTabelaMateriaisInsumos();
        }
        if (!isEditing) alert('Material/Insumo removido do Firebase!');

    } catch (error) {
        console.error("Erro ao remover material do Firebase:", error);
        alert('Erro ao remover material/insumo do Firebase.');
    }
}
// ==== FIM SEÇÃO - TABELA DE MATERIAL/INSUMO ====

// ==== INÍCIO SEÇÃO - MÃO DE OBRA ====
// --- Mão de Obra ---
function calcularValorHora() { /* ... */ }
function calcularCustoFerias13o() { /* ... */ }
async function salvarMaoDeObra() { /* ... */ }
function editarMaoDeObra() { /* ... */ }
// Event Listeners (mantidos)
document.getElementById('salario-receber').addEventListener('input', function(){
    calcularValorHora();
    calcularCustoFerias13o();
});
document.getElementById('horas-trabalhadas').addEventListener('input', function(){
    calcularValorHora();
    calcularCustoFerias13o();
    atualizarTabelaCustosIndiretos();
    calcularCustos();
});
// ==== FIM SEÇÃO - MÃO DE OBRA ====

// ==== INÍCIO SEÇÃO - CUSTOS INDIRETOS ====
async function carregarCustosIndiretosPredefinidos() { /* ... */ }
async function salvarCustoIndiretoPredefinido(descricao, index) { /* ... */ }
function adicionarNovoCustoIndireto() { /* ... */ }
async function salvarNovoCustoIndiretoLista(botao) { /* ... */ }
async function removerNovoCustoIndiretoLista(botaoRemover) { /* ... */ }
function atualizarTabelaCustosIndiretos() { /* ... */ }
async function zerarCustoIndireto(identificador, tipo) { /* ... */ }
function buscarCustosIndiretosCadastrados() { /* ... */ }
// ==== FIM SEÇÃO - CUSTOS INDIRETOS ====

// ==== INÍCIO SEÇÃO - PRODUTOS CADASTRADOS ====
async function cadastrarProduto() { /* ... */ }
async function atualizarTabelaProdutosCadastrados() { /* ... */ }
function buscarProdutosCadastrados() { /* ... */ }
function adicionarMaterialNaTabelaProduto(material, tipo, quantidade, comprimento, largura, altura, volume, peso) { /* ... */ }
async function editarProduto(produtoId) { /* ... */ }
async function removerProduto(produtoId) { /* ... */ }
function removerLinhaMaterial(index) { /* ... */ }
// ==== FIM SEÇÃO - PRODUTOS CADASTRADOS ====

// ==== INÍCIO SEÇÃO - CÁLCULO DA PRECIFICAÇÃO ====
function buscarProdutosAutocomplete() { /* ... */ }
function selecionarProduto(produto) { /* ... */ }
function carregarDadosProduto(produto) { /* ... */ }
function calcularCustos() { /* ... */ }
function calcularPrecoVendaFinal() { /* ... */ }
async function salvarTaxaCredito() { /* ... */ }
function calcularTotalComTaxas(){ /* ... */ }
//Event listeners (mantidos)
document.getElementById('horas-produto').addEventListener('input', calcularCustos);
document.getElementById('margem-lucro-final').addEventListener('input', calcularPrecoVendaFinal);
document.querySelectorAll('input[name="incluir-taxa-credito"]').forEach(radio => {
    radio.addEventListener('change', calcularTotalComTaxas);
});
document.getElementById('taxa-credito-percentual').addEventListener('input', calcularTotalComTaxas);
// ==== FIM SEÇÃO - CÁLCULO DA PRECIFICAÇÃO ====

// ==== INÍCIO SEÇÃO - PRECIFICAÇÕES GERADAS ====
async function gerarNotaPrecificacao() { /* ... */ }
async function atualizarTabelaPrecificacoesGeradas() { /* ... */ }
function buscarPrecificacoesGeradas() { /* ... */ }
function visualizarPrecificacaoHTML(precificacaoId) { /* ... */ }
function abrirPrecificacaoEmNovaJanela(precificacaoId) { /* ... */ }
// ==== FIM SEÇÃO - PRECIFICAÇÕES GERADAS ====

// ==== INÍCIO SEÇÃO - IMPORTAR/EXPORTAR/LIMPAR (REMOVIDO/ADAPTADO) ====
function salvarDados() { /* ... */ }
async function carregarDados() { /* ... */ }
function limparPagina() { /* ... */ }
// ==== FIM SEÇÃO - IMPORTAR/EXPORTAR/LIMPAR (REMOVIDO/ADAPTADO) ====
