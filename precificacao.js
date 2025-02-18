// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

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

    mostrarSubMenu('calculo-precificacao');

    document.getElementById('margem-lucro-final').value = margemLucroPadrao;
    document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
    document.getElementById('incluir-taxa-credito-sim').checked = taxaCredito.incluir;
    document.getElementById('incluir-taxa-credito-nao').checked = !taxaCredito.incluir;

    calcularCustos();
    salvarTaxaCredito();

    document.addEventListener('click', function (event) {
        const autocompleteDiv = document.getElementById('produto-resultados');
        const inputPesquisa = document.getElementById('produto-pesquisa');
        if (event.target !== autocompleteDiv && event.target !== inputPesquisa) {
            autocompleteDiv.classList.add('hidden');
        }
    });

    document.getElementById('produto-pesquisa').addEventListener('input', buscarProdutosAutocomplete);

    // Adiciona event listeners para os links de navegação
    const navLinks = document.querySelectorAll('nav ul li a.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const submenuId = this.dataset.submenu;
            mostrarSubMenu(submenuId);
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

    // Adiciona event listener para o botão "Adicionar Custo Indireto"
    const adicionarCustoIndiretoBtn = document.getElementById('adicionar-custo-indireto-btn');
    adicionarCustoIndiretoBtn.addEventListener('click', adicionarNovoCustoIndireto);

    // Adiciona event listener para a busca de materiais no formulário de produtos
    const pesquisaMaterialInput = document.getElementById('pesquisa-material');
    pesquisaMaterialInput.addEventListener('input', buscarMateriaisAutocomplete);

    // Função para buscar materiais e exibir sugestões
    async function buscarMateriaisAutocomplete() {
        const termo = document.getElementById('pesquisa-material').value.toLowerCase();
        const resultadosDiv = document.getElementById('resultados-pesquisa');
        resultadosDiv.innerHTML = '';
        resultadosDiv.style.display = 'block'; // Garante que a div de resultados esteja visível

        if (!termo) {
            resultadosDiv.style.display = 'none';
            return;
        }

        // Simula a busca de materiais no array "materiais" (você deve ajustar isso para o Firebase)
        const resultados = materiais.filter(material => material.nome.toLowerCase().includes(termo));

        if (resultados.length > 0) {
            resultadosDiv.style.display = 'block';
            resultados.forEach(material => {
                const div = document.createElement('div');
                div.textContent = material.nome;
                div.addEventListener('click', () => selecionarMaterial(material));
                resultadosDiv.appendChild(div);
            });
        } else {
            resultadosDiv.style.display = 'none';
            const div = document.createElement('div');
            div.textContent = "Nenhum material encontrado";
            resultadosDiv.appendChild(div);
        }
    }

    function selecionarMaterial(material) {
        // Lógica para adicionar o material selecionado à tabela de materiais do produto
        const nomeMaterial = document.getElementById('pesquisa-material').value;
        const tipoMaterial = material.tipo;
        let quantidade = 1;
        let comprimento, largura, altura, volume, peso;
        if (tipoMaterial === "comprimento") {
            comprimento = 100;
        } else if (tipoMaterial === "area") {
            largura = 100;
            altura = 100;
        } else if (tipoMaterial === "litro") {
            volume = 1000;
        } else if (tipoMaterial === "quilo") {
            peso = 1000;
        } else if (tipoMaterial === "unidade") {
            quantidade = 1;
        }

        adicionarMaterialNaTabelaProduto(material, material.tipo, quantidade, comprimento, largura, altura, volume, peso);
    }
});

function adicionarNovoCustoIndireto() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    const listItem = document.createElement('li');
    const id = `novo-custo-${novoCustoIndiretoCounter++}`;
    listItem.dataset.index = id;
    listItem.innerHTML = `
        <input type="text" class="custo-item-nome" placeholder="Descrição do novo custo">
        <input type="number" value="0.00" step="0.01">
        <button class="salvar-novo-custo-indireto-btn" data-index="${id}">Salvar</button>
        <button onclick="removerNovoCustoIndiretoLista(this)" data-index="${id}">Remover</button>
    `;
    listaCustos.appendChild(listItem);
}

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
                <button onclick="removerNovoCustoIndiretoLista(this)" data-id="${custo.id}" data-index="${custo.tempIndex}">Remover</button>
            `;
            listaCustos.appendChild(listItem);
        });

        atualizarTabelaCustosIndiretos();

    } catch (error) {
        console.error("Erro ao carregar custos indiretos adicionais do Firebase:", error);
        }

        // Adiciona event listeners para os botões "Salvar" de custos indiretos
        const botoesSalvarPredefinidos = document.querySelectorAll('.salvar-custo-indireto-predefinido-btn');
        botoesSalvarPredefinidos.forEach(botao => {
            botao.addEventListener('click', function() {
                const descricao = this.dataset.descricao;
                const index = parseInt(this.dataset.index);
                salvarCustoIndiretoPredefinido(descricao, index);
            });
        });

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
        <button onclick="removerNovoCustoIndiretoLista(this)" data-index="${id}">Remover</button>
    `;
    listaCustos.appendChild(listItem);
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

async function cadastrarProduto() {
    const nomeProduto = document.getElementById('nome-produto').value;
    if (!nomeProduto) {
        alert('Por favor, insira um nome para o produto.');
        return;
    }

    const materiaisProduto = [];
    const linhasTabela = document.querySelectorAll('#tabela-materiais-produto tbody tr');
    linhasTabela.forEach(linha => {
        let nomeMaterial = linha.cells[0].textContent;
        const tipoMaterial = linha.cells[1].textContent;
        const custoUnitario = parseFloat(linha.cells[2].textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));

        let comprimento, largura, altura, volume, peso, quantidade;
        if (tipoMaterial === "comprimento") {
            comprimento = parseFloat(linha.querySelector('.dimensoes-input').value);
        } else if (tipoMaterial === "area") {
            largura = parseFloat(linha.querySelectorAll('.dimensoes-input')[0].value);
            altura = parseFloat(linha.querySelectorAll('.dimensoes-input')[1].value);
        } else if (tipoMaterial === "litro") {
            volume = parseFloat(linha.querySelector('.dimensoes-input').value);
        } else if (tipoMaterial === "quilo") {
            peso = parseFloat(linha.querySelector('.dimensoes-input').value);
        } else if (tipoMaterial === "unidade") {
            quantidade = parseFloat(linha.querySelector('.dimensoes-input').value);
        }

        quantidade = parseFloat(linha.querySelector('.quantidade-input').value);

        const materialOriginal = materiais.find(m => m.nome === nomeMaterial);

        const item = {
            material: {
                nome: materialOriginal.nome,
                custoUnitario: materialOriginal.custoUnitario
            },
            tipo: tipoMaterial,
            comprimento,
            largura,
            altura,
            volume,
            peso,
            quantidade,
        };

        item.custoTotal = calcularCustoTotalItem(item);
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
    const tbody = document.querySelector("#tabela-produtos tbody");
    tbody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        produtos = [];
        querySnapshot.forEach((doc) => {
            produtos.push({ id: doc.id, ...doc.data() });
        });

        produtos.forEach((produto, index) => {
            const row = tbody.insertRow();

            row.insertCell().textContent = produto.nome;

            const materiaisCell = row.insertCell();
            const materiaisList = document.createElement("ul");
            produto.materiais.forEach(item => {
                const listItem = document.createElement("li");
                listItem.textContent = `${item.material.nome} (${item.quantidade} ${item.tipo})`;
                materiaisList.appendChild(listItem);
            });
            materiaisCell.appendChild(materiaisList);

            const dimensoesCell = row.insertCell();
            const dimensoesList = document.createElement("ul");
            produto.materiais.forEach(item => {
                const listItem = document.createElement("li");
                let dimensaoTexto = "";

                if (item.tipo === "comprimento") {
                    dimensaoTexto = `${item.comprimento} cm`;
                } else if (item.tipo === "area") {
                    dimensaoTexto = `${item.largura} x ${item.altura} cm`;
                } else if (item.tipo === "litro") {
                    dimensaoTexto = `${item.volume} ml`;
                } else if (item.tipo === "quilo") {
                    dimensaoTexto = `${item.peso} g`;
                } else if (item.tipo === "unidade") {
                    dimensaoTexto = `${item.quantidade} un`;
                }
                listItem.textContent = `${item.material.nome}: ${dimensaoTexto}`;
                dimensoesList.appendChild(listItem);
            });
            dimensoesCell.appendChild(dimensoesList);

            row.insertCell().textContent = formatarMoeda(produto.custoTotal);

            const actionsCell = row.insertCell();
            const editButton = document.createElement("button");
            editButton.textContent = "Editar";
            editButton.onclick = () => editarProduto(produto.id);
            const removeButton = document.createElement("button");
            removeButton.textContent = "Remover";
            removeButton.onclick = () => removerProduto(produto.id);
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(removeButton);
        });

    } catch (error) {
        console.error("Erro ao carregar produtos do Firebase:", error);
    }
}

function buscarProdutosCadastrados() {
    const termoBusca = document.getElementById('busca-produto').value.toLowerCase();
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';

    produtos.filter(produto => produto.nome.toLowerCase().includes(termoBusca)).forEach((produto) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = produto.nome;

        const materiaisCell = row.insertCell();
        const materiaisList = document.createElement('ul');
        produto.materiais.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = `${item.material.nome} (${item.material.tipo})`;
            materiaisList.appendChild(listItem);
        });
        materiaisCell.appendChild(materiaisList);

         const dimensoesCell = row.insertCell();
        const dimensoesList = document.createElement("ul");
        produto.materiais.forEach(item => {
            const listItem = document.createElement("li");
            let dimensaoTexto = "";

            if (item.tipo === "comprimento") {
                dimensaoTexto = `${item.comprimento} cm`;
            } else if (item.tipo === "area") {
                dimensaoTexto = `${item.largura} x ${item.altura} cm`;
            } else if (item.tipo === "litro") {
                dimensaoTexto = `${item.volume} ml`;
            } else if (item.tipo === "quilo") {
                dimensaoTexto = `${item.peso} g`;
            } else if (item.tipo === "unidade") {
                dimensaoTexto = `${item.quantidade} un`;
            }
            listItem.textContent = `${item.material.nome}: ${dimensaoTexto}`;
            dimensoesList.appendChild(listItem);
        });
        dimensoesCell.appendChild(dimensoesList);

        row.insertCell().textContent = formatarMoeda(produto.custoTotal);

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.onclick = () => editarProduto(produto.id);
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remover';
        removeButton.onclick = () => removerProduto(produto.id);
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(removeButton);
    });
}

function adicionarMaterialNaTabelaProduto(material, tipo, quantidade, comprimento, largura, altura, volume, peso) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    const row = tbody.insertRow();

    row.insertCell().textContent = material.nome;
    row.insertCell().textContent = tipo;
    row.insertCell().textContent = formatarMoeda(material.custoUnitario);

    const dimensoesCell = row.insertCell();
    let dimensoesHTML = "";

    if (tipo === "comprimento") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${comprimento}"> cm`;
    } else if (tipo === "area") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${largura}"> x <input type="number" class="dimensoes-input" value="${altura}"> cm`;
    } else if (tipo === "litro") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${volume}"> ml`;
    } else if (tipo === "quilo") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${peso}"> g`;
    } else if (tipo === "unidade") {
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${quantidade}"> un`;
    }
    dimensoesCell.innerHTML = dimensoesHTML;


    const quantidadeCell = row.insertCell();
    const quantidadeInput = document.createElement("input");
    quantidadeInput.type = "number";
    quantidadeInput.classList.add("quantidade-input");
    quantidadeInput.value = quantidade;
    quantidadeInput.readOnly = true;
    quantidadeCell.appendChild(quantidadeInput);

    const item = {
      material: {
          nome: material.nome,
          custoUnitario: material.custoUnitario
      },
      tipo: tipo,
      comprimento,
      largura,
      altura,
      volume,
      peso,
      quantidade
    }

    const custoTotal = calcularCustoTotalItem(item);
    row.insertCell().textContent = formatarMoeda(custoTotal);

    const actionsCell = row.insertCell();
    const removeButton = document.createElement('button');
    removeButton.textContent = "Remover";
    removeButton.onclick = () => removerLinhaMaterial(tbody.rows.length -1);
    actionsCell.appendChild(removeButton);

     document.getElementById('pesquisa-material').value = '';
     document.getElementById('resultados-pesquisa').innerHTML = '';
     document.getElementById('resultados-pesquisa').style.display = 'none';
}

async function editarProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);

    if (!produto) {
        alert('Produto não encontrado para edição.');
        return;
    }

    const tbody = document.querySelector("#tabela-materiais-produto tbody");
    tbody.innerHTML = "";

    document.getElementById("nome-produto").value = produto.nome;

    produto.materiais.forEach((item, itemIndex) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = item.material.nome;
        row.insertCell().textContent = item.tipo;
        row.insertCell().textContent = formatarMoeda(item.material.custoUnitario);

        const dimensoesCell = row.insertCell();
        let dimensoesHTML = "";

        if (item.tipo === "comprimento") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.comprimento}"> cm`;
        } else if (item.tipo === "area") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.largura}"> x <input type="number" class="dimensoes-input" value="${item.altura}"> cm`;
        } else if (item.tipo === "litro") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.volume}"> ml`;
        } else if (item.tipo === "quilo") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.peso}"> g`;
        } else if (item.tipo === "unidade") {
            dimensoesHTML = `<input type="number" class="dimensoes-input" value="${item.quantidade}"> un`;
        }
        dimensoesCell.innerHTML = dimensoesHTML;


        const quantidadeCell = row.insertCell();
        const quantidadeInput = document.createElement("input");
        quantidadeInput.type = "number";
        quantidadeInput.classList.add("quantidade-input");
        quantidadeInput.value = item.quantidade;
        quantidadeInput.readOnly = true;
        quantidadeCell.appendChild(quantidadeInput);

        const custoTotalCell = row.insertCell();
        custoTotalCell.textContent = formatarMoeda(item.custoTotal);

        const inputsDimensao = dimensoesCell.querySelectorAll('.dimensoes-input');
        inputsDimensao.forEach(input => {
            input.addEventListener('input', () => {
                const materialOriginal = materiais.find(m => m.nome === item.material.nome && m.tipo === item.tipo);

                if (item.tipo === "comprimento") {
                    item.comprimento = parseFloat(inputsDimensao[0].value) || 0;
                    item.quantidade = item.comprimento / materialOriginal.comprimentoCm;
                } else if (item.tipo === "area") {
                    item.largura = parseFloat(inputsDimensao[0].value) || 0;
                    item.altura = parseFloat(inputsDimensao[1].value) || 0;
                    item.quantidade = (item.largura * item.altura) / (materialOriginal.larguraCm * materialOriginal.alturaCm);
                } else if (item.tipo === "litro") {
                    item.volume = parseFloat(inputsDimensao[0].value) || 0;
                    item.quantidade = item.volume / materialOriginal.volumeMl;
                } else if (item.tipo === "quilo") {
                    item.peso = parseFloat(inputsDimensao[0].value) || 0;
                    item.quantidade = item.peso / materialOriginal.pesoG;
                } else if (item.tipo === "unidade") {
                    item.quantidade = parseFloat(inputsDimensao[0].value) || 0;
                }

                item.custoTotal = calcularCustoTotalItem(item);

                custoTotalCell.textContent = formatarMoeda(item.custoTotal);
                quantidadeInput.value = item.quantidade;

                produto.custoTotal = produto.materiais.reduce((total, i) => total + i.custoTotal, 0);

                atualizarTabelaProdutosCadastrados();
                if (document.getElementById('produto-pesquisa').value === produto.nome) {
                    carregarDadosProduto(produto);
                    calcularCustos();
                }
            });
        });

        const actionsCell = row.insertCell();
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remover";
        removeButton.onclick = () => removerLinhaMaterial(itemIndex);
        actionsCell.appendChild(removeButton);
    });

    produtoEmEdicao = produtoId;

    window.scrollTo(0, 0);
}

async function removerProduto(produtoId) {
    try {
        await deleteDoc(doc(db, "produtos", produtoId));
        atualizarTabelaProdutosCadastrados();
        salvarDados();
        alert('Produto removido do Firebase!');

    } catch (error) {
        console.error("Erro ao remover produto do Firebase:", error);
        alert('Erro ao remover produto do Firebase.');
    }
}

function removerLinhaMaterial(index) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    tbody.deleteRow(index);
}

function buscarProdutosAutocomplete() {
    const termo = document.getElementById('produto-pesquisa').value.toLowerCase();
    const resultadosDiv = document.getElementById('produto-resultados');
    resultadosDiv.innerHTML = '';

    if (!termo) {
        resultadosDiv.classList.add('hidden');
        return;
    }

    const resultados = produtos.filter(produto => produto.nome.toLowerCase().includes(termo));

    if (resultados.length > 0) {
        resultadosDiv.classList.remove('hidden');
        resultados.forEach(produto => {
            const div = document.createElement('div');
            div.textContent = produto.nome;
            div.onclick = () => selecionarProduto(produto);
            resultadosDiv.appendChild(div);
        });
    } else {
        resultadosDiv.classList.add('hidden');
    }
}

function selecionarProduto(produto) {
    document.getElementById('produto-pesquisa').value = produto.nome;
    document.getElementById('produto-resultados').classList.add('hidden');
    carregarDadosProduto(produto);
    calcularCustos();
}

function carregarDadosProduto(produto) {

    document.getElementById('custo-produto').textContent = formatarMoeda(produto.custoTotal);

    const listaMateriais = document.getElementById('lista-materiais-produto');
    listaMateriais.innerHTML = '';

    produto.materiais.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.material.nome} - ${item.quantidade} ${item.tipo} - ${formatarMoeda(item.custoTotal)}`;
        listaMateriais.appendChild(li);
    });

     document.getElementById('detalhes-produto').style.display = 'block';

}

function calcularCustos() {
    const produtoSelecionadoNome = document.getElementById('produto-pesquisa').value;
    const produtoSelecionado = produtos.find(p => p.nome === produtoSelecionadoNome);

    const custoProduto = produtoSelecionado ? produtoSelecionado.custoTotal : 0;
    document.getElementById('custo-produto').textContent = formatarMoeda(custoProduto);

    const horasProduto = parseFloat(document.getElementById('horas-produto').value) || 0;
    const custoMaoDeObra = maoDeObra.valorHora * horasProduto;
    const custoFerias13o = maoDeObra.custoFerias13o * horasProduto;
    const totalMaoDeObra = custoMaoDeObra + custoFerias13o;

    document.getElementById('custo-mao-de-obra-detalhe').textContent = formatarMoeda(custoMaoDeObra);
    document.getElementById('custo-ferias-13o-detalhe').textContent = formatarMoeda(custoFerias13o);
    document.getElementById('total-mao-de-obra').textContent = formatarMoeda(totalMaoDeObra);

    const todosCustosIndiretos = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais];
    const custosIndiretosAtivos = todosCustosIndiretos.filter(custo => custo.valorMensal > 0);
    const custoIndiretoTotalPorHora = custosIndiretosAtivos.reduce((total, custo) => total + (custo.valorMensal / maoDeObra.horas), 0);
    const custoIndiretoTotal = custoIndiretoTotalPorHora * horasProduto;
    document.getElementById('custo-indireto').textContent = formatarMoeda(custoIndiretoTotal);

    const listaCustosIndiretos = document.getElementById('lista-custos-indiretos-detalhes');
    listaCustosIndiretos.innerHTML = '';
    custosIndiretosAtivos.forEach(custo => {
        const li = document.createElement('li');
        const custoPorHora = custo.valorMensal / maoDeObra.horas;
        const custoTotalItem = custoPorHora * horasProduto;
        li.textContent = `${custo.descricao} - ${formatarMoeda(custoTotalItem)}`;
        listaCustosIndiretos.appendChild(li);
    });

      document.getElementById('detalhes-custos-indiretos').style.display = 'block';


    const subtotal = custoProduto + totalMaoDeObra + custoIndiretoTotal;
    document.getElementById('subtotal').textContent = formatarMoeda(subtotal);

    calcularPrecoVendaFinal();
}

function calcularPrecoVendaFinal() {
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const margemLucroFinal = parseFloat(document.getElementById('margem-lucro-final').value) || 0;

    const margemLucroValor = subtotal * (margemLucroFinal / 100);
    const totalFinal = subtotal + margemLucroValor;

    document.getElementById('margem-lucro-valor').textContent = formatarMoeda(margemLucroValor);
    document.getElementById('total-final').textContent = formatarMoeda(totalFinal);

    calcularTotalComTaxas();
}

async function salvarTaxaCredito() {
    taxaCredito.percentual = parseFloat(document.getElementById('taxa-credito-percentual').value);
    taxaCredito.incluir = document.getElementById('incluir-taxa-credito-sim').checked;

    try {
        await setDoc(doc(db, "configuracoes", "taxaCredito"), taxaCredito);
        calcularTotalComTaxas();
        salvarDados();
        console.log('Taxa de crédito salva no Firebase!');
    } catch (error) {
        console.error("Erro ao salvar taxa de crédito no Firebase:", error);
        alert('Erro ao salvar taxa de crédito no Firebase.');
    }
}

function calcularTotalComTaxas(){

  const total = parseFloat(document.getElementById('total-final').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

  if(document.getElementById('incluir-taxa-credito-sim').checked){
    const taxa = total * (taxaCredito.percentual/100);
    const totalComTaxas = total + taxa;
    document.getElementById('taxa-credito-valor').textContent = formatarMoeda(taxa);
    document.getElementById('total-final-com-taxas').textContent = formatarMoeda(totalComTaxas);
  } else{
    document.getElementById('taxa-credito-valor').textContent = formatarMoeda(0);
    document.getElementById('total-final-com-taxas').textContent = formatarMoeda(total);
  }
}

async function gerarNotaPrecificacao() {
    const nomeCliente = document.getElementById('nome-cliente').value || "Não informado";
    const produtoNome = document.getElementById('produto-pesquisa').value;
    const horasProduto = parseFloat(document.getElementById('horas-produto').value);
    const margemLucro = parseFloat(document.getElementById('margem-lucro-final').value);
    const totalFinal = parseFloat(document.getElementById('total-final').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const totalComTaxas = parseFloat(document.getElementById('total-final-com-taxas').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

    const produtoSelecionadoNome = document.getElementById('produto-pesquisa').value;
    const produtoSelecionado = produtos.find(p => p.nome === produtoSelecionadoNome);
    const custoProduto = produtoSelecionado ? produtoSelecionado.custoTotal : 0;

    const custoMaoDeObraDetalhe = parseFloat(document.getElementById('custo-mao-de-obra-detalhe').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const custoFerias13oDetalhe = parseFloat(document.getElementById('custo-ferias-13o-detalhe').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const totalMaoDeObra = parseFloat(document.getElementById('total-mao-de-obra').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

    const custoIndiretoTotal = parseFloat(document.getElementById('custo-indireto').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const listaCustosIndiretosDetalhes = [];
    const listaCustosIndiretosElementos = document.querySelectorAll('#lista-custos-indiretos-detalhes li');
    listaCustosIndiretosElementos.forEach(itemLi => {
        listaCustosIndiretosDetalhes.push(itemLi.textContent);
    });

    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const margemLucroValor = parseFloat(document.getElementById('margem-lucro-valor').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    const taxaCreditoValor = parseFloat(document.getElementById('taxa-credito-valor').textContent.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

    const detalhesMateriaisProduto = [];
    if (produtoSelecionado) {
        produtoSelecionado.materiais.forEach(item => {
            detalhesMateriaisProduto.push(`${item.material.nome} - ${item.quantidade} ${item.tipo} - ${formatarMoeda(item.custoTotal)}`);
        });
    }

    if (!produtoNome || isNaN(horasProduto) || isNaN(margemLucro) || isNaN(totalFinal)) {
        alert("Por favor, preencha todos os campos necessários para gerar a nota de precificação.");
        return;
    }

    const agora = new Date();
    const ano = agora.getFullYear();
    const numeroPrecificacao = proximoNumeroPrecificacao++;

    const precificacao = {
        numero: numeroPrecificacao,
        ano: ano,
        cliente: nomeCliente,
        produto: produtoNome,
        horas: horasProduto,
        margem: margemLucro,
        total: totalFinal,
        totalComTaxas: totalComTaxas,

        custoMateriais: custoProduto,
        detalhesMateriais: detalhesMateriaisProduto,
        custoMaoDeObraBase: custoMaoDeObraDetalhe,
        custoFerias13o: custoFerias13oDetalhe,
        totalMaoDeObra: totalMaoDeObra,
        custoIndiretoTotal: custoIndiretoTotal,
        detalhesCustosIndiretos: listaCustosIndiretosDetalhes,
        subtotal: subtotal,
        margemLucroValor: margemLucroValor,
        taxaCreditoValor: taxaCreditoValor
    };

    try {
        await addDoc(collection(db, "precificacoes-geradas"), precificacao);
        precificacoesGeradas.push(precificacoes);
        atualizarTabelaPrecificacoesGeradas();
        salvarDados();
        alert('Nota de precificação gerada e salva no Firebase!');

        document.getElementById('nome-cliente').value = '';
        document.getElementById('produto-pesquisa').value = '';
        document.getElementById('horas-produto').value = '1';
        document.getElementById('margem-lucro-final').value = margemLucroPadrao;

        calcularCustos();

    } catch (error) {
        console.error("Erro ao salvar nota de precificação no Firebase:", error);
        alert('Erro ao salvar nota de precificação no Firebase.');
    }
}

async function atualizarTabelaPrecificacoesGeradas() {
    const tbody = document.querySelector('#tabela-precificacoes-geradas tbody');
    tbody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "precificacoes-geradas"));
        precificacoesGeradas = [];
        querySnapshot.forEach((doc) => {
            precificacoesGeradas.push({ id: doc.id, ...doc.data() });
        });

        precificacoesGeradas.forEach((precificacao, index) => {
            const row = tbody.insertRow();

            row.insertCell().textContent = `${precificacao.numero}/${precificacao.ano}`;
            row.insertCell().textContent = precificacao.cliente;

            const actionsCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'Visualizar';
            viewButton.onclick = () => abrirPrecificacaoEmNovaJanela(precificacao.id);
            cellAcoes.appendChild(viewButton);
        });

    } catch (error) {
        console.error("Erro ao carregar precificações do Firebase:", error);
    }
}

function buscarPrecificacoesGeradas() {
    const termoBusca = document.getElementById('busca-precificacao').value.toLowerCase();
    const tbody = document.querySelector('#tabela-precificacoes-geradas tbody');
    tbody.innerHTML = '';

    precificacoesGeradas.filter(p =>
        `${p.numero}/${p.ano}`.toLowerCase().includes(termoBusca) ||
        p.cliente.toLowerCase().includes(termoBusca)
    ).forEach((precificacao) => {
        const row = tbody.insertRow();

        row.insertCell().textContent = `${precificacao.numero}/${precificacao.ano}`;
        row.insertCell().textContent = precificacao.cliente;

        const actionsCell = row.insertCell();
        const viewButton = document.createElement('button');
        viewButton.textContent = 'Visualizar';
        viewButton.onclick = () => abrirPrecificacaoEmNovaJanela(precificacao.id);
        cellAcoes.appendChild(viewButton);
    });
}

function visualizarPrecificacaoHTML(precificacaoId) {
    const precificacao = precificacoesGeradas.find(p => p.id === precificacaoId);

    if (!precificacao) {
        return "<p>Precificação não encontrada.</p>";
    }

    let htmlTabela = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Nota de Precificação Nº ${precificacao.numero}/${precificacao.ano}</title>
            <style>
                body { font-family: 'Roboto', Arial, sans-serif; }
                .tabela-precificacao-detalhada { width: 95%; border-collapse: collapse; margin: 20px auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); border-radius: 8px; overflow: hidden; border-spacing: 0; }
                .tabela-precificacao-detalhada th, .tabela-precificacao-detalhada td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.95em; }
                .tabela-precificacao-detalhada th { background-color: #7aa2a9; color: white; font-weight: bold; text-align: center; text-transform: uppercase; padding-top: 12px; padding-bottom: 12px; }
                .tabela-precificacao-detalhada td:first-child { font-weight: bold; color: #555; width: 40%; }
                .tabela-precificacao-detalhada td:nth-child(2) { width: 60%; }
                .tabela-precificacao-detalhada tbody tr:nth-child(even) { background-color: #f9f9f9; }
                .tabela-precificacao-detalhada tbody tr:hover { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h2>Nota de Precificação Nº ${precificacao.numero}/${precificacao.ano}</h2>
            <p><strong>Cliente:</strong> ${precificacao.cliente}</p>
            <table class="tabela-precificacao-detalhada">
                <thead>
                    <tr>
                        <th colspan="2">Detalhes da Precificação</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Produto:</strong></td>
                        <td>${precificacao.produto}</td>
                    </tr>
                    <tr>
                        <td><strong>Horas para Concluir:</strong></td>
                        <td>${precificacao.horas}</td>
                    </tr>
                    <tr>
                        <td><strong>Custo Total dos Materiais:</strong></td>
                        <td>${formatarMoeda(precificacao.custoMateriais)}</td>
                    </tr>
                     <tr>
                        <td><strong>Detalhes dos Materiais:</strong></td>
                        <td><ul>${precificacao.detalhesMateriais.map(detalhe => `<li>${detalhe}</li>`).join('')}</ul></td>
                    </tr>
                    <tr>
                        <td><strong>Custo Mão de Obra:</strong></td>
                        <td>${formatarMoeda(precificacao.totalMaoDeObra)}</td>
                    </tr>
                    <tr>
                        <td><strong>  • Custo Mão de Obra Base:</strong></td>
                        <td>${formatarMoeda(precificacao.custoMaoDeObraBase)}</td>
                    </tr>
                    <tr>
                        <td><strong>  • Custo 13º e Férias:</strong></td>
                        <td>${formatarMoeda(precificacao.custoFerias13o)}</td>
                    </tr>
                    <tr>
                        <td><strong>Custos Indiretos Totais:</strong></td>
                        <td>${formatarMoeda(precificacao.custoIndiretoTotal)}</td>
                    </tr>
                     <tr>
                        <td><strong>Detalhes Custos Indiretos:</strong></td>
                        <td><ul>${precificacao.detalhesCustosIndiretos.map(detalhe => `<li>${detalhe}</li>`).join('')}</ul></td>
                    </tr>
                    <tr>
                        <td><strong>Subtotal:</strong></td>
                        <td>${formatarMoeda(precificacao.subtotal)}</td>
                    </tr>
                    <tr>
                        <td><strong>Margem de Lucro (${precificacao.margem}%):</strong></td>
                        <td>${formatarMoeda(precificacao.margemLucroValor)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total (com Margem de Lucro):</strong></td>
                        <td>${formatarMoeda(precificacao.total)}</td>
                    </tr>
                    <tr>
                        <td><strong>Taxa de Compra a Crédito:</strong></td>
                        <td>${formatarMoeda(precificacao.taxaCreditoValor)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Final (com Taxas):</strong></td>
                        <td><strong>${formatarMoeda(precificacao.totalComTaxas)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </body>
        </html>
    `;
    return htmlTabela;
}

function abrirPrecificacaoEmNovaJanela(precificacaoId) {
    const htmlNota = visualizarPrecificacaoHTML(precificacaoId);
    if (!htmlNota) {
        alert("Erro ao gerar nota de precificação.");
        return;
    }

    const novaJanela = window.open('', '_blank');
    if (novaJanela) {
        novaJanela.document.open();
        novaJanela.document.write(htmlNota);
        novaJanela.document.close();
    } else {
        alert("Seu navegador pode ter bloqueado a abertura de uma nova janela. Permita pop-ups para este site.");
    }
}

function salvarDados() {
    const dados = {
        margemLucroPadrao,
        taxaCredito,
        proximoNumeroPrecificacao
    };
    localStorage.setItem('dadosPrecificacao', JSON.stringify(dados));
}

async function carregarDados() {
    try {
        const maoDeObraDoc = await getDocs(collection(db, "configuracoes"));
        maoDeObraDoc.forEach(doc => {
            if(doc.id === 'maoDeObra'){
                maoDeObra = { ...maoDeObra, ...doc.data() };
            }
            if(doc.id === 'taxaCredito'){
                taxaCredito = { ...taxaCredito, ...doc.data() };
            }
        });


        atualizarTabelaMateriaisInsumos();
        carregarCustosIndiretosPredefinidos();
        atualizarTabelaCustosIndiretos();
        atualizarTabelaProdutosCadastrados();
        atualizarTabelaPrecificacoesGeradas();


        document.getElementById('salario-receber').value = maoDeObra.salario;
        document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
        document.getElementById('incluir-ferias-13o-sim').checked = maoDeObra.incluirFerias13o;
        document.getElementById('incluir-ferias-13o-nao').checked = !maoDeObra.incluirFerias13o;
        calcularValorHora();
        calcularCustoFerias13o();

        const dadosSalvos = localStorage.getItem('dadosPrecificacao');
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            margemLucroPadrao = typeof dados.margemLucroPadrao === 'number' ? dados.margemLucroPadrao : margemLucroPadrao;
            taxaCredito = dados.taxaCredito || taxaCredito;
            proximoNumeroPrecificacao = typeof dados.proximoNumeroPrecificacao === 'number' ? dados.proximoNumeroPrecificacao : proximoNumeroPrecificacao;

            document.getElementById('margem-lucro-final').value = margemLucroPadrao;
            document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
            document.getElementById('incluir-taxa-credito-sim').checked = taxaCredito.incluir;
            document.getElementById('incluir-taxa-credito-nao').checked = !taxaCredito.incluir;
        }

        calcularCustos();

    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        alert("Erro ao carregar dados do Firebase. Verifique o console para mais detalhes.");
    }
}
