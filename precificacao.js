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
let materialEmEdicao = null; // Variável para controlar a edição de materiais
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

// Função para atualizar os custos dos produtos que usam um determinado material
// MODIFICADA: atualizarCustosProdutosPorMaterial - Usa o ID do material para comparação
async function atualizarCustosProdutosPorMaterial(material) {
    if (!material || !material.id) {
        console.error("Material inválido ou sem ID:", material);
        return;
    }

    const produtosImpactados = produtos.filter(produto =>
        produto.materiais.some(item => item.materialId === material.id) // Compara pelo ID
    );

    for (const produto of produtosImpactados) {
        for (const item of produto.materiais) {
            if (item.materialId === material.id) { // Compara pelo ID
                item.material.custoUnitario = material.custoUnitario;
                item.custoTotal = calcularCustoTotalItem(item);
            }
        }
        produto.custoTotal = produto.materiais.reduce((total, item) => total + item.custoTotal, 0);

        // Atualiza no Firestore *cada* produto modificado
        try {
            await updateDoc(doc(db, "produtos", produto.id), {
                materiais: produto.materiais,
                custoTotal: produto.custoTotal
            });
        } catch (error) {
            console.error("Erro ao atualizar produto no Firestore:", error);
            // Não interrompe a execução, mas loga o erro
        }
    }

    atualizarTabelaProdutosCadastrados();
    const produtoSelecionadoNome = document.getElementById('produto-pesquisa').value;
    if (produtoSelecionadoNome) {
        const produtoSelecionado = produtos.find(p => p.nome === produtoSelecionadoNome);
        if (produtoSelecionado) {
            carregarDadosProduto(produtoSelecionado);
            calcularCustos();
        }
    }
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
        if (materialEmEdicao) {
            // Modo de Edição: Atualiza o material existente
            await updateDoc(doc(db, "materiais-insumos", materialEmEdicao.id), {
                nome: material.nome,
                tipo: material.tipo,
                valorTotal: material.valorTotal,
                comprimentoCm: material.comprimentoCm,
                volumeMl: material.volumeMl,
                pesoG: material.pesoG,
                larguraCm: material.larguraCm,
                alturaCm: material.alturaCm,
                custoUnitario: material.custoUnitario
            });

            // Atualiza o material no array local 'materiais'
            const index = materiais.findIndex(m => m.id === materialEmEdicao.id);
            if (index !== -1) {
                materiais[index] = { id: materialEmEdicao.id, ...material };
                 // Atualiza os custos dos produtos que usam este material
                await atualizarCustosProdutosPorMaterial(materiais[index]);
            }


            alert('Material/Insumo atualizado com sucesso!');
            materialEmEdicao = null; // Sai do modo de edição

        } else {
            // Modo de Cadastro: Adiciona um novo material

            // Adiciona o material e *obtém* o ID gerado
            const docRef = await addDoc(collection(db, "materiais-insumos"), material);
            material.id = docRef.id; // Adiciona o ID ao objeto material
            materiais.push({ id: material.id, ...material }); // Adiciona ao array local com o ID

            alert('Material/Insumo cadastrado com sucesso no Firebase!');
        }

        atualizarTabelaMateriaisInsumos();
        limparFormulario('form-materiais-insumos');


    } catch (error) {
        console.error("Erro ao cadastrar/atualizar material no Firebase:", error);
        alert('Erro ao cadastrar/atualizar material/insumo no Firebase.');
    }
}



async function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, "materiais-insumos"));
        materiais = [];  // Limpa o array 'materiais'
        querySnapshot.forEach((doc) => {
            materiais.push({ id: doc.id, ...doc.data() });
        });

        // ---  PREENCHIMENTO DA TABELA DE MATERIAIS  ---
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
            row.insertCell().textContent = formatarMoeda(material.valorTotal); // Valor de Loja
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
        console.error("Erro ao carregar/atualizar materiais do Firebase:", error);
    }
}

// Corrigida: buscarMateriaisCadastrados
function buscarMateriaisCadastrados() {
    const termoBusca = document.getElementById('busca-material').value.toLowerCase();
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    tbody.innerHTML = '';  // Limpa a tabela antes de repopular

    // Filtra e itera, *tudo em um comando*:
    materiais.filter(material => material.nome.toLowerCase().includes(termoBusca))
        .forEach(material => {
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
            row.insertCell().textContent = formatarMoeda(material.valorTotal);
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

    // Entra em modo de edição
    materialEmEdicao = material;

    //Preenche os campos do formulário
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
    //Foco no primeiro campo
    document.getElementById('nome-material').focus();
}

// MODIFICADA:  Função com a lógica de bloqueio e aviso.
async function removerMaterialInsumo(materialId, isEditing = false) {
    // 1. VERIFICAÇÃO DE USO:  Verifica se o material está sendo usado em algum produto.
    const materialEmUso = produtos.some(produto =>
        produto.materiais.some(item => item.materialId === materialId)
    );

    // 2. BLOQUEIO E AVISO: Se estiver em uso, bloqueia a exclusão e mostra o aviso.
    if (materialEmUso) {
        // ---  Mensagem de erro mais detalhada (conforme sugerido)  ---
        let produtosAfetados = produtos.filter(produto =>
            produto.materiais.some(item => item.materialId === materialId)
        ).map(produto => produto.nome); // Obtém os nomes

        let mensagem = "Este material não pode ser removido porque está sendo utilizado nos seguintes produtos:\n\n";
        mensagem += produtosAfetados.join("\n"); // Formata a lista
        mensagem += "\n\nRemova ou substitua o material desses produtos antes de excluí-lo.";
        alert(mensagem);
        return; // Interrompe a execução da função aqui.
    }

    // 3. EXCLUSÃO (se não estiver em uso):  Se não estiver em uso, prossegue com a exclusão.
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

        maoDeObra = maoDeObraData; // Atualiza a variável global

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

        // ***  PARTE CRUCIAL:  Recalcular e Atualizar Custos Indiretos ***
        await atualizarCustosIndiretosAposMudancaMaoDeObra(); // Chamada da nova função

        calcularCustos(); // Recalcula a precificação (se necessário)
        salvarDados();     // Salva no localStorage (se necessário)

    } catch (error) {
        console.error("Erro ao salvar dados de mão de obra no Firebase:", error);
        alert('Erro ao salvar dados de mão de obra no Firebase.');
    }
}

function editarMaoDeObra() { // Removido o async, pois não há await aqui.
    modoEdicaoMaoDeObra = false;

    document.getElementById('salario-receber').readOnly = false;
    document.getElementById('horas-trabalhadas').readOnly = false;

    document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
    document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';

    document.getElementById('mao-de-obra').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('titulo-mao-de-obra').textContent = 'Informações sobre custo de mão de obra';
}
// ==== FIM SEÇÃO - FUNÇÕES MÃO DE OBRA ====

// ==== INÍCIO - NOVA FUNÇÃO: Atualização dos Custos Indiretos ====

async function atualizarCustosIndiretosAposMudancaMaoDeObra() {
    const horasTrabalhadas = maoDeObra.horas;

    if (!horasTrabalhadas || horasTrabalhadas <= 0) {
        // Se as horas não estiverem definidas, não fazemos nada.
        // Poderíamos, opcionalmente, mostrar um aviso aqui.
        return;
    }

        // 1. Atualizar Custos Indiretos Predefinidos
    for (const custo of custosIndiretosPredefinidos) {
        // Não precisa mais buscar o custo no array, pois estamos iterando diretamente
        const valorPorHora = custo.valorMensal / horasTrabalhadas;
        custo.valorPorHora = valorPorHora; // Adiciona/atualiza a propriedade

        // Atualizar no DOM, se necessário (dentro do loop, para cada custo):
         const index = custosIndiretosPredefinidos.indexOf(custo);
         if (index !== -1) {
           const inputValor = document.getElementById(`custo-indireto-${index}`);
           if(inputValor){
              inputValor.value = custo.valorMensal.toFixed(2); // Mantem valor mensal no input
           }
         }

    }


    // 2. Atualizar Custos Indiretos Adicionais (no Firebase)
    for (const custo of custosIndiretosAdicionais) {
        const valorPorHora = custo.valorMensal / horasTrabalhadas;
          custo.valorPorHora = valorPorHora;

        try {
             // Atualiza *cada* custo adicional no Firestore
            await updateDoc(doc(db, "custos-indiretos-adicionais", custo.id), {
               valorPorHora: valorPorHora // Atualiza o valor por hora no firestore
            });

        } catch (error) {
            console.error("Erro ao atualizar custo indireto adicional no Firebase:", error);
            // Não interrompe a execução, mas loga o erro.
        }
    }

    // 3. Atualizar a Tabela (agora usa os valores recalculados)
    atualizarTabelaCustosIndiretos();
}

// ==== FIM - NOVA FUNÇÃO: Atualização dos Custos Indiretos ====

// ==== INÍCIO SEÇÃO - FUNÇÕES CUSTOS INDIRETOS ====
async function carregarCustosIndiretosPredefinidos() {
    const listaCustos = document.getElementById('lista-custos-indiretos');
    listaCustos.innerHTML = '';

    // ... (parte dos custos predefinidos permanece a mesma) ...
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
    // --- FIM DA PARTE DOS CUSTOS PREDEFINIDOS ---

    try {
        const querySnapshot = await getDocs(collection(db, "custos-indiretos-adicionais"));
        custosIndiretosAdicionais = [];  // Limpa o array ANTES de popular
        querySnapshot.forEach((doc) => {
            custosIndiretosAdicionais.push({ id: doc.id, ...doc.data() });
        });

        custosIndiretosAdicionais.forEach((custo) => {
            const listItem = document.createElement('li');
            listItem.dataset.index = custo.tempIndex; // Usar tempIndex
            listItem.innerHTML = `
                <div class="custo-item-nome">${custo.descricao}</div>
                <input type="number" value="${custo.valorMensal.toFixed(2)}" step="0.01">
                <button class="salvar-novo-custo-indireto-btn" data-id="${custo.id}" data-index="${custo.tempIndex}">Salvar</button>
                <button class="remover-novo-custo-indireto-btn" data-id="${custo.id}" data-index="${custo.tempIndex}">Remover</button>
            `;
            listaCustos.appendChild(listItem);

            // ***  CORREÇÃO:  Adicionar os event listeners *AQUI* ***
            const salvarBtn = listItem.querySelector('.salvar-novo-custo-indireto-btn');
            const removerBtn = listItem.querySelector('.remover-novo-custo-indireto-btn');

            if (salvarBtn && removerBtn) {
                salvarBtn.addEventListener('click', function() { salvarNovoCustoIndiretoLista(this); });
                removerBtn.addEventListener('click', function() { removerNovoCustoIndiretoLista(this); });
            }
        });

        atualizarTabelaCustosIndiretos();

    } catch (error) {
        console.error("Erro ao carregar custos indiretos adicionais do Firebase:", error);
    }

    // ... (restante da função: event listeners para botões predefinidos, etc.) ...
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

        // Adiciona event listeners para os botões "Salvar" de novos custos indiretos.
        //REMOVIDO, POIS JÁ FOI ADICIONADO
        //const botoesSalvarNovosCustos = document.querySelectorAll('.salvar-novo-custo-indireto-btn');
        //botoesSalvarNovosCustos.forEach(botao => {
        //    botao.addEventListener('click', function() {
        //        salvarNovoCustoIndiretoLista(this);
        //    });
        //});
}

// MODIFICADA:  salvarCustoIndiretoPredefinido (agora salva no Firestore)
async function salvarCustoIndiretoPredefinido(descricao, index) {
    const inputValor = document.getElementById(`custo-indireto-${index}`);
    const novoValor = parseFloat(inputValor.value);

    if (!isNaN(novoValor)) {
        const custoParaAtualizar = custosIndiretosPredefinidos.find(c => c.descricao === descricao);
        if(custoParaAtualizar){
            custoParaAtualizar.valorMensal = novoValor;
            custoParaAtualizar.valorPorHora = novoValor / maoDeObra.horas; // Calcula o valor por hora
            try {
                // Salva no Firestore.  Usamos setDoc com o ID sendo a descrição.
                await setDoc(doc(db, "custos-indiretos-predefinidos", descricao), custoParaAtualizar);
                alert("Custo indireto predefinido salvo com sucesso!"); // Mensagem de sucesso

            } catch (error) {
                console.error("Erro ao salvar custo indireto predefinido no Firebase:", error);
                alert("Erro ao salvar custo indireto predefinido. Tente novamente.");
                return; // Importante:  Sai da função em caso de erro.
            }
        }

        atualizarTabelaCustosIndiretos(); // Atualiza a exibição
        calcularCustos();               // Recalcula a precificação
        salvarDados();                 // Salva no localStorage (opcional, mas recomendado)

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

// MODIFICADA: salvarNovoCustoIndiretoLista (agora salva valorPorHora no Firestore e tem mensagem)
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
            valorPorHora: valorMensal / maoDeObra.horas, // Calcula e armazena valorPorHora
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

            const custoExistenteIndex = custosIndiretosAdicionais.findIndex(c => c.tempIndex === index);
            if (custoExistenteIndex !== -1) {
                custosIndiretosAdicionais[custoExistenteIndex] = { id: custoId, ...custoData };
            } else {
                custosIndiretosAdicionais.push({ id: custoId, ...custoData });
            }

            atualizarTabelaCustosIndiretos(); // Usa os valores corretos
            calcularCustos();                // Recalcula
            salvarDados();                  // Salva
            alert("Custo indireto adicional salvo com sucesso!"); // Mensagem de sucesso

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

// MODIFICADA: atualizarTabelaCustosIndiretos (agora usa valorPorHora)
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

     // Filtra para exibir apenas custos > 0 (ou com valorPorHora, se já tiver sido calculado)
    const custosPredefinidosParaExibir = custosIndiretosPredefinidos.filter(custo => custo.valorMensal > 0 || custo.valorPorHora > 0);
    const custosAdicionaisParaExibir = custosIndiretosAdicionais.filter(custo => custo.valorMensal > 0 || custo.valorPorHora > 0);

    custosPredefinidosParaExibir.forEach((custo) => { // Removido o index
        const row = tbody.insertRow();
        row.insertCell().textContent = custo.descricao;
        row.insertCell().textContent = formatarMoeda(custo.valorMensal);

        // Usa o valorPorHora, se existir.  Senão, calcula (mas não salva).
        const valorPorHora = custo.valorPorHora !== undefined ? custo.valorPorHora : custo.valorMensal / horasTrabalhadas;
        row.insertCell().textContent = formatarMoeda(valorPorHora);

        const cellAcoes = row.insertCell();
        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(custo.descricao, 'predefinido');
        cellAcoes.appendChild(botaoZerar);
    });

    custosAdicionaisParaExibir.forEach((custo) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = custo.descricao;
        row.insertCell().textContent = formatarMoeda(custo.valorMensal);

         // Usa o valorPorHora, se existir.  Senão, calcula (mas não salva).
        const valorPorHora = custo.valorPorHora !== undefined ? custo.valorPorHora : custo.valorMensal / horasTrabalhadas;
        row.insertCell().textContent = formatarMoeda(valorPorHora);


        const cellAcoes = row.insertCell();
        const botaoZerar = document.createElement('button');
        botaoZerar.textContent = 'Zerar';
        botaoZerar.onclick = () => zerarCustoIndireto(custo.id, 'adicional');
        cellAcoes.appendChild(botaoZerar);
    });
}

// MODIFICADA: buscarCustosIndiretosCadastrados (agora usa valorPorHora e lida com custos zerados)
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

    // Combina os arrays, filtra, e *depois* faz a busca.
    const custosExibicao = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais]
       .filter(custo => custo.valorMensal > 0 || custo.valorPorHora > 0); // Garante que custos zerados *apareçam* se tiverem sido calculados antes.
    const custosFiltrados = custosExibicao.filter(custo => custo.descricao.toLowerCase().includes(termoBusca));

   custosFiltrados.forEach((custo) => {

        // Mesma lógica de exibição da atualizarTabelaCustosIndiretos
        const row = tbody.insertRow();
        row.insertCell().textContent = custo.descricao;
        row.insertCell().textContent = formatarMoeda(custo.valorMensal);
        const valorPorHora = custo.valorPorHora !== undefined ? custo.valorPorHora : custo.valorMensal / horasTrabalhadas;
        row.insertCell().textContent = formatarMoeda(valorPorHora);

        const cellAcoes = row.insertCell();
        let botaoAcao;
        if (custosIndiretosPredefinidos.some(c => c.descricao === custo.descricao)) {
            botaoAcao = document.createElement('button');
            botaoAcao.textContent = 'Zerar';
            botaoAcao.onclick = () => zerarCustoIndireto(custo.descricao, 'predefinido');
        } else if (custosIndiretosAdicionais.some(c => c.id === custo.id)) {
            botaoAcao = document.createElement('button');
            botaoAcao.textContent = 'Zerar';
            botaoAcao.onclick = () => zerarCustoIndireto(custo.id, 'adicional');
        }
        if (botaoAcao) cellAcoes.appendChild(botaoAcao);
    });
}


// MODIFICADA:  zerarCustoIndireto (agora zera valorPorHora também, e lida com Firestore)
async function zerarCustoIndireto(identificador, tipo) {
    if (tipo === 'predefinido') {
        const index = custosIndiretosPredefinidos.findIndex(c => c.descricao === identificador);
        if (index !== -1) {
             custosIndiretosPredefinidos[index].valorMensal = 0;
             custosIndiretosPredefinidos[index].valorPorHora = 0; // Zera valorPorHora
             document.getElementById(`custo-indireto-${index}`).value = '0.00';
              // Zera no firestore
             try {
                await setDoc(doc(db, "custos-indiretos-predefinidos", identificador),  custosIndiretosPredefinidos[index]);
            } catch (error) {
                console.error("Erro ao zerar custo indireto predefinido no Firebase:", error);
                alert("Erro ao zerar custo indireto predefinido. Tente novamente.");
                return;
            }
        }
    } else if (tipo === 'adicional') {
        try {
            // Zera *ambos* os valores no Firestore
            await updateDoc(doc(db, "custos-indiretos-adicionais", identificador), {
                valorMensal: 0,
                valorPorHora: 0
            });

            const custoAdicionalIndex = custosIndiretosAdicionais.findIndex(c => c.id === identificador);
            if (custoAdicionalIndex !== -1) {
                custosIndiretosAdicionais[custoAdicionalIndex].valorMensal = 0;
                custosIndiretosAdicionais[custoAdicionalIndex].valorPorHora = 0; // Zera
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
// ==== FIM SEÇÃO - FUNÇÕES CUSTOS INDIRETOS ====


// ==== INÍCIO SEÇÃO - FUNÇÕES PRODUTOS CADASTRADOS ====
//MODIFICADA: cadastrarProduto - Adiciona materialId ao item
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

        // Coleta os valores dos inputs, usando os data-atributos para identificar o tipo
        let comprimento = 0, largura = 0, altura = 0, volume = 0, peso = 0, quantidadeMaterial = 0;
        if (tipoMaterial === "comprimento") {
            comprimento = parseFloat(linha.querySelector('.dimensoes-input[data-tipo="comprimento"]').value) || 0;
        } else if (tipoMaterial === "area") {
            largura = parseFloat(linha.querySelector('.dimensoes-input[data-tipo="largura"]').value) || 0;
            altura = parseFloat(linha.querySelector('.dimensoes-input[data-tipo="altura"]').value) || 0;
        } else if (tipoMaterial === "litro") {
            volume = parseFloat(linha.querySelector('.dimensoes-input[data-tipo="volume"]').value) || 0;
        } else if (tipoMaterial === "quilo") {
            peso = parseFloat(linha.querySelector('.dimensoes-input[data-tipo="peso"]').value) || 0;
        } else if (tipoMaterial === "unidade") {
            quantidadeMaterial = parseFloat(linha.querySelector('.dimensoes-input[data-tipo="quantidadeMaterial"]').value) || 0;
        }
        const quantidade = parseFloat(linha.querySelector('.quantidade-input').value) || 0;


        const materialOriginal = materiais.find(m => m.nome === nomeMaterial);

         // Verifica se o materialOriginal foi encontrado
        if (!materialOriginal) {
            console.error("Material original não encontrado:", nomeMaterial);
            return; // Sai do loop se o material não for encontrado
        }


        const item = {
            materialId: materialOriginal.id, // Adiciona o ID do material
            material: {
                nome: materialOriginal.nome,
                custoUnitario: materialOriginal.custoUnitario
            },
            tipo: tipoMaterial,
            comprimento,  // Valores originais (cm, ml, g, etc.)
            largura,      // Valores originais (cm, ml, g, etc.)
            altura,       // Valores originais (cm, ml, g, etc.)
            volume,       // Valores originais (cm, ml, g, etc.)
            peso,          // Valores originais (cm, ml, g, etc.)
            quantidade,     // Quantidade
            quantidadeMaterial, // Quantidade do material *dentro* do produto
            custoTotal: calcularCustoTotalItem({ // Passa o objeto item completo
                material: materialOriginal,
                tipo: tipoMaterial,
                comprimento,
                largura,
                altura,
                volume,
                peso,
                quantidade,
                quantidadeMaterial
            })
        };

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
            // --- LÓGICA DE EDIÇÃO ---
            await updateDoc(doc(db, "produtos", produtoEmEdicao.id), produtoData);
            alert('Produto atualizado com sucesso no Firebase!');

        } else {
            // --- LÓGICA DE CADASTRO ---
            const docRef = await addDoc(collection(db, "produtos"), produtoData);
            produtoData.id = docRef.id; // Adiciona o ID ao objeto local
            produtos.push(produtoData); // Adiciona o novo produto ao array local
            alert('Produto cadastrado com sucesso no Firebase!');
        }

        // Limpa o formulário e a tabela
        document.getElementById('form-produtos-cadastrados').reset();
        document.querySelector('#tabela-materiais-produto tbody').innerHTML = '';

        // Atualiza a tabela de produtos cadastrados
        atualizarTabelaProdutosCadastrados();
        //salvarDados(); // Salva os dados no localStorage (opcional)  - Removido, pois a atualização já ocorre
        produtoEmEdicao = null;


    } catch (error) {
        console.error("Erro ao cadastrar/atualizar produto no Firebase:", error);
        alert('Erro ao cadastrar/atualizar produto no Firebase.');
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
                    dimensaoTexto = `${item.quantidadeMaterial} un`; // Modificado para quantidadeMaterial
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

// Função de busca de produtos (CORRIGIDA)
function buscarProdutosCadastrados() {
    const termoBusca = document.getElementById('busca-produto').value.toLowerCase();
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = ''; // Limpa a tabela antes de repopular

    // 1. FILTRAGEM:  Filtra os produtos.
    produtos.filter(produto => {
        // Verifica se o termo de busca está no nome do produto
        const buscaNoNome = produto.nome.toLowerCase().includes(termoBusca);

        // Verifica se o termo de busca está em ALGUM dos nomes dos materiais
        const buscaNosMateriais = produto.materiais.some(item =>
            item.material.nome.toLowerCase().includes(termoBusca)
        );

        // Retorna true SE (buscaNoNome OU buscaNosMateriais) forem verdadeiros
        return buscaNoNome || buscaNosMateriais;

    }).forEach(produto => { // 2. ITERAÇÃO:  Itera sobre os produtos FILTRADOS
        // (O restante do código dentro do forEach permanece o mesmo)

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
                dimensaoTexto = `${item.quantidadeMaterial} un`; // Corrigido
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
}

//MODIFICADA: adicionarMaterialNaTabelaProduto - Usa o ID do material
function adicionarMaterialNaTabelaProduto(material, tipo, quantidade, comprimento, largura, altura, volume, peso) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    const row = tbody.insertRow();

    row.insertCell().textContent = material.nome;
    row.insertCell().textContent = tipo;
    row.insertCell().textContent = formatarMoeda(material.custoUnitario);

    const dimensoesCell = row.insertCell();
    let dimensoesHTML = "";
    let quantidadeValue = isNaN(quantidade) ? 1 : quantidade; // Valor padrão e tratamento para NaN
    let comprimentoValue = comprimento || 0;  //Inicializa com zero
    let larguraValue = largura || 0; //Inicializa com zero
    let alturaValue = altura || 0;   //Inicializa com zero
    let volumeValue = volume || 0; //Inicializa com zero
    let pesoValue = peso || 0;  //Inicializa com zero
    let quantidadeMaterialValue = 1; // Inicializa quantidadeMaterial


     if (tipo === "comprimento") {
        comprimentoValue = material.comprimentoCm; // Valor inicial em CM
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${comprimentoValue}" data-tipo="comprimento"> cm`;
    } else if (tipo === "area") {
        larguraValue = material.larguraCm;
        alturaValue = material.alturaCm;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${larguraValue}" data-tipo="largura"> x <input type="number" class="dimensoes-input" value="${alturaValue}" data-tipo="altura"> cm`;
    } else if (tipo === "litro") {
        volumeValue = material.volumeMl;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${volumeValue}" data-tipo="volume"> ml`;
    } else if (tipo === "quilo") {
        pesoValue = material.pesoG;
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${pesoValue}" data-tipo="peso"> g`;
    } else if (tipo === "unidade") {
        quantidadeValue = quantidade || 1; // Usa a quantidade passada, ou 1 como padrão
        dimensoesHTML = `<input type="number" class="dimensoes-input" value="${quantidadeValue}" data-tipo="quantidadeMaterial"> un`; // Mudança aqui
        quantidadeMaterialValue = quantidadeValue; // Atualiza quantidadeMaterial
    }
    dimensoesCell.innerHTML = dimensoesHTML;

    const quantidadeCell = row.insertCell();
    const quantidadeInput = document.createElement("input");
    quantidadeInput.type = "number";
    quantidadeInput.classList.add("quantidade-input");
    quantidadeInput.value = quantidadeValue;
    quantidadeCell.appendChild(quantidadeInput);


    // ---  CRIAÇÃO DO OBJETO ITEM  ---
    const item = {
      materialId: material.id, // Adiciona o ID do material
      material: {
          nome: material.nome,
          custoUnitario: material.custoUnitario
      },
      tipo: tipo,
      comprimento: comprimentoValue,  //Armazena o valor em CM
      largura: larguraValue,         //Armazena o valor em CM
      altura: alturaValue,            //Armazena o valor em CM
      volume: volumeValue,            //Armazena o valor em ML
      peso: pesoValue,               //Armazena o valor em G
      quantidade: quantidadeValue,  // Quantidade utilizada
      quantidadeMaterial: quantidadeMaterialValue // Adiciona quantidadeMaterial
    };

    // --- CÁLCULO INICIAL DO CUSTO TOTAL ---
    const custoTotal = calcularCustoTotalItem(item);
    row.insertCell().textContent = formatarMoeda(custoTotal);

    // --- BOTÃO REMOVER ---
    const actionsCell = row.insertCell();
    const removeButton = document.createElement('button');
    removeButton.textContent = "Remover";
    removeButton.onclick = () => removerLinhaMaterial(row.rowIndex -1);  //Passa o Index correto
    actionsCell.appendChild(removeButton);


    // --- EVENT LISTENERS PARA ATUALIZAÇÃO ---
    // Adiciona event listeners para recalcular o custo quando as dimensões/quantidade mudarem
    dimensoesCell.querySelectorAll('.dimensoes-input').forEach(input => {
        input.addEventListener('input', () => atualizarCustoLinha(row, item));
    });
    quantidadeInput.addEventListener('input', () => atualizarCustoLinha(row, item));


     document.getElementById('pesquisa-material').value = '';
     document.getElementById('resultados-pesquisa').innerHTML = '';
     document.getElementById('resultados-pesquisa').style.display = 'none';
}

// --- FUNÇÃO AUXILIAR: atualizarCustoLinha ---
function atualizarCustoLinha(row, item) {
    // Atualiza os valores no objeto 'item' com base nos inputs
    item.quantidade = parseFloat(row.querySelector('.quantidade-input').value) || 0;

    if (item.tipo === "comprimento") {
        item.comprimento = parseFloat(row.querySelector('.dimensoes-input[data-tipo="comprimento"]').value) || 0;
    } else if (item.tipo === "area") {
        item.largura = parseFloat(row.querySelector('.dimensoes-input[data-tipo="largura"]').value) || 0;
        item.altura = parseFloat(row.querySelector('.dimensoes-input[data-tipo="altura"]').value) || 0;
    } else if (item.tipo === "litro") {
        item.volume = parseFloat(row.querySelector('.dimensoes-input[data-tipo="volume"]').value) || 0;
    } else if (item.tipo === "quilo") {
        item.peso = parseFloat(row.querySelector('.dimensoes-input[data-tipo="peso"]').value) || 0;
    } else if (item.tipo === "unidade") {
        item.quantidadeMaterial = parseFloat(row.querySelector('.dimensoes-input[data-tipo="quantidadeMaterial"]').value) || 0; // Atualiza quantidadeMaterial
    }


    // Recalcula o custo total
    const novoCustoTotal = calcularCustoTotalItem(item);
    row.cells[5].textContent = formatarMoeda(novoCustoTotal); // Atualiza a célula de custo total
}

// --- FUNÇÃO AUXILIAR: removerLinhaMaterial ---
function removerLinhaMaterial(rowIndex) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    tbody.deleteRow(rowIndex); //Remove pelo rowIndex
}

//Mantida: calcularCustoTotalItem
function calcularCustoTotalItem(item) {
    let custoTotal = 0;
    let quantidade = item.quantidade || 1; // Garante que quantidade seja pelo menos 1

    if (item.tipo === "comprimento") {
        custoTotal = item.material.custoUnitario * (item.comprimento / 100) * quantidade;
    } else if (item.tipo === "area") {
        custoTotal = item.material.custoUnitario * (item.largura * item.altura / 10000) * quantidade;
    } else if (item.tipo === "litro") {
        custoTotal = item.material.custoUnitario * (item.volume / 1000) * quantidade;
    } else if (item.tipo === "quilo") {
        custoTotal = item.material.custoUnitario * (item.peso / 1000) * quantidade;
    } else if (item.tipo === "unidade") {
        // Aqui está a mudança:
        let quantidadeMaterial = item.quantidadeMaterial || 1; // Quantidade do material *dentro* do produto.
        custoTotal = item.material.custoUnitario * quantidadeMaterial * quantidade;
    }
    return custoTotal;
}

//MODIFICADA: editarProduto - Corrige a busca do material completo
async function editarProduto(produtoId) {
    produtoEmEdicao = produtos.find(p => p.id === produtoId);

    if (!produtoEmEdicao) {
        alert('Produto não encontrado para edição.');
        return;
    }

    // Preenche o campo de nome do produto
    document.getElementById('nome-produto').value = produtoEmEdicao.nome;

    // Limpa a tabela de materiais atual
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    tbody.innerHTML = '';

    // Preenche a tabela de materiais com os dados do produto
    produtoEmEdicao.materiais.forEach(item => {
        
              // Encontra o material original completo no array 'materiais' USANDO O ID
        const materialCompleto = materiais.find(m => m.id === item.materialId);


        if (materialCompleto) { //Verifica se achou o material
            adicionarMaterialNaTabelaProduto(
                materialCompleto,  // Passa o material completo
                item.tipo,
                item.quantidade,
                item.comprimento,  // Passa os valores originais (cm, ml, g, etc.)
                item.largura,      // Passa os valores originais (cm, ml, g, etc.)
                item.altura,       // Passa os valores originais (cm, ml, g, etc.)
                item.volume,       // Passa os valores originais (cm, ml, g, etc.)
                item.peso          // Passa os valores originais (cm, ml, g, etc.)
            );
        } else{
            console.error("Material completo não encontrado para item:", item);
        }

    });

    // Rola a página para o formulário de cadastro
    document.getElementById('form-produtos-cadastrados').scrollIntoView({ behavior: 'smooth' });
}

async function removerProduto(produtoId) {
    if (confirm('Tem certeza que deseja remover este produto?')) {
        try {
            await deleteDoc(doc(db, "produtos", produtoId));
            // Remove o produto do array local 'produtos'
            produtos = produtos.filter(p => p.id !== produtoId);
            atualizarTabelaProdutosCadastrados();
            alert('Produto removido com sucesso do Firebase!');
        } catch (error) {
            console.error("Erro ao remover produto do Firebase:", error);
            alert('Erro ao remover produto do Firebase.');
        }
    }
}
// ===== INÍCIO - MODIFICAÇÃO PARA AUTOCOMPLETE DE MATERIAIS =====
//MODIFICADA: buscarMateriaisAutocomplete, selecionarMaterial -  Usa o ID
function buscarMateriaisAutocomplete() {
    const termo = document.getElementById('pesquisa-material').value.toLowerCase();
    const resultadosDiv = document.getElementById('resultados-pesquisa');
    resultadosDiv.innerHTML = '';
    resultadosDiv.style.display = 'block'; // Garante que a div de resultados seja exibida

    if (!termo) {
        resultadosDiv.classList.add('hidden');
        return;
    }

    const resultados = materiais.filter(material => material.nome.toLowerCase().includes(termo));

    if (resultados.length > 0) {
        resultadosDiv.classList.remove('hidden');
        resultados.forEach(material => {
            const div = document.createElement('div');
            div.textContent = material.nome;
            div.onclick = () => selecionarMaterial(material);
            resultadosDiv.appendChild(div);
        });
    } else {
        resultadosDiv.classList.add('hidden');
    }
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
// ==== FIM SEÇÃO - FUNÇÕES PRODUTOS CADASTRADOS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES CÁLCULO DE PRECIFICAÇÃO ====
// MODIFICADA: calcularCustos (usa valorPorHora dos custos indiretos)
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

    // Soma os custos indiretos *por hora* e multiplica pelas horas do produto.
    const todosCustosIndiretos = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais];
    const custosIndiretosAtivos = todosCustosIndiretos.filter(custo => custo.valorMensal > 0 || custo.valorPorHora > 0); // Considera valorPorHora
    const custoIndiretoTotalPorHora = custosIndiretosAtivos.reduce((total, custo) => {
        // Usa valorPorHora, se existir.  Senão, calcula (mas não salva).
        const valorPorHora = custo.valorPorHora !== undefined ? custo.valorPorHora : (custo.valorMensal / maoDeObra.horas);
        return total + valorPorHora;
    }, 0);
    const custoIndiretoTotal = custoIndiretoTotalPorHora * horasProduto;

    document.getElementById('custo-indireto').textContent = formatarMoeda(custoIndiretoTotal);


    const listaCustosIndiretos = document.getElementById('lista-custos-indiretos-detalhes');
    listaCustosIndiretos.innerHTML = '';
    custosIndiretosAtivos.forEach(custo => {
        const li = document.createElement('li');

        // Usa valorPorHora, se existir.  Senão, calcula (e *não* salva).
        const valorPorHora = custo.valorPorHora !== undefined ? custo.valorPorHora : (custo.valorMensal / maoDeObra.horas);
        const custoTotalItem = valorPorHora * horasProduto;  // Usa o valor por hora *correto*.

        li.textContent = `${custo.descricao} - ${formatarMoeda(custoTotalItem)}`;
        listaCustosIndiretos.appendChild(li);
    });

    document.getElementById('detalhes-custos-indiretos').style.display = 'block';


    const subtotal = custoProduto + totalMaoDeObra + custoIndiretoTotal;
    document.getElementById('subtotal').textContent = formatarMoeda(subtotal);

    calcularPrecoVendaFinal();
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
// ==== FIM SEÇÃO - FUNÇÕES CÁLCULO DE PRECIFICAÇÃO ====

// ==== INÍCIO SEÇÃO - FUNÇÕES PRECIFICAÇÕES GERADAS ====
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
        precificacoesGeradas.push(precificacao); //Adicionado para incluir no array local
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
            actionsCell.appendChild(viewButton);
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
        actionsCell.appendChild(viewButton);
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
// ==== FIM SEÇÃO - FUNÇÕES PRECIFICAÇÕES GERADAS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE SALVAR E CARREGAR DADOS ====
function salvarDados() {
    const dados = {
        margemLucroPadrao,
        taxaCredito,
        proximoNumeroPrecificacao
    };
    localStorage.setItem('dadosPrecificacao', JSON.stringify(dados));
}

//MODIFICADA: carregarDados - Agora carrega valorPorHora dos custos indiretos do firestore e predefinidos.
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

        // Carrega custos indiretos *predefinidos* do Firestore
        const custosPredefinidosSnapshot = await getDocs(collection(db, "custos-indiretos-predefinidos"));
        custosPredefinidosSnapshot.forEach(doc => {
            // Atualiza o array 'custosIndiretosPredefinidos' com os dados do Firestore.
            const custo = doc.data();
            const index = custosIndiretosPredefinidos.findIndex(c => c.descricao === custo.descricao);
            if (index !== -1) {
                custosIndiretosPredefinidos[index] = custo; // Sobrescreve com os dados do Firestore
            }
        });


        // Carrega custos indiretos adicionais *e* o valorPorHora do Firestore.
        const custosAdicionaisSnapshot = await getDocs(collection(db, "custos-indiretos-adicionais"));
        custosIndiretosAdicionais = []; // Limpa o array
        custosAdicionaisSnapshot.forEach(doc => {
            custosIndiretosAdicionais.push({ id: doc.id, ...doc.data() }); // Inclui valorPorHora
        });

        // ... (restante do carregamento permanece o mesmo) ...
        atualizarTabelaMateriaisInsumos();
        carregarCustosIndiretosPredefinidos(); // Carrega/preenche a lista
        atualizarTabelaCustosIndiretos(); // Usa os valores carregados (incluindo valorPorHora)
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

        // Calcula custos *depois* de carregar tudo.
        calcularCustos();

    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        alert("Erro ao carregar dados do Firebase. Verifique o console para mais detalhes.");
    }
}

function limparPagina() {
    if (confirm('Tem certeza que deseja limpar todos os dados LOCALMENTE (interface)? Os dados do Firebase NÃO serão apagados.')) {
        localStorage.removeItem('dadosPrecificacao');

        materiais = [];
        custosIndiretosAdicionais = [];
        custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase)); // Reset para o valor base
        produtos = [];
        precificacoesGeradas = [];

        atualizarTabelaMateriaisInsumos();
        carregarCustosIndiretosPredefinidos(); //Recarrega a lista de custos
        atualizarTabelaCustosIndiretos();
        atualizarTabelaProdutosCadastrados();
        atualizarTabelaPrecificacoesGeradas();

        limparFormulario('form-materiais-insumos');
        limparFormulario('form-mao-de-obra');
        limparFormulario('form-produtos-cadastrados');
        document.querySelector('#tabela-materiais-produto tbody').innerHTML = '';

        document.getElementById('salario-receber').value = '';
        document.getElementById('horas-trabalhadas').value = 220;
        document.getElementById('incluir-ferias-13o-nao').checked = true;
        calcularValorHora();
        calcularCustoFerias13o();

        document.getElementById('margem-lucro-final').value = margemLucroPadrao;
        document.getElementById('taxa-credito-percentual').value = taxaCredito.percentual;
        document.getElementById('incluir-taxa-credito-nao').checked = true;

        calcularCustos();
    }
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

    // Removido daqui, pois a função buscarProdutosAutocomplete já foi definida
    // document.getElementById('produto-pesquisa').addEventListener('input', buscarProdutosAutocomplete);

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
        btnSalvarMaoDeObra.addEventListener('click', salvarMaoDeObra); // Usando event listener
    }

    // Botão "Editar" - Mão de Obra
    const btnEditarMaoDeObra = document.getElementById('btn-editar-mao-de-obra');
    if (btnEditarMaoDeObra) {
        btnEditarMaoDeObra.addEventListener('click', editarMaoDeObra);  // Usando event listener
    }

     // Botão "Cadastrar Produto" -  (Proposta 1)
    const btnCadastrarProduto = document.getElementById('cadastrar-produto-btn');
    if (btnCadastrarProduto) {
        btnCadastrarProduto.addEventListener('click', cadastrarProduto);
    }

    // ===== INÍCIO - EVENT LISTENER PARA AUTOCOMPLETE DE MATERIAIS =====
    document.getElementById('pesquisa-material').addEventListener('input', buscarMateriaisAutocomplete);
    // ===== FIM - EVENT LISTENER PARA AUTOCOMPLETE DE MATERIAIS =====

     // Adiciona event listener para a busca de materiais (CORREÇÃO)
     document.getElementById('busca-material').addEventListener('keyup', buscarMateriaisCadastrados);

    // Adiciona event listener para a busca de produtos
    document.getElementById('busca-produto').addEventListener('keyup', buscarProdutosCadastrados);

    // --- ADICIONADOS EVENT LISTENERS PARA CÁLCULO DA PRECIFICAÇÃO ---
    document.getElementById('produto-pesquisa').addEventListener('input', buscarProdutosAutocomplete);
    document.getElementById('horas-produto').addEventListener('change', calcularCustos);
    document.getElementById('margem-lucro-final').addEventListener('change', calcularPrecoVendaFinal);
    document.getElementById('btn-salvar-taxa-credito').addEventListener('click', salvarTaxaCredito); // Use o ID do botão
    document.getElementById('incluir-taxa-credito-sim').addEventListener('change', calcularTotalComTaxas);
    document.getElementById('incluir-taxa-credito-nao').addEventListener('change', calcularTotalComTaxas);
   document.getElementById('btn-gerar-nota').addEventListener('click', gerarNotaPrecificacao);


});
// ==== FIM SEÇÃO - EVENT LISTENERS GERAIS (DOMContentLoaded) ====
