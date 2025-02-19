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
const db = getFirestore(app);
const auth = getAuth(app);
// ==== FIM SEÇÃO - INICIALIZAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ====
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
// ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE ====
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
// ==== FIM SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - FUNÇÕES GERAIS DA PÁGINA ====
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
    if (item.tipo === "comprimento") custoTotal = item.material.custoUnitario * (item.comprimento / 100) * item.quantidade;
    else if (item.tipo === "area") custoTotal = item.material.custoUnitario * (item.largura * item.altura / 10000) * item.quantidade;
    else if (item.tipo === "litro") custoTotal = item.material.custoUnitario * (item.volume / 1000) * item.quantidade;
    else if (item.tipo === "quilo") custoTotal = item.material.custoUnitario * (item.peso / 1000) * item.quantidade;
    else if (item.tipo === "unidade") custoTotal = item.material.custoUnitario * item.quantidade;
    return custoTotal;
}
// ==== FIM SEÇÃO - FUNÇÕES GERAIS DA PÁGINA ====

// ==== INÍCIO SEÇÃO - FUNÇÕES MATERIAIS E INSUMOS ====
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

        salvarDados();
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

async function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "materiais-insumos"));
        materiais = [];
        querySnapshot.forEach((doc) => {
            materiais.push({ id: doc.id, ...doc.data() });
        });

        materiais.forEach((material) => {
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
            btnEditar.onclick = () => editarMaterialInsumo(material.id);
            const btnRemover = document.createElement('button');
            btnRemover.textContent = 'Remover';
            btnRemover.onclick = () => removerMaterialInsumo(material.id);
            cellAcoes.appendChild(btnEditar);
            cellAcoes.appendChild(btnRemover);
        });
    } catch (error) {
        console.error("Erro ao carregar materiais do Firebase:", error);
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
        btnEditar.onclick = () => editarMaterialInsumo(material.id);
        const btnRemover = document.createElement('button');
        btnRemover.textContent = 'Remover';
        btnRemover.onclick = () => removerMaterialInsumo(material.id);
        cellAcoes.appendChild(btnEditar);
        cellAcoes.appendChild(btnRemover);
    });
}

async function editarMaterialInsumo(materialId) {
    const material = materiais.find(m => m.id === materialId);

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

    await removerMaterialInsumo(materialId, true);
}

async function removerMaterialInsumo(materialId, isEditing = false) {
    try {
        await deleteDoc(doc(db, "materiais-insumos", materialId));
        if (!isEditing) {
            atualizarTabelaMateriaisInsumos();
        }
        if (!isEditing) alert('Material/Insumo removido do Firebase!');

    } catch (error) {
        console.error("Erro ao remover material do Firebase:", error);
        alert('Erro ao remover material/insumo do Firebase.');
    }
}
// ==== FIM SEÇÃO - FUNÇÕES MATERIAIS E INSUMOS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES MÃO DE OBRA ====
function calcularValorHora() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horas = parseInt(document.getElementById('horas-trabalhadas').value);

    if (isNaN(salario) || isNaN(horas) || horas === 0) {
      document.getElementById('valor-hora').value = '';
      return;
    }

    const valorHora = salario / horas;
    document.getElementById('valor-hora').value = valorHora.toFixed(2);
    return valorHora;
}

function calcularCustoFerias13o() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horas = parseInt(document.getElementById('horas-trabalhadas').value);
    const incluir = document.getElementById('incluir-ferias-13o-sim').checked;

    let custoFerias13o = 0;
    if (incluir) {
        custoFerias13o = ((salario + (salario / 3)) / 12) / horas;
    }
    document.getElementById('custo-ferias-13o').value = custoFerias13o.toFixed(2);
     return custoFerias13o;
}

async function salvarMaoDeObra() {
    const valorHora = calcularValorHora();

    if (valorHora === undefined) {
        alert('Preencha os campos de salário e horas corretamente.');
        return;
    }

    const maoDeObraData = {
        salario : parseFloat(document.getElementById('salario-receber').value),
        horas : parseInt(document.getElementById('horas-trabalhadas').value),
        valorHora : calcularValorHora(),
        incluirFerias13o : document.getElementById('incluir-ferias-13o-sim').checked,
        custoFerias13o : calcularCustoFerias13o()
    };

    try {
        await setDoc(doc(db, "configuracoes", "maoDeObra"), maoDeObraData);

        maoDeObra = maoDeObraData;

        document.getElementById('salario-receber').value = maoDeObra.salario;
        document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
        document.getElementById('valor-hora').value = maoDeObra.valorHora.toFixed(2);
        document.getElementById('custo-ferias-13o').value = maoDeObra.custoFerias13o.toFixed(2);

        alert("Dados de mão de obra salvos com sucesso no Firebase!");

        modoEdicaoMaoDeObra = true;
        document.getElementById('btn-salvar-mao-de-obra').style.display = 'none';
        document.getElementById('btn-editar-mao-de-obra').style.display = 'inline-block';

        document.getElementById('titulo-mao-de-obra').textContent = 'Informações sobre custo de mão de obra';
        document.getElementById('salario-receber').readOnly = true;
        document.getElementById('horas-trabalhadas').readOnly = true;

         atualizarTabelaCustosIndiretos();
         calcularCustos();

         salvarDados();

    } catch (error) {
        console.error("Erro ao salvar dados de mão de obra no Firebase:", error);
        alert('Erro ao salvar dados de mão de obra no Firebase.');
    }
}

function editarMaoDeObra() {
    modoEdicaoMaoDeObra = false;

    document.getElementById('salario-receber').readOnly = false;
    document.getElementById('horas-trabalhadas').readOnly = false;

    document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
    document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';

    document.getElementById('mao-de-obra').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('titulo-mao-de-obra').textContent = 'Informações sobre custo de mão de obra';
}
// ==== FIM SEÇÃO - FUNÇÕES MÃO DE OBRA ====

// ==== INÍCIO SEÇÃO - FUNÇÕES CUSTOS INDIRETOS ====
async function carregarCustosIndiretosPredefinidos() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    listaCustos.innerHTML = '';

    custosIndiretosPredefinidosBase.forEach((custoBase, index) => {
        const listItem = document.createElement('li');
        const custoAtual = custosIndiretosPredefinidos.find(c => c.descricao === custoBase.descricao) || { ...custoBase };
        listItem.innerHTML = `
            <div class="custo-item-nome">${custoBase.descricao}</div>
            <input type="number" id="custo-indireto-${index}" value="${custoAtual.valorMensal.toFixed(2)}" step="0.01">
            <button class="salvar-custo-indireto-predefinido-btn" data-descricao="${custoBase.descricao}" data-index="${index}">Salvar</button>
        `;
        listaCustos.appendChild(listItem);
    });

    try {
        const querySnapshot = await getDocs(collection(db, "custos-indiretos-adicionais"));
        custosIndiretosAdicionais = [];
        querySnapshot.forEach((doc) => {
            custosIndiretosAdicionais.push({ id: doc.id, ...doc.data() });
        });

        custosIndiretosAdicionais.forEach((custo) => {
            const listItem = document.createElement('li');
            listItem.dataset.index = custo.tempIndex;
            listItem.innerHTML = `
                <div class="custo-item-nome">${custo.descricao}</div>
                <input type="number" value="${custo.valorMensal.toFixed(2)}" step="0.01">
                <button class="salvar-novo-custo-indireto-btn" data-id="${custo.id}" data-index="${custo.tempIndex}">Salvar</button>
                <button class="remover-novo-custo-indireto-btn" data-id="${custo.id}" data-index="${custo.tempIndex}">Remover</button>
            `;
            listaCustos.appendChild(listItem);

            // ADD EVENT LISTENERS HERE, AFTER APPENDING listItem:
            const salvarBtn = listItem.querySelector('.salvar-novo-custo-indireto-btn');
            const removerBtn = listItem.querySelector('.remover-novo-custo-indireto-btn');

            if (salvarBtn && removerBtn) { // Check if buttons were found
                salvarBtn.addEventListener('click', function() { salvarNovoCustoIndiretoLista(this); });
                removerBtn.addEventListener('click', function() { removerNovoCustoIndiretoLista(this); });
            }
        });

        atualizarTabelaCustosIndiretos();

    } catch (error) {
        console.error("Erro ao carregar custos indiretos adicionais do Firebase:", error);
        }

        // Adiciona event listeners para os botões "Salvar" de custos indiretos predefinidos
        const botoesSalvarPredefinidos = document.querySelectorAll('.salvar-custo-indireto-predefinido-btn');
        botoesSalvarPredefinidos.forEach(botao => {
            botao.addEventListener('click', function() {
                const descricao = this.dataset.descricao;
                const index = parseInt(this.dataset.index);
                salvarCustoIndiretoPredefinido(descricao, index);
            });
        });

        // Event listener para o botão "Adicionar Custo Indireto"
        const adicionarCustoIndiretoBtn = document.getElementById('adicionarCustoIndiretoBtn');
        if (adicionarCustoIndiretoBtn) {
            adicionarCustoIndiretoBtn.addEventListener('click', adicionarNovoCustoIndireto);
        }

        // Adiciona event listeners para os botões "Salvar" de novos custos indiretos
        const botoesSalvarNovosCustos = document.querySelectorAll('.salvar-novo-custo-indireto-btn');
        botoesSalvarNovosCustos.forEach(botao => {
            botao.addEventListener('click', function() {
                salvarNovoCustoIndiretoLista(this);
            });
        });
    }

async function salvarCustoIndiretoPredefinido(descricao, index) {
    const inputValor = document.getElementById(`custo-indireto-${index}`);
    const novoValor = parseFloat(inputValor.value);

    if (!isNaN(novoValor)) {
        const custoParaAtualizar = custosIndiretosPredefinidos.find(c => c.descricao === descricao);
        if(custoParaAtualizar){
            custoParaAtualizar.valorMensal = novoValor;
        }
        atualizarTabelaCustosIndiretos();
        calcularCustos();
        salvarDados();
    } else {
        alert("Por favor, insira um valor numérico válido.");
    }
}

function adicionarNovoCustoIndireto() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    const listItem = document.createElement('li');
    const id = `novo-custo-${novoCustoIndiretoCounter++}`;
    listItem.dataset.index = id;
    listItem.innerHTML = `
        <input type="text" class="custo-item-nome" placeholder="Descrição do novo custo">
        <input type="number" value="0.00" step="0.01">
        <button class="salvar-novo-custo-indireto-btn" data-index="${id}">Salvar</button>
        <button class="remover-novo-custo-indireto-btn" data-index="${id}">Remover</button>
    `;
    listaCustos.appendChild(listItem);

    // ADD EVENT LISTENERS HERE, AFTER APPENDING listItem:
    const salvarBtn = listItem.querySelector('.salvar-novo-custo-indireto-btn');
    const removerBtn = listItem.querySelector('.remover-novo-custo-indireto-btn');

    if (salvarBtn && removerBtn) { // Check if buttons were found
        salvarBtn.addEventListener('click', function() { salvarNovoCustoIndiretoLista(this); });
        removerBtn.addEventListener('click', function() { removerNovoCustoIndiretoLista(this); });
    }
}

async function salvarNovoCustoIndiretoLista(botao) {
    const listItem = botao.parentNode;
    const descricaoInput = listItem.querySelector('.custo-item-nome');
    const valorInput = listItem.querySelector('input[type="number"]');
    const index = botao.dataset.index;

    const descricao = descricaoInput.value.trim();
    const valorMensal = parseFloat(valorInput.value);

    if (descricao && !isNaN(valorMensal)) {
        const custoData = {
            descricao: descricao,
            valorMensal: valorMensal,
            tempIndex: index
        };

        try {
            let custoId = botao.dataset.id;
            if (custoId) {
                await updateDoc(doc(db, "custos-indiretos-adicionais", custoId), custoData);
            } else {
                const docRef = await addDoc(collection(db, "custos-indiretos-adicionais"), custoData);
                custoId = docRef.id;
                botao.dataset.id = custoId;
            }

             // Atualiza o array local `custosIndiretosAdicionais`
            const custoExistenteIndex = custosIndiretosAdicionais.findIndex(c => c.tempIndex === index);
            if (custoExistenteIndex !== -1) {
                custosIndiretosAdicionais[custoExistenteIndex] = { id: custoId, ...custoData };
            } else {
                custosIndiretosAdicionais.push({ id: custoId, ...custoData });
            }

            atualizarTabelaCustosIndiretos();
            calcularCustos();
            salvarDados();

        } catch (error) {
            console.error("Erro ao salvar novo custo indireto no Firebase:", error);
            alert("Erro ao salvar custo indireto. Tente novamente.");
        }

    } else {
        alert("Por favor, preencha a descrição e insira um valor numérico válido.");
    }
}

async function removerNovoCustoIndiretoLista(botaoRemover) {
    const listItem = botaoRemover.parentNode;
    const indexToRemove = botaoRemover.dataset.index;
    const custoId = botaoRemover.dataset.id;

    try {
        if (custoId) {
            await deleteDoc(doc(db, "custos-indiretos-adicionais", custoId));
        }

        custosIndiretosAdicionais = custosIndiretosAdicionais.filter(custo => custo.tempIndex !== indexToRemove);
        listItem.remove();
        atualizarTabelaCustosIndiretos();
        calcularCustos();
        salvarDados();

    } catch (error) {
        console.error("Erro ao remover custo indireto do Firebase:", error);
        alert("Erro ao remover custo indireto. Tente novamente.");
    }
}

function atualizarTabelaCustosIndiretos() {
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    tbody.innerHTML = '';
    const horasTrabalhadas = maoDeObra.horas;

    if (horasTrabalhadas === undefined || horasTrabalhadas === null || horasTrabalhadas <= 0) {
        const row = tbody.insertRow();
        const cellMensagem = row.insertCell();
        cellMensagem.textContent = "Preencha as 'Horas trabalhadas por mês' no menu 'Custo de Mão de Obra' para calcular o custo por hora.";
        cellMensagem.colSpan = 4;
        return;
    }

    const custosPredefinidosParaExibir = custosIndiretosPredefinidos.filter(custo => custo.valorMensal > 0);
    const custosAdicionaisParaExibir = custosIndiretosAdicionais.filter(custo => custo.valorMensal > 0);

    custosPredefinidosParaExibir.forEach((custo, index) => {
        const row = tbody.insertRow();
        const cellDescricao = row.insertCell();
        const cellValorMensal = row.insertCell();
        const cellValorHoraTrabalhada = row.insertCell();
        const cellAcoes = row.insertCell();

        cellDescricao.textContent = custo.descricao;
        cellValorMensal.textContent = formatarMoeda(custo.valorMensal);
        const valorPorHora = custo.valorMensal / horasTrabalhadas;
        cellValorHoraTrabalhada.textContent = formatarMoeda(valorPorHora);

        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(custo.descricao, 'predefinido');
        cellAcoes.appendChild(botaoZerar);
    });

    custosAdicionaisParaExibir.forEach((custo) => {
        const row = tbody.insertRow();
        const cellDescricao = row.insertCell();
        const cellValorMensal = row.insertCell();
        const cellValorHoraTrabalhada = row.insertCell();
        const cellAcoes = row.insertCell();

        cellDescricao.textContent = custo.descricao;
        cellValorMensal.textContent = formatarMoeda(custo.valorMensal);
        const valorPorHora = custo.valorMensal / horasTrabalhadas;
        cellValorHoraTrabalhada.textContent = formatarMoeda(valorPorHora);

        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(custo.id, 'adicional');
        cellAcoes.appendChild(botaoZerar);
    });
}

async function zerarCustoIndireto(identificador, tipo) {
    if (tipo === 'predefinido') {
        const index = custosIndiretosPredefinidos.findIndex(c => c.descricao === identificador);
        if (index !== -1) {
             custosIndiretosPredefinidos[index].valorMensal = 0;
             document.getElementById(`custo-indireto-${index}`).value = '0.00';
        }
    } else if (tipo === 'adicional') {
        try {
            await updateDoc(doc(db, "custos-indiretos-adicionais", identificador), { valorMensal: 0 });

            const custoAdicionalIndex = custosIndiretosAdicionais.findIndex(c => c.id === identificador);
            if (custoAdicionalIndex !== -1) {
                custosIndiretosAdicionais[custoAdicionalIndex].valorMensal = 0;
            }

        } catch (error) {
            console.error("Erro ao zerar custo indireto adicional no Firebase:", error);
            alert("Erro ao zerar custo indireto. Tente novamente.");
            return;
        }
    }
    atualizarTabelaCustosIndiretos();
    calcularCustos();
    salvarDados();
}

function buscarCustosIndiretosCadastrados() {
      const termoBusca = document.getElementById('busca-custo-indireto').value.toLowerCase();
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    tbody.innerHTML = '';

    const horasTrabalhadas = maoDeObra.horas;
     if (horasTrabalhadas === undefined || horasTrabalhadas === null || horasTrabalhadas <= 0) {
        const row = tbody.insertRow();
        const cellMensagem = row.insertCell();
        cellMensagem.textContent = "Preencha as 'Horas trabalhadas por mês' no menu 'Custo de Mão de Obra' para calcular o custo por hora.";
        cellMensagem.colSpan = 4;
        return;
    }

    const custosExibicao = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais].filter(custo => custo.valorMensal > 0);
    const custosFiltrados = custosExibicao.filter(custo => custo.descricao.toLowerCase().includes(termoBusca));

   custosFiltrados.forEach((custo) => {
        const originalIndexPredefinidos = custosIndiretosPredefinidos.findIndex(c => c.descricao === custo.descricao);
        const originalAdicional = custosIndiretosAdicionais.find(c => c.descricao === custo.descricao && c.id === custo.id);

        if (custo.valorMensal > 0 || originalAdicional || originalIndexPredefinidos !== -1 ) {
            const row = tbody.insertRow();
            const cellDescricao = row.insertCell();
            const cellValorMensal = row.insertCell();
            const cellValorHoraTrabalhada = row.insertCell();
            const cellAcoes = row.insertCell();

            cellDescricao.textContent = custo.descricao;
            cellValorMensal.textContent = formatarMoeda(custo.valorMensal);

            const valorPorHora = custo.valorMensal / horasTrabalhadas;
            cellValorHoraTrabalhada.textContent = formatarMoeda(valorPorHora);

            let botaoAcao;
            if (originalIndexPredefinidos !== -1) {
                botaoAcao = document.createElement('button');
                botaoAcao.textContent = 'Zerar';
                botaoAcao.onclick = function() { zerarCustoIndireto(custo.descricao, 'predefinido'); };
            } else if (originalAdicional) {
                botaoAcao = document.createElement('button');
                botaoAcao.textContent = 'Zerar';
                botaoAcao.onclick = function() { zerarCustoIndireto(custo.id, 'adicional'); };
            }

            cellAcoes.appendChild(botaoAcao);
        }
    });
}
// ==== FIM SEÇÃO - FUNÇÕES CUSTOS INDIRETOS ====


// ==== INÍCIO SEÇÃO - FUNÇÕES PRODUTOS CADASTRADOS ====
async function cadastrarProduto() {
    const nomeProduto = document.getElementById('nome-produto').value;
    if (!nomeProduto) {
        alert('Por favor, insira um nome para o produto.');
        return;
    }

    const materiaisProduto = [];
    const linhasTabela = document.querySelectorAll('#tabela-materiais-produto tbody tr');
    linhasTabela.forEach(linha => {
        let item = linha.itemData; // Access itemData stored in row
        materiaisProduto.push(item);
    });

    const custoTotalProduto = materiaisProduto.reduce((total, item) => total + item.custoTotal, 0);

    const produtoData = {
        nome: nomeProduto,
        materiais: materiaisProduto,
        custoTotal: custoTotalProduto
    };

    try {
        if (produtoEmEdicao !== null) {
            alert("Edição de produtos existente no Firebase ainda não implementada neste exemplo.");
            return;
        } else {
            await addDoc(collection(db, "produtos"), produtoData);
        }

        document.getElementById('form-produtos-cadastrados').reset();
        document.querySelector('#tabela-materiais-produto tbody').innerHTML = '';

        atualizarTabelaProdutosCadastrados();
        salvarDados();
        produtoEmEdicao = null;
        alert('Produto cadastrado com sucesso no Firebase!');

    } catch (error) {
        console.error("Erro ao cadastrar produto no Firebase:", error);
        alert('Erro ao cadastrar produto no Firebase.');
    }
}
async function atualizarTabelaProdutosCadastrados() {
    // ... (same as before)
}

function buscarProdutosCadastrados() {
    // ... (same as before)
}


function recalcularCustoLinhaMaterial(row) {
    const tipo = row.cells[1].textContent;
    const custoUnitario = parseFloat(row.cells[2].textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));
    const inputsDimensao = row.cells[3].querySelectorAll('.dimensoes-input');
    const quantidadeInput = row.cells[4].querySelector('.quantidade-input');
    const custoTotalCell = row.cells[5];

    let comprimento = 0, largura = 0, altura = 0, volume = 0, peso = 0, quantidade = 0;

    if (tipo === "comprimento") comprimento = parseFloat(inputsDimensao[0].value) || 0;
    else if (tipo === "area") { largura = parseFloat(inputsDimensao[0].value) || 0; altura = parseFloat(inputsDimensao[1].value) || 0; }
    else if (tipo === "litro") volume = parseFloat(inputsDimensao[0].value) || 0;
    else if (tipo === "quilo") peso = parseFloat(inputsDimensao[0].value) || 0;
    else if (tipo === "unidade") quantidade = parseFloat(inputsDimensao[0].value) || 0;

    quantidade = parseFloat(quantidadeInput.value) || 1; // Get quantity from input, default to 1 if empty

    let itemData = row.itemData; // Retrieve itemData
    itemData.quantidade = quantidade;
    itemData.comprimento = comprimento;
    itemData.largura = largura;
    itemData.altura = altura;
    itemData.volume = volume;
    itemData.peso = peso;

    itemData.custoTotal = calcularCustoTotalItem(itemData);
    custoTotalCell.textContent = formatarMoeda(itemData.custoTotal);
    row.itemData = itemData; // Update itemData in row
}


function adicionarMaterialNaTabelaProduto(material, tipo, quantidade, comprimento, largura, altura, volume, peso) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    const row = tbody.insertRow();

    row.insertCell().textContent = material.nome;
    row.insertCell().textContent = tipo;
    row.insertCell().textContent = formatarMoeda(material.custoUnitario);

    const dimensoesCell = row.insertCell();
    let dimensoesHTML = "";
    let quantidadeValue = '';
    let comprimentoValue = '';
    let larguraValue = '';
    let alturaValue = '';
    let volumeValue = '';
    let pesoValue = '';

    if (tipo === "comprimento") {
        comprimentoValue = material.comprimentoCm / 100;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${comprimentoValue}"> cm`;
    } else if (tipo === "area") {
        larguraValue = material.larguraCm / 100;
        alturaValue = material.alturaCm / 100;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${larguraValue}"> x <input type="number" class="dimensoes-input" value="${alturaValue}"> cm`;
    } else if (tipo === "litro") {
        volumeValue = material.volumeMl / 1000;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${volumeValue}"> ml`;
    } else if (tipo === "quilo") {
        pesoValue = material.pesoG / 1000;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${pesoValue}"> g`;
    } else if (tipo === "unidade") {
        quantidadeValue = 1;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${quantidadeValue}"> un`;
    }
    dimensoesCell.innerHTML = dimensoesHTML;


    const quantidadeCell = row.insertCell();
    const quantidadeInput = document.createElement("input");
    quantidadeInput.type = "number";
    quantidadeInput.classList.add("quantidade-input");
    quantidadeInput.value = 1;
    quantidadeCell.appendChild(quantidadeInput);

    const item = {
      material: {
          nome: material.nome,
          custoUnitario: material.custoUnitario
      },
      tipo: tipo,
      comprimento: comprimentoValue,
      largura: larguraValue,
      altura: alturaValue,
      volume: volumeValue,
      peso: pesoValue,
      quantidade: 1,
      custoTotal: 0 // Initial cost will be calculated dynamically
    };
    row.itemData = item; // Store item data in row

    const custoTotalCell = row.insertCell();
    custoTotalCell.textContent = formatarMoeda(0); // Initial cost displayed as R$0.00

    const actionsCell = row.insertCell();
    const removeButton = document.createElement('button');
    removeButton.textContent = "Remover";
    removeButton.onclick = () => removerLinhaMaterial(tbody.rows.length -1);
    actionsCell.appendChild(removeButton);

    // Add event listeners to dimension inputs for recalculating cost
    const inputsDimensao = dimensoesCell.querySelectorAll('.dimensoes-input');
    inputsDimensao.forEach(input => {
        input.addEventListener('input', () => recalcularCustoLinhaMaterial(row));
    });
     quantidadeInput.addEventListener('input', () => recalcularCustoLinhaMaterial(row));


     document.getElementById('pesquisa-material').value = '';
     document.getElementById('resultados-pesquisa').innerHTML = '';
     document.getElementById('resultados-pesquisa').style.display = 'none';

     recalcularCustoLinhaMaterial(row); // Initial calculation after row is created
}

// ===== INÍCIO - MODIFICAÇÃO PARA AUTOCOMPLETE DE MATERIAIS =====
function buscarMateriaisAutocomplete() {
    // ... (same as before)
}

function selecionarMaterial(material) {
    document.getElementById('pesquisa-material').value = ''; // Limpa o input de pesquisa
    document.getElementById('resultados-pesquisa').classList.add('hidden');
    document.getElementById('resultados-pesquisa').innerHTML = ''; // Limpa os resultados

    // Adiciona o material selecionado na tabela
    adicionarMaterialNaTabelaProduto(
        material,
        material.tipo,
        1, // Quantidade padrão inicial (pode ajustar conforme necessário)
        material.comprimentoCm,
        material.larguraCm,
        material.alturaCm,
        material.volumeMl,
        material.pesoG
    );
}
// ===== FIM - MODIFICAÇÃO PARA AUTOCOMPLETE DE MATERIAIS =====


function buscarProdutosAutocomplete() { // Mantém a função de autocomplete de produtos para cálculo de precificação
    // ... (same as before)
}

function selecionarProduto(produto) {
    // ... (same as before)
}
// ==== FIM SEÇÃO - FUNÇÕES PRODUTOS CADASTRADOS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES CÁLCULO DE PRECIFICAÇÃO ====
function carregarDadosProduto(produto) {
    // ... (same as before)
}

function calcularCustos() {
    // ... (same as before)
}

function calcularPrecoVendaFinal() {
    // ... (same as before)
}

async function salvarTaxaCredito() {
    // ... (same as before)
}

function calcularTotalComTaxas(){
  // ... (same as before)
}
// ==== FIM SEÇÃO - FUNÇÕES CÁLCULO DE PRECIFICAÇÃO ====

// ==== INÍCIO SEÇÃO - FUNÇÕES PRECIFICAÇÕES GERADAS ====
async function gerarNotaPrecificacao() {
    // ... (same as before)
}

async function atualizarTabelaPrecificacoesGeradas() {
    // ... (same as before)
}

function buscarPrecificacoesGeradas() {
    // ... (same as before)
}

function visualizarPrecificacaoHTML(precificacaoId) {
    // ... (same as before)
}

function abrirPrecificacaoEmNovaJanela(precificacaoId) {
    // ... (same as before)
}
// ==== FIM SEÇÃO - FUNÇÕES PRECIFICAÇÕES GERADAS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE SALVAR E CARREGAR DADOS ====
function salvarDados() {
    // ... (same as before)
}

async function carregarDados() {
    // ... (same as before)
}

function limparPagina() {
    // ... (same as before)
}
// ==== FIM SEÇÃO - FUNÇÕES DE SALVAR E CARREGAR DADOS ====

// ==== INÍCIO SEÇÃO - EVENT LISTENERS GERAIS (DOMContentLoaded) ====
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

    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
        radio.addEventListener('change', function () {
            // ... (same as before)
        });
    });

    carregarCustosIndiretosPredefinidos();
    atualizarTabelaCustosIndiretos();
    mostrarSubMenu('produtos-cadastrados'); // Changed to produtos-cadastrados for testing

    document.getElementById('margem-lucro-final').value = margemLucroPadrao;
    document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
    document.getElementById('incluir-taxa-credito-sim').checked = taxaCredito.incluir;
    document.getElementById('incluir-taxa-credito-nao').checked = !taxaCredito.incluir;

    calcularCustos();
    salvarTaxaCredito();

    document.addEventListener('click', function (event) {
        // ... (same as before)
    });

    document.getElementById('produto-pesquisa').addEventListener('input', buscarProdutosAutocomplete);

    // Adiciona event listeners para os links de navegação
    const navLinks = document.querySelectorAll('nav ul li a.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            // ... (same as before)
        });
    });

    // Botão "Cadastrar" - Materiais e Insumos
    const btnCadastrarMaterialInsumo = document.getElementById('cadastrar-material-insumo-btn');
    if (btnCadastrarMaterialInsumo) {
        btnCadastrarMaterialInsumo.addEventListener('click', cadastrarMaterialInsumo);
    }

    // Botão "Salvar" - Mão de Obra
    const btnSalvarMaoDeObra = document.getElementById('btn-salvar-mao-de-obra');
    if (btnSalvarMaoDeObra) {
        btnSalvarMaoDeObra.addEventListener('click', salvarMaoDeObra);
    }

    // ===== INÍCIO - EVENT LISTENER PARA AUTOCOMPLETE DE MATERIAIS =====
    document.getElementById('pesquisa-material').addEventListener('input', buscarMateriaisAutocomplete);
    // ===== FIM - EVENT LISTENER PARA AUTOCOMPLETE DE MATERIAIS =====

    // ===== BOTÃO CADASTRAR PRODUTO EVENT LISTENER =====
    const btnCadastrarProduto = document.querySelector('#form-produtos-cadastrados button[type="button"]');
    if (btnCadastrarProduto) {
        btnCadastrarProduto.addEventListener('click', cadastrarProduto);
    }
    // ===== FIM BOTÃO CADASTRAR PRODUTO EVENT LISTENER =====
});
// ==== FIM SEÇÃO - EVENT LISTENERS GERAIS (DOMContentLoaded) ====
