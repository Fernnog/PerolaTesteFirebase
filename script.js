/* ==== INÍCIO - Configuração e Inicialização do Firebase ==== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDG1NYs6CM6TDfGAPXSz1ho8_-NWs28zSg", // SUA API KEY
    authDomain: "perola-rara.firebaseapp.com",       // SEU AUTH DOMAIN
    projectId: "perola-rara",                     // SEU PROJECT ID
    storageBucket: "perola-rara.firebasestorage.app", // SEU STORAGE BUCKET
    messagingSenderId: "502232132512",               // SEU MESSAGING SENDER ID
    appId: "1:502232132512:web:59f227a7d35b39cc8752c5", // SEU APP ID
    measurementId: "G-VHVMR10RSQ"                   // SEU MEASUREMENT ID (se usar Analytics)
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Opcional
const db = getFirestore(app);
const auth = getAuth(app); // Adicionado para autenticação
const orcamentosPedidosRef = collection(db, "Orcamento-Pedido");
/* ==== FIM - Configuração e Inicialização do Firebase ==== */

/* ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ==== */
let numeroOrcamento = 1;
let numeroPedido = 1;
const anoAtual = new Date().getFullYear();
let orcamentoEditando = null;
let pedidoEditando = null;
let orcamentos = [];
let pedidos = [];
let usuarioAtual = null;
const itensPorPagina = 40;
let paginaAtualOrcamentos = 1;
let paginaAtualPedidos = 1;
let orcamentosFiltradosPaginados = [];
let pedidosFiltradosPaginados = [];
let filtroAtivoOrcamentos = false;
let filtroAtivoPedidos = false;
/* ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ==== */

/* ==== INÍCIO SEÇÃO - AUTENTICAÇÃO ==== */
const btnRegister = document.getElementById('btnRegister');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const authStatus = document.getElementById('authStatus');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authSection = document.getElementById('authSection');
const appContent = document.getElementById('appContent');
const btnForgotPassword = document.getElementById('btnForgotPassword');
const passwordResetMessage = document.getElementById('passwordResetMessage');

function updateAuthUI(user) {
    if (user) {
        authStatus.textContent = "Usuário autenticado: " + user.email;
        btnLogout.style.display = "inline-block";
        btnLogin.style.display = "none";
        btnRegister.style.display = "none";
        authSection.style.display = "block";
        appContent.style.display = "block";
        carregarDados();
    } else {
        authStatus.textContent = "Nenhum usuário autenticado";
        btnLogout.style.display = "none";
        btnLogin.style.display = "inline-block";
        btnRegister.style.display = "inline-block";
        authSection.style.display = "block";
        appContent.style.display = "none";
        orcamentos = [];
        pedidos = [];
        numeroOrcamento = 1;
        numeroPedido = 1;
        mostrarOrcamentosGerados(1);
        mostrarPedidosRealizados(1);
    }
}

btnRegister.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        alert("Preencha email e senha para registrar.");
        return;
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Usuário registrado:", userCredential.user);
        updateAuthUI(userCredential.user);
    } catch (error) {
        console.error("Erro no registro:", error);
        alert("Erro no registro: " + error.message);
    }
});

btnLogin.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        alert("Preencha email e senha para entrar.");
        return;
    }
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Usuário logado:", userCredential.user);
        updateAuthUI(userCredential.user);
    } catch (error) {
        console.error("Erro no login:", error);
        alert("Erro no login: " + error.message);
    }
});

btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("Usuário desconectado.");
        updateAuthUI(null);
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
});

onAuthStateChanged(auth, (user) => {
    usuarioAtual = user;
    updateAuthUI(user);
});
/* ==== FIM SEÇÃO - AUTENTICAÇÃO ==== */

/* ==== INÍCIO SEÇÃO - CARREGAR DADOS DO FIREBASE ==== */
async function carregarDados() {
    if (!usuarioAtual) return;
    try {
        orcamentos = [];
        pedidos = [];
        const q = query(orcamentosPedidosRef, orderBy("numero"));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            if (data.tipo === 'orcamento') {
                orcamentos.push(data);
                numeroOrcamento = Math.max(numeroOrcamento, parseInt(data.numero.split('/')[0]) + 1);
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                numeroPedido = Math.max(numeroPedido, parseInt(data.numero.split('/')[0]) + 1);
            }
        });
        console.log("Dados carregados do Firebase:", orcamentos, pedidos);
        mostrarOrcamentosGerados(1);
        mostrarPedidosRealizados(1);

    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        alert("Erro ao carregar dados do Firebase. Veja o console para detalhes.");
    }
}
/* ==== FIM SEÇÃO - CARREGAR DADOS DO FIREBASE ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES AUXILIARES ==== */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarEntradaMoeda(input) {
    if (!input.value) {
        input.value = 'R$ 0,00';
        return;
    }
    let valor = input.value.replace(/\D/g, '');
    valor = (valor / 100).toFixed(2) + '';
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + valor;
}

function converterMoedaParaNumero(valor) {
    if (typeof valor !== 'string') {
        console.warn('converterMoedaParaNumero recebeu um valor não string:', valor);
        return 0;
    }
    return parseFloat(valor.replace(/R\$\s?|\./g, '').replace(',', '.')) || 0;
}

function limparCamposMoeda() {
    const camposMoeda = ['valorFrete', 'valorOrcamento', 'total', 'entrada', 'restante', 'margemLucro', 'custoMaoDeObra',
                         'valorFreteEdicao', 'valorPedidoEdicao', 'totalEdicao', 'entradaEdicao', 'restanteEdicao', 'margemLucroEdicao', 'custoMaoDeObraEdicao'];
    camposMoeda.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.value = 'R$ 0,00';
        }
    });
}

function adicionarProduto() {
    const tbody = document.querySelector("#tabelaProdutos tbody");
    const newRow = tbody.insertRow();

    const cellQuantidade = newRow.insertCell();
    const cellDescricao = newRow.insertCell();
    const cellValorUnit = newRow.insertCell();
    const cellValorTotal = newRow.insertCell();
    const cellAcoes = newRow.insertCell();

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00">';
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProduto(this)">Excluir</button>';
}

function adicionarProdutoEdicao() {
    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
    const newRow = tbody.insertRow();

    const cellQuantidade = newRow.insertCell();
    const cellDescricao = newRow.insertCell();
    const cellValorUnit = newRow.insertCell();
    const cellValorTotal = newRow.insertCell();
    const cellAcoes = newRow.insertCell();

    cellQuantidade.innerHTML = '<input type="number" class="produto-quantidade" value="1" min="1" onchange="atualizarTotaisEdicao()">';
    cellDescricao.innerHTML = '<input type="text" class="produto-descricao">';
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">';
    cellValorTotal.textContent = formatarMoeda(0);
    cellAcoes.innerHTML = '<button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button>';
}

function excluirProduto(botaoExcluir) {
    const row = botaoExcluir.parentNode.parentNode;
    row.remove();
    atualizarTotais();
}

function excluirProdutoEdicao(botaoExcluir) {
    const row = botaoExcluir.parentNode.parentNode;
    row.remove();
    atualizarTotaisEdicao();
}

function atualizarTotais() {
    let valorTotalOrcamento = 0;
    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");

    produtos.forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade").value);
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        const valorTotal = quantidade * valorUnit;

        row.cells[3].textContent = formatarMoeda(valorTotal);
        valorTotalOrcamento += valorTotal;
    });

    const valorFrete = converterMoedaParaNumero(document.getElementById("valorFrete").value);
    const total = valorTotalOrcamento + valorFrete;

    document.getElementById("valorOrcamento").value = formatarMoeda(valorTotalOrcamento);
    document.getElementById("total").value = formatarMoeda(total);
}

function atualizarTotaisEdicao() {
    let valorTotalPedido = 0;

    document.querySelectorAll("#tabelaProdutosEdicao tbody tr").forEach(row => {
        const quantidade = parseFloat(row.querySelector(".produto-quantidade").value) || 0;
        const valorUnit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        const valorTotal = quantidade * valorUnit;

        row.cells[3].textContent = formatarMoeda(valorTotal);
        valorTotalPedido += valorTotal;
    });

    const valorFrete = converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value);
    const valorPedido = converterMoedaParaNumero(document.getElementById("valorPedidoEdicao").value);
    const total = valorPedido + valorFrete;

    document.getElementById("totalEdicao").value = formatarMoeda(total);
    atualizarRestanteEdicao();
}

function atualizarRestanteEdicao() {
    const total = converterMoedaParaNumero(document.getElementById("totalEdicao").value);
    const entrada = converterMoedaParaNumero(document.getElementById("entradaEdicao").value);
    const restante = total - entrada;

    document.getElementById("restanteEdicao").value = formatarMoeda(restante);
}

function gerarNumeroFormatado(numero) {
    return numero.toString().padStart(4, '0') + '/' + anoAtual;
}
/* ==== FIM SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - SALVAR DADOS NO FIREBASE ==== */
async function salvarDados(dados, tipo) {
    if (!usuarioAtual) {
        alert("Você precisa estar autenticado para salvar dados.");
        return;
    }
    try {
        if (dados.id) {
            const docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dados, { merge: true });
        } else {
            const docRef = await addDoc(orcamentosPedidosRef, { ...dados, tipo });
            dados.id = docRef.id;
        }
    } catch (error) {
        console.error("Erro ao salvar dados no Firebase:", error);
        alert("Erro ao salvar no Firebase. Veja o console.");
    }
}
/* ==== FIM SEÇÃO - SALVAR DADOS NO FIREBASE ==== */

/* ==== INÍCIO SEÇÃO - GERAÇÃO DE ORÇAMENTO ==== */
async function gerarOrcamento() {
    if (orcamentoEditando !== null) {
        alert("Você está no modo de edição de orçamento. Clique em 'Atualizar Orçamento' para salvar as alterações.");
        return;
    }

    const dataOrcamento = document.getElementById("dataOrcamento").value;
    const dataValidade = document.getElementById("dataValidade").value;

    const orcamento = {
        numero: gerarNumeroFormatado(numeroOrcamento),
        dataOrcamento: dataOrcamento,
        dataValidade: dataValidade,
        cliente: document.getElementById("cliente").value,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value,
        cores: document.getElementById("cores").value,
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        pedidoGerado: false,
        numeroPedido: null,
        tipo: 'orcamento'
    };

    const produtos = document.querySelectorAll("#tabelaProdutos tbody tr");
    produtos.forEach(row => {
        orcamento.produtos.push({
            quantidade: parseFloat(row.querySelector(".produto-quantidade").value),
            descricao: row.querySelector(".produto-descricao").value,
            valorUnit: converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value),
            valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
        });
    });

    await salvarDados(orcamento, 'orcamento');
    numeroOrcamento++;
    orcamentos.push(orcamento);

    document.getElementById("orcamento").reset();
    limparCamposMoeda();
    document.querySelector("#tabelaProdutos tbody").innerHTML = "";

    alert("Orçamento gerado com sucesso!");
    mostrarPagina('orcamentos-gerados');
    mostrarOrcamentosGerados(1);
    exibirOrcamentoEmHTML(orcamento);
}

function exibirOrcamentoEmHTML(orcamento) {
    const janelaOrcamento = window.open('orcamento.html', '_blank');

    janelaOrcamento.addEventListener('load', () => {
        const conteudoOrcamento = janelaOrcamento.document.getElementById("conteudo-orcamento");

        if (!conteudoOrcamento) {
            console.error("Elemento #conteudo-orcamento não encontrado em orcamento.html");
            return;
        }

        const dataOrcamentoFormatada = orcamento.dataOrcamento.split('-').reverse().join('/');
        const dataValidadeFormatada = orcamento.dataValidade.split('-').reverse().join('/');
        const pagamentoFormatado = orcamento.pagamento.map(pag => {
            if (pag === 'pix') return 'PIX';
            if (pag === 'dinheiro') return 'Dinheiro';
            if (pag === 'cartaoCredito') return 'Cartão de Crédito';
            if (pag === 'cartaoDebito') return 'Cartão de Débito';
            return pag;
        }).join(', ');

        let html = `
            <h2>Orçamento Nº ${orcamento.numero}</h2>
            <div class="info-orcamento">
                <strong>Data do Orçamento:</strong> ${dataOrcamentoFormatada}<br>
                <strong>Data de Validade:</strong> ${dataValidadeFormatada}<br>
                <strong>Cliente:</strong> ${orcamento.cliente}<br>
                <strong>Endereço:</strong> ${orcamento.endereco}<br>
                <strong>Cidade:</strong> ${orcamento.cidade}<br>
                <strong>Telefone:</strong> ${orcamento.telefone}<br>
                <strong>E-mail:</strong> ${orcamento.email}<br>
                ${orcamento.tema ? `<strong>Tema:</strong> ${orcamento.tema}<br>` : ''}
                ${orcamento.cores ? `<strong>Cores:</strong> ${orcamento.cores}<br>` : ''}
            </div>
            <h3>Produtos</h3>
            <table>
                <thead>
                    <tr>
                        <th>Quantidade</th>
                        <th>Descrição do Produto</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        orcamento.produtos.forEach(produto => {
            html += `
                <tr>
                    <td>${produto.quantidade}</td>
                    <td>${produto.descricao}</td>
                    <td>${formatarMoeda(produto.valorUnit)}</td>
                    <td>${formatarMoeda(produto.valorTotal)}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div class="espaco-tabela"></div>
            <div class="info-orcamento">
                <strong>Pagamento:</strong> ${pagamentoFormatado}<br>
                <strong>Valor do Frete:</strong> ${formatarMoeda(orcamento.valorFrete)}<br>
                <strong>Valor do Orçamento:</strong> ${formatarMoeda(orcamento.valorOrcamento)}<br>
                <strong>Total:</strong> ${formatarMoeda(orcamento.total)}<br>
                ${orcamento.observacoes ? `<strong>Observações:</strong> ${orcamento.observacoes}<br>` : ''}
            </div>
        `;

        conteudoOrcamento.innerHTML = html;
    });
}
/* ==== FIM SEÇÃO - GERAÇÃO DE ORÇAMENTO ==== */

/* ==== INÍCIO SEÇÃO - ORÇAMENTOS GERADOS (PAGINAÇÃO) ==== */
function mostrarOrcamentosGerados(novaPagina = 1) {
    paginaAtualOrcamentos = novaPagina;
    const tbody = document.querySelector("#tabela-orcamentos tbody");
    tbody.innerHTML = '';

    let listaOrcamentosExibir = filtroAtivoOrcamentos ? orcamentosFiltradosPaginados : orcamentos;
    const startIndex = (paginaAtualOrcamentos - 1) * itensPorPagina;
    const endIndex = startIndex + itensPorPagina;
    const orcamentosPaginados = listaOrcamentosExibir.slice(startIndex, endIndex);

    orcamentosPaginados.forEach(orcamento => {
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellData = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellNumeroPedido = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = orcamento.numero;
        cellData.textContent = orcamento.dataOrcamento;
        cellCliente.textContent = orcamento.cliente;
        cellTotal.textContent = formatarMoeda(orcamento.total);
        cellNumeroPedido.textContent = orcamento.numeroPedido || 'N/A';

        let buttonVisualizar = document.createElement('button');
        buttonVisualizar.textContent = 'Visualizar';
        buttonVisualizar.classList.add('btnVisualizarOrcamento');
        cellAcoes.appendChild(buttonVisualizar);

        if (!orcamento.pedidoGerado) {
            cellAcoes.innerHTML = `<button type="button" class="btnEditarOrcamento" data-orcamento-id="${orcamento.id}">Editar</button>
                                   `;
            let buttonGerarPedido = document.createElement('button');
            buttonGerarPedido.textContent = 'Gerar Pedido';
            buttonGerarPedido.classList.add('btnGerarPedido');
            buttonGerarPedido.dataset.orcamentoId = orcamento.id;
            cellAcoes.appendChild(buttonGerarPedido);
        }
    });

    const btnsEditarOrcamento = document.querySelectorAll('.btnEditarOrcamento');
    btnsEditarOrcamento.forEach(btn => {
        btn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            editarOrcamento(orcamentoId);
        });
    });

    const btnsGerarPedido = document.querySelectorAll('.btnGerarPedido');
    btnsGerarPedido.forEach(btn => {
        btn.addEventListener('click', function() {
            const orcamentoId = this.dataset.orcamentoId;
            gerarPedido(orcamentoId);
        });
    });

    const btnsVisualizarOrcamento = document.querySelectorAll('.btnVisualizarOrcamento');
    btnsVisualizarOrcamento.forEach(btn => {
        btn.addEventListener('click', function() {
            const numeroOrcamentoBotao = this.closest('tr').cells[0].textContent;
            const orcamentoParaVisualizar = orcamentos.find(orcamento => orcamento.numero === numeroOrcamentoBotao);
            if (orcamentoParaVisualizar) {
                exibirOrcamentoEmHTML(orcamentoParaVisualizar);
            } else {
                console.error("Orçamento não encontrado para visualização.");
            }
        });
    });

    atualizarBotoesPaginacaoOrcamentos(listaOrcamentosExibir.length);
}

function atualizarBotoesPaginacaoOrcamentos(totalItens) {
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    const prevButton = document.getElementById('prevPageOrcamentos');
    const nextButton = document.getElementById('nextPageOrcamentos');
    const currentPageSpan = document.getElementById('currentPageOrcamentos');

    currentPageSpan.textContent = `Página ${paginaAtualOrcamentos}`;
    prevButton.disabled = paginaAtualOrcamentos <= 1;
    nextButton.disabled = paginaAtualOrcamentos >= totalPaginas;
}

function nextPageOrcamentos() {
    mostrarOrcamentosGerados(paginaAtualOrcamentos + 1);
}

function previousPageOrcamentos() {
    mostrarOrcamentosGerados(paginaAtualOrcamentos - 1);
}

function filtrarOrcamentos() {
    filtroAtivoOrcamentos = true;
    const dataInicio = document.getElementById('filtroDataInicioOrcamento').value;
    const dataFim = document.getElementById('filtroDataFimOrcamento').value;
    const numeroOrcamentoFiltro = parseInt(document.getElementById('filtroNumeroOrcamento').value);
    const anoOrcamentoFiltro = parseInt(document.getElementById('filtroAnoOrcamento').value);
    const clienteOrcamentoFiltro = document.getElementById('filtroClienteOrcamento').value.toLowerCase();

    orcamentosFiltradosPaginados = orcamentos.filter(orcamento => {
        const [numOrcamento, anoOrcamento] = orcamento.numero.split('/');
        const dataOrcamento = new Date(orcamento.dataOrcamento);
        const nomeCliente = orcamento.cliente.toLowerCase();

        return (!dataInicio || dataOrcamento >= new Date(dataInicio)) &&
               (!dataFim || dataOrcamento <= new Date(dataFim)) &&
               (!numeroOrcamentoFiltro || parseInt(numOrcamento) === numeroOrcamentoFiltro) &&
               (!anoOrcamentoFiltro || parseInt(anoOrcamento) === anoOrcamentoFiltro) &&
               nomeCliente.includes(clienteOrcamentoFiltro);
    });

    mostrarOrcamentosGerados(1);
}

function atualizarListaOrcamentos(orcamentosFiltrados) {
    orcamentosFiltradosPaginados = orcamentosFiltrados;
    mostrarOrcamentosGerados(1);
}
/* ==== FIM SEÇÃO - ORÇAMENTOS GERADOS (PAGINAÇÃO) ==== */

/* ==== INÍCIO SEÇÃO - PEDIDOS REALIZADOS (PAGINAÇÃO) ==== */
function mostrarPedidosRealizados(novaPagina = 1) {
    paginaAtualPedidos = novaPagina;
    const tbody = document.querySelector("#tabela-pedidos tbody");
    tbody.innerHTML = '';

    let listaPedidosExibir = filtroAtivoPedidos ? pedidosFiltradosPaginados : pedidos;
    const startIndex = (paginaAtualPedidos - 1) * itensPorPagina;
    const endIndex = startIndex + itensPorPagina;
    const pedidosPaginados = listaPedidosExibir.slice(startIndex, endIndex);

    pedidosPaginados.forEach(pedido => {
        const row = tbody.insertRow();
        const cellNumero = row.insertCell();
        const cellDataPedido = row.insertCell();
        const cellCliente = row.insertCell();
        const cellTotal = row.insertCell();
        const cellAcoes = row.insertCell();

        cellNumero.textContent = pedido.numero;
        cellDataPedido.textContent = pedido.dataPedido;
        cellCliente.textContent = pedido.cliente;
        cellTotal.textContent = formatarMoeda(pedido.total);
        cellAcoes.innerHTML = `<button type="button" class="btnEditarPedido" data-pedido-id="${pedido.id}">Editar</button>`;
    });

    const btnsEditarPedido = document.querySelectorAll('.btnEditarPedido');
    btnsEditarPedido.forEach(btn => {
        btn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            editarPedido(pedidoId);
        });
    });

    atualizarBotoesPaginacaoPedidos(listaPedidosExibir.length);
}

function atualizarBotoesPaginacaoPedidos(totalItens) {
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    const prevButton = document.getElementById('prevPagePedidos');
    const nextButton = document.getElementById('nextPagePedidos');
    const currentPageSpan = document.getElementById('currentPagePedidos');

    currentPageSpan.textContent = `Página ${paginaAtualPedidos}`;
    prevButton.disabled = paginaAtualPedidos <= 1;
    nextButton.disabled = paginaAtualPedidos >= totalPaginas;
}

function nextPagePedidos() {
    mostrarPedidosRealizados(paginaAtualPedidos + 1);
}

function previousPagePedidos() {
    mostrarPedidosRealizados(paginaAtualPedidos - 1);
}

function filtrarPedidos() {
    filtroAtivoPedidos = true;
    const dataInicio = document.getElementById('filtroDataInicioPedido').value;
    const dataFim = document.getElementById('filtroDataFimPedido').value;
    const numeroPedidoFiltro = parseInt(document.getElementById('filtroNumeroPedido').value);
    const anoPedidoFiltro = parseInt(document.getElementById('filtroAnoPedido').value);
    const clientePedidoFiltro = document.getElementById('filtroClientePedido').value.toLowerCase();

    pedidosFiltradosPaginados = pedidos.filter(pedido => {
        const [numPedido, anoPedido] = pedido.numero.split('/');
        const dataPedido = new Date(pedido.dataPedido);
        const nomeCliente = pedido.cliente.toLowerCase();

        return (!dataInicio || dataPedido >= new Date(dataInicio)) &&
               (!dataFim || dataPedido <= new Date(dataFim)) &&
               (!numeroPedidoFiltro || parseInt(numPedido) === numeroPedidoFiltro) &&
               (!anoPedidoFiltro || parseInt(anoPedido) === anoPedidoFiltro) &&
               nomeCliente.includes(clientePedidoFiltro);
    });

    mostrarPedidosRealizados(1);
}

function atualizarListaPedidos(pedidosFiltrados) {
    pedidosFiltradosPaginados = pedidosFiltrados;
    mostrarPedidosRealizados(1);
}
/* ==== FIM SEÇÃO - PEDIDOS REALIZADOS (PAGINAÇÃO) ==== */

/* ==== INÍCIO SEÇÃO - RELATÓRIO ==== */
function filtrarPedidosRelatorio() {
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;

    const pedidosFiltrados = pedidos.filter(pedido => {
        const dataPedido = new Date(pedido.dataPedido);
        const inicio = dataInicio ? new Date(dataInicio) : new Date('1970-01-01');
        const fim = dataFim ? new Date(dataFim) : new Date('2100-01-01');

        return dataPedido >= inicio && dataPedido <= fim;
    });

    gerarRelatorio(pedidosFiltrados);
}

function gerarRelatorio(pedidosFiltrados) {
    let totalPedidos = 0;
    let totalFrete = 0;
    let totalMargemLucro = 0;
    let totalCustoMaoDeObra = 0;

    pedidosFiltrados.forEach(pedido => {
        totalPedidos += pedido.total;
        totalFrete += pedido.valorFrete;
        totalMargemLucro += converterMoedaParaNumero(String(pedido.margemLucro));
        totalCustoMaoDeObra += converterMoedaParaNumero(String(pedido.custoMaoDeObra));
    });

    const quantidadePedidos = pedidosFiltrados.length;

    let relatorioHTML = `
        <table class="relatorio-table">
            <thead>
                <tr>
                    <th>Total de Pedidos</th>
                    <th>Total de Frete</th>
                    <th>Total de Margem de Lucro</th>
                    <th>Total de Custo de Mão de Obra</th>
                    <th>Quantidade de Pedidos</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${formatarMoeda(totalPedidos)}</td>
                    <td>${formatarMoeda(totalFrete)}</td>
                    <td>${formatarMoeda(totalMargemLucro)}</td>
                    <td>${formatarMoeda(totalCustoMaoDeObra)}</td>
                    <td>${quantidadePedidos}</td>
                </tr>
            </tbody>
        </table>
        <table class="relatorio-table" style="margin-top: 20px;">
            <thead>
                <tr>
                    <th>Número do Pedido</th>
                    <th>Data do Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    pedidosFiltrados.forEach(pedido => {
        relatorioHTML += `
                <tr>
                    <td>${pedido.numero}</td>
                    <td>${pedido.dataPedido}</td>
                    <td>${pedido.cliente}</td>
                    <td>${formatarMoeda(pedido.total)}</td>
                </tr>
        `;
    });

    relatorioHTML += `
            </tbody>
        </table>
    `;

    document.getElementById('relatorio-conteudo').innerHTML = relatorioHTML;
}

function gerarRelatorioXLSX() {
    const relatorioTable = document.querySelector('#relatorio-conteudo');
    if (!relatorioTable || !relatorioTable.innerHTML.includes('<table')) {
        alert('Erro: Tabela de relatório não encontrada. Gere o relatório primeiro.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(relatorioTable.querySelector('table'));
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
    XLSX.writeFile(wb, "relatorio_pedidos.xlsx");
}
/* ==== FIM SEÇÃO - RELATÓRIO ==== */

/* ==== INÍCIO SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */
function mostrarPagina(idPagina) {
    const paginas = document.querySelectorAll('.pagina');
    paginas.forEach(pagina => {
        pagina.style.display = 'none';
    });

    document.getElementById(idPagina).style.display = 'block';
}
/* ==== FIM SEÇÃO - FUNÇÕES DE CONTROLE DE PÁGINA ==== */

document.addEventListener('DOMContentLoaded', () => {
    // ==== EVENT LISTENERS MENUS ====
    const menuLinks = document.querySelectorAll('nav ul li a[data-pagina]');
    menuLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const paginaId = link.dataset.pagina;
            mostrarPagina(paginaId);
            if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados(1);
            if (paginaId === 'lista-pedidos') mostrarPedidosRealizados(1);
        });
    });

    // ==== EVENT LISTENERS BOTÕES FORMULÁRIOS ====
    const btnAdicionarProdutoOrcamento = document.querySelector('#btnAddProdutoOrcamento');
    if (btnAdicionarProdutoOrcamento) btnAdicionarProdutoOrcamento.addEventListener('click', adicionarProduto);

    const btnAdicionarProdutoEdicaoForm = document.querySelector('#btnAddProdutoEdicao');
    if (btnAdicionarProdutoEdicaoForm) btnAdicionarProdutoEdicaoForm.addEventListener('click', adicionarProdutoEdicao);

    const btnGerarOrcamentoForm = document.querySelector('#btnGerarOrcamento');
    if (btnGerarOrcamentoForm) btnGerarOrcamentoForm.addEventListener('click', gerarOrcamento);

    const btnAtualizarOrcamentoForm = document.querySelector('#btnAtualizarOrcamento');
    if (btnAtualizarOrcamentoForm) btnAtualizarOrcamentoForm.addEventListener('click', atualizarOrcamento);

    const btnSalvarAlteracoesPedido = document.querySelector('#btnSalvarPedidoEdicao');
    if (btnSalvarAlteracoesPedido) btnSalvarAlteracoesPedido.addEventListener('click', atualizarPedido);

    const btnFiltrarOrcamentos = document.querySelector('#orcamentos-gerados .filtro-data button');
    if (btnFiltrarOrcamentos) btnFiltrarOrcamentos.addEventListener('click', filtrarOrcamentos);

    const btnFiltrarPedidos = document.querySelector('#lista-pedidos .filtro-data button');
    if (btnFiltrarPedidos) btnFiltrarPedidos.addEventListener('click', filtrarPedidos);

    const btnGerarRelatorio = document.querySelector('#relatorio .filtro-data button');
    if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', filtrarPedidosRelatorio);

    const btnExportarRelatorioXLSX = document.querySelector('#relatorio button[onclick="gerarRelatorioXLSX()"]');
    if (btnExportarRelatorioXLSX) btnExportarRelatorioXLSX.addEventListener('click', gerarRelatorioXLSX);

    // ==== RECUPERAÇÃO DE SENHA ====
    const btnForgotPassword = document.getElementById('btnForgotPassword');
    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', async () => {
            const email = emailInput.value;
            if (!email) {
                alert("Por favor, insira seu email para redefinir a senha.");
                return;
            }

            try {
                await sendPasswordResetEmail(auth, email);
                passwordResetMessage.textContent = "Email de redefinição de senha enviado. Verifique sua caixa de entrada (e spam).";
                passwordResetMessage.style.display = "block";
                setTimeout(() => {
                    passwordResetMessage.style.display = "none";
                }, 5000);
            } catch (error) {
                console.error("Erro ao enviar email de redefinição:", error);
                alert("Erro ao redefinir a senha. Verifique o console para detalhes.");
                passwordResetMessage.textContent = "Erro ao enviar email de redefinição. Tente novamente.";
                passwordResetMessage.style.display = "block";
            }
        });
    }

    // ==== DELEGAÇÃO DE EVENTOS PARA TABELAS (CORREÇÃO PRINCIPAL) ====
    // Event delegation para inputs de quantidade e valor unitário na tabela de ORÇAMENTO
    document.querySelector('#tabelaProdutos tbody').addEventListener('change', function(event) {
        if (event.target.classList.contains('produto-quantidade')) {
            atualizarTotais();
        }
    });
    document.querySelector('#tabelaProdutos tbody').addEventListener('input', function(event) {
        if (event.target.classList.contains('produto-valor-unit')) {
            formatarEntradaMoeda(event.target);
            atualizarTotais();
        }
    });
     document.querySelector('#tabelaProdutos tbody').addEventListener('blur', function(event) {
        if (event.target.classList.contains('produto-valor-unit')) {
            atualizarTotais();
        }
    });

    // Event listeners para o input de valor do frete no formulário de orçamento
    const valorFreteInput = document.getElementById('valorFrete');
    if (valorFreteInput) {
        valorFreteInput.addEventListener('input', formatarEntradaMoeda);
        valorFreteInput.addEventListener('blur', atualizarTotais);
    }

    // Event delegation para inputs de quantidade e valor unitário na tabela de EDIÇÃO DE PEDIDO
    document.querySelector('#tabelaProdutosEdicao tbody').addEventListener('change', function(event) {
        if (event.target.classList.contains('produto-quantidade')) {
            atualizarTotaisEdicao();
        }
    });
    document.querySelector('#tabelaProdutosEdicao tbody').addEventListener('input', function(event) {
        if (event.target.classList.contains('produto-valor-unit')) {
            formatarEntradaMoeda(event.target);
            atualizarTotaisEdicao();
        }
    });
     document.querySelector('#tabelaProdutosEdicao tbody').addEventListener('blur', function(event) {
        if (event.target.classList.contains('produto-valor-unit')) {
            atualizarTotaisEdicao();
        }
    });

    // Event listeners para campos de valor no formulário de edição de pedido
    const valorFreteEdicaoInput = document.getElementById('valorFreteEdicao');
    if (valorFreteEdicaoInput) {
        valorFreteEdicaoInput.addEventListener('input', formatarEntradaMoeda);
        valorFreteEdicaoInput.addEventListener('blur', atualizarTotaisEdicao);
    }

    const valorPedidoEdicaoInput = document.getElementById('valorPedidoEdicao');
    if (valorPedidoEdicaoInput) {
        valorPedidoEdicaoInput.addEventListener('input', formatarEntradaMoeda);
        valorPedidoEdicaoInput.addEventListener('blur', atualizarTotaisEdicao);
    }

    const entradaEdicaoInput = document.getElementById('entradaEdicao');
    if (entradaEdicaoInput) {
        entradaEdicaoInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
            atualizarRestanteEdicao();
        });
        entradaEdicaoInput.addEventListener('blur', atualizarRestanteEdicao);
    }
    // ==== FIM - DELEGAÇÃO DE EVENTOS PARA TABELAS ====

    // ==== EVENT LISTENERS PAGINAÇÃO ====
    document.getElementById('nextPageOrcamentos').addEventListener('click', nextPageOrcamentos);
    document.getElementById('prevPageOrcamentos').addEventListener('click', previousPageOrcamentos);
    document.getElementById('nextPagePedidos').addEventListener('click', nextPagePedidos);
    document.getElementById('prevPagePedidos').addEventListener('click', previousPagePedidos);

    // Inicializar campos moeda e exibir a primeira página das listas
    limparCamposMoeda();
    mostrarOrcamentosGerados(1);
    mostrarPedidosRealizados(1);
});
