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
const itensPorPagina = 40; // Defina o número de itens por página
let paginaAtualOrcamentos = 1; // Página atual para orçamentos
let paginaAtualPedidos = 1;    // Página atual para pedidos
let orcamentosFiltradosPaginados = []; // Para armazenar orçamentos filtrados para paginação
let pedidosFiltradosPaginados = [];    // Para armazenar pedidos filtrados para paginação
let filtroAtivoOrcamentos = false;     // Indica se o filtro de orçamentos está ativo
let filtroAtivoPedidos = false;        // Indica se o filtro de pedidos está ativo
/* ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ==== */

/* ==== INÍCIO SEÇÃO - AUTENTICAÇÃO ==== */
// Referências aos elementos do HTML (Autenticação)
const btnRegister = document.getElementById('btnRegister');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const authStatus = document.getElementById('authStatus');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authSection = document.getElementById('authSection');
const appContent = document.getElementById('appContent'); //Para mostrar Sections
const btnForgotPassword = document.getElementById('btnForgotPassword');
const passwordResetMessage = document.getElementById('passwordResetMessage');


// Função para lidar com a interface de autenticação
function updateAuthUI(user) {
    if (user) {
        authStatus.textContent = "Usuário autenticado: " + user.email;
        btnLogout.style.display = "inline-block";
        btnLogin.style.display = "none";
        btnRegister.style.display = "none";
        authSection.style.display = "block"; //Sempre mostrar
        appContent.style.display = "block";      // Mostrar conteúdo principal

        // Carrega dados *somente* após autenticação
        carregarDados();
    } else {
        authStatus.textContent = "Nenhum usuário autenticado";
        btnLogout.style.display = "none";
        btnLogin.style.display = "inline-block";
        btnRegister.style.display = "inline-block";
        authSection.style.display = "block";  //Sempre mostrar
        appContent.style.display = "none"; // Ocultar conteúdo principal

        // Limpar os dados se o usuário fizer logout.
        orcamentos = [];
        pedidos = [];
        numeroOrcamento = 1;
        numeroPedido = 1;
        mostrarOrcamentosGerados(1); // Atualiza a exibição
        mostrarPedidosRealizados(1);
    }
}

// Listeners de eventos para os botões de autenticação
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
        updateAuthUI(userCredential.user); // Atualiza a UI
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
        updateAuthUI(userCredential.user); // Atualiza a UI
    } catch (error) {
        console.error("Erro no login:", error);
        alert("Erro no login: " + error.message);
    }
});

btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("Usuário desconectado.");
        updateAuthUI(null); // Atualiza a UI
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
});

// Monitor de estado de autenticação
onAuthStateChanged(auth, (user) => {
    usuarioAtual = user; // Define a variável global
    updateAuthUI(user); // Sempre atualiza a UI
});

/* ==== FIM SEÇÃO - AUTENTICAÇÃO ==== */

/* ==== INÍCIO SEÇÃO - CARREGAR DADOS DO FIREBASE ==== */
async function carregarDados() {
    if (!usuarioAtual) {
        // Se não tiver usuário, não carrega nada.
        return;
    }

    try {
        orcamentos = [];
        pedidos = [];
        // Consulta com ordenação
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
        input.value = 'R$ 0,00'; // Garante que o campo não fique vazio e formata como moeda zero
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
            campo.value = 'R$ 0,00'; // Define para 'R$ 0,00' em vez de '0,00'
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
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00">'; // Valor inicial formatado
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
    cellValorUnit.innerHTML = '<input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()">'; // Valor inicial formatado
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

        row.cells[3].textContent = formatarMoeda(valorTotal); // Atualiza o valor total do produto na tabela
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
    const total = valorPedido + valorFrete; // Cálculo correto do total do pedido

    document.getElementById("totalEdicao").value = formatarMoeda(total); // Atualiza o total com o cálculo correto
    atualizarRestanteEdicao();
}


function atualizarRestanteEdicao() {
    const total = converterMoedaParaNumero(document.getElementById("totalEdicao").value);
    const entrada = converterMoedaParaNumero(document.getElementById("entradaEdicao").value);
    // Removido custoMaoDeObra do cálculo para corresponder à solicitação do usuário
    // const custoMaoDeObra = converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao").value);
    // const restante = total - entrada - custoMaoDeObra;
    const restante = total - entrada; // Cálculo simplificado: Restante = Total - Entrada

    document.getElementById("restanteEdicao").value = formatarMoeda(restante);
}

function gerarNumeroFormatado(numero) {
    return numero.toString().padStart(4, '0') + '/' + anoAtual;
}

/* ==== FIM DA SEÇÃO - FUNÇÕES AUXILIARES ==== */

/* ==== INÍCIO SEÇÃO - SALVAR DADOS NO FIREBASE (COM VERIFICAÇÃO DE AUTENTICAÇÃO) ==== */
async function salvarDados(dados, tipo) {
    if (!usuarioAtual) {
        alert("Você precisa estar autenticado para salvar dados.");
        return; // Não salva se não estiver autenticado
    }
    try {
        if (dados.id) {
            const docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dados, { merge: true });
            console.log(`Dados ${tipo} atualizados no Firebase com ID:`, dados.id);
        } else {
            const docRef = await addDoc(orcamentosPedidosRef, { ...dados, tipo });
            console.log(`Novos dados ${tipo} salvos no Firebase com ID:`, docRef.id);
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
        email: document.getElementById("clienteEmail").value, // Alterado para clienteEmail
        cores: document.getElementById("cores").value,
        produtos: [],
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        pedidoGerado: false,
        numeroPedido: null,
        tipo: 'orcamento' // Definição do tipo aqui
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

    await salvarDados(orcamento, 'orcamento'); // Salva no Firebase
    numeroOrcamento++;
    orcamentos.push(orcamento); //Adiciona para renderizar

    document.getElementById("orcamento").reset();
    limparCamposMoeda();
    document.querySelector("#tabelaProdutos tbody").innerHTML = "";

    alert("Orçamento gerado com sucesso!");
     mostrarPagina('orcamentos-gerados'); //Adicionado
     mostrarOrcamentosGerados(1);          //Adicionado
     exibirOrcamentoEmHTML(orcamento); // Chamar a função para exibir o orçamento aqui
}

function exibirOrcamentoEmHTML(orcamento) {
    console.log("Função exibirOrcamentoEmHTML chamada com orçamento:", orcamento);
    const janelaOrcamento = window.open('orcamento.html', '_blank');

    janelaOrcamento.addEventListener('load', () => {
        console.log("Página orcamento.html carregada.");
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
        console.log("Conteúdo do orçamento inserido em orcamento.html");
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

    // Adicionar event listeners para botões dinâmicos (depois de inserir no DOM)
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

    // Novos event listeners para os botões "Visualizar"
    const btnsVisualizarOrcamento = document.querySelectorAll('.btnVisualizarOrcamento');
    btnsVisualizarOrcamento.forEach(btn => {
        btn.addEventListener('click', function() {
            // Encontra o orçamento correspondente na lista `orcamentos` (você pode precisar de um dataset-id se não estiver funcionando corretamente)
            const numeroOrcamentoBotao = this.closest('tr').cells[0].textContent; // Pega o número da linha
            const orcamentoParaVisualizar = orcamentos.find(orcamento => orcamento.numero === numeroOrcamentoBotao);
            if (orcamentoParaVisualizar) {
                exibirOrcamentoEmHTML(orcamentoParaVisualizar);
                console.log('Visualizar Orçamento:', orcamentoParaVisualizar);
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

    if (paginaAtualOrcamentos <= 1) {
        prevButton.disabled = true;
    } else {
        prevButton.disabled = false;
    }

    if (paginaAtualOrcamentos >= totalPaginas) {
        nextButton.disabled = true;
    } else {
        nextButton.disabled = false;
    }
}

function nextPageOrcamentos() {
    mostrarOrcamentosGerados(paginaAtualOrcamentos + 1);
}

function previousPageOrcamentos() {
    mostrarOrcamentosGerados(paginaAtualOrcamentos - 1);
}

function filtrarOrcamentos() {
    filtroAtivoOrcamentos = true; // Define que o filtro está ativo
    const dataInicio = document.getElementById('filtroDataInicioOrcamento').value;
    const dataFim = document.getElementById('filtroDataFimOrcamento').value;
    const numeroOrcamentoFiltro = parseInt(document.getElementById('filtroNumeroOrcamento').value);
    const anoOrcamentoFiltro = parseInt(document.getElementById('filtroAnoOrcamento').value);
    const clienteOrcamentoFiltro = document.getElementById('filtroClienteOrcamento').value.toLowerCase();

    orcamentosFiltradosPaginados = orcamentos.filter(orcamento => { // Usa orcamentos aqui
        const [numOrcamento, anoOrcamento] = orcamento.numero.split('/');
        const dataOrcamento = new Date(orcamento.dataOrcamento);
        const nomeCliente = orcamento.cliente.toLowerCase();

        return (!dataInicio || dataOrcamento >= new Date(dataInicio)) &&
               (!dataFim || dataOrcamento <= new Date(dataFim)) &&
               (!numeroOrcamentoFiltro || parseInt(numOrcamento) === numeroOrcamentoFiltro) &&
               (!anoOrcamentoFiltro || parseInt(anoOrcamento) === anoOrcamentoFiltro) &&
               nomeCliente.includes(clienteOrcamentoFiltro);
    });

    mostrarOrcamentosGerados(1); // Resetar para a página 1 após filtrar
}

function atualizarListaOrcamentos(orcamentosFiltrados) {
    orcamentosFiltradosPaginados = orcamentosFiltrados; // Atualiza a lista filtrada
    mostrarOrcamentosGerados(1); // Resetar para a página 1 após atualizar lista filtrada
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

    // Adicionar event listeners para botões dinâmicos (depois de inserir no DOM)
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

    if (paginaAtualPedidos <= 1) {
        prevButton.disabled = true;
    } else {
        prevButton.disabled = false;
    }

    if (paginaAtualPedidos >= totalPaginas) {
        nextButton.disabled = true;
    } else {
        nextButton.disabled = false;
    }
}

function nextPagePedidos() {
    mostrarPedidosRealizados(paginaAtualPedidos + 1);
}

function previousPagePedidos() {
    mostrarPedidosRealizados(paginaAtualPedidos - 1);
}


function filtrarPedidos() {
    filtroAtivoPedidos = true; // Define que o filtro está ativo
    const dataInicio = document.getElementById('filtroDataInicioPedido').value;
    const dataFim = document.getElementById('filtroDataFimPedido').value;
    const numeroPedidoFiltro = parseInt(document.getElementById('filtroNumeroPedido').value);
    const anoPedidoFiltro = parseInt(document.getElementById('filtroAnoPedido').value);
    const clientePedidoFiltro = document.getElementById('filtroClientePedido').value.toLowerCase();

    pedidosFiltradosPaginados = pedidos.filter(pedido => { // Usa pedidos aqui
        const [numPedido, anoPedido] = pedido.numero.split('/');
        const dataPedido = new Date(pedido.dataPedido);
        const nomeCliente = pedido.cliente.toLowerCase();

        return (!dataInicio || dataPedido >= new Date(dataInicio)) &&
               (!dataFim || dataPedido <= new Date(dataFim)) &&
               (!numeroPedidoFiltro || parseInt(numPedido) === numeroPedidoFiltro) &&
               (!anoPedidoFiltro || parseInt(anoPedido) === anoPedidoFiltro) &&
               nomeCliente.includes(clientePedidoFiltro);
    });

    mostrarPedidosRealizados(1); // Resetar para a página 1 após filtrar
}

function atualizarListaPedidos(pedidosFiltrados) {
    pedidosFiltradosPaginados = pedidosFiltrados; // Atualiza a lista filtrada
    mostrarPedidosRealizados(1);  // Resetar para a página 1 após atualizar lista filtrada
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
    const relatorioTable = document.querySelector('#relatorio-conteudo'); // Seleciona o container do relatório
    if (!relatorioTable || !relatorioTable.innerHTML.includes('<table')) { // Verifica se a tabela está dentro do container
        alert('Erro: Tabela de relatório não encontrada. Gere o relatório primeiro.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(relatorioTable.querySelector('table')); // Seleciona a tabela dentro do container
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
    // ==== EVENT LISTENERS PARA OS MENUS ====
    const menuLinks = document.querySelectorAll('nav ul li a[data-pagina]'); // Seleciona links do menu com data-pagina
    menuLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Evita o comportamento padrão do link (ir para # e recarregar a página)
            const paginaId = link.dataset.pagina; // Pega o ID da página do atributo data-pagina
            mostrarPagina(paginaId); // Chama sua função mostrarPagina
            // Funções adicionais a serem chamadas ao clicar em certos menus (se necessário)
            if (paginaId === 'orcamentos-gerados') mostrarOrcamentosGerados(1);
            if (paginaId === 'lista-pedidos') mostrarPedidosRealizados(1);
        });
    });

    // ==== EVENT LISTENERS PARA BOTÕES DOS FORMULÁRIOS ====
    // Botão "Adicionar Produto" (Formulário de Orçamento)
    const btnAdicionarProdutoOrcamento = document.querySelector('#btnAddProdutoOrcamento');
    if (btnAdicionarProdutoOrcamento) { // Verifica se o botão existe no DOM
        btnAdicionarProdutoOrcamento.addEventListener('click', adicionarProduto); // Associa a função adicionarProduto ao evento de clique
    }

    // Botão "Adicionar Produto" (Formulário de Edição de Pedido)
    const btnAdicionarProdutoEdicaoForm = document.querySelector('#btnAddProdutoEdicao');
    if (btnAdicionarProdutoEdicaoForm) {
        btnAdicionarProdutoEdicaoForm.addEventListener('click', adicionarProdutoEdicao);
    }

    // Botão "Gerar Orçamento"
    const btnGerarOrcamentoForm = document.querySelector('#btnGerarOrcamento');
    if (btnGerarOrcamentoForm) {
        btnGerarOrcamentoForm.addEventListener('click', gerarOrcamento);
    }

    // Botão "Atualizar Orçamento"
    const btnAtualizarOrcamentoForm = document.querySelector('#btnAtualizarOrcamento');
    if (btnAtualizarOrcamentoForm) {
        btnAtualizarOrcamentoForm.addEventListener('click', atualizarOrcamento);
    }

    // Botão "Salvar Alterações" (Formulário de Edição de Pedido)
    const btnSalvarAlteracoesPedido = document.querySelector('#btnSalvarPedidoEdicao');
    if (btnSalvarAlteracoesPedido) {
        btnSalvarAlteracoesPedido.addEventListener('click', atualizarPedido);
    }

    // Botões "Filtrar" (Orçamentos Gerados)
    const btnFiltrarOrcamentos = document.querySelector('#orcamentos-gerados .filtro-data button');
    if (btnFiltrarOrcamentos) {
        btnFiltrarOrcamentos.addEventListener('click', filtrarOrcamentos);
    }

    // Botões "Filtrar" (Pedidos Realizados)
    const btnFiltrarPedidos = document.querySelector('#lista-pedidos .filtro-data button');
    if (btnFiltrarPedidos) {
        btnFiltrarPedidos.addEventListener('click', filtrarPedidos);
    }

     // Botões "Gerar Relatório" (Relatório)
    const btnGerarRelatorio = document.querySelector('#relatorio .filtro-data button');
    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', filtrarPedidosRelatorio); // Use filtrarPedidosRelatorio para o relatório
    }

    // Botão "Exportar Relatório (XLSX)" (Relatório)
    const btnExportarRelatorioXLSX = document.querySelector('#relatorio button[onclick="gerarRelatorioXLSX()"]');
    if (btnExportarRelatorioXLSX) {
        btnExportarRelatorioXLSX.addEventListener('click', gerarRelatorioXLSX);
    }

    // ==== RECUPERAÇÃO DE SENHA ====
    const btnForgotPassword = document.getElementById('btnForgotPassword');
    const passwordResetMessage = document.getElementById('passwordResetMessage');

    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', async () => {
            const email = emailInput.value; // Usa o e-mail inserido no campo de e-mail de login
            if (!email) {
                alert("Por favor, insira seu email para redefinir a senha.");
                return;
            }

            try {
                await sendPasswordResetEmail(auth, email);
                passwordResetMessage.textContent = "Email de redefinição de senha enviado. Verifique sua caixa de entrada (e spam).";
                passwordResetMessage.style.display = "block"; // Mostra mensagem de sucesso
                // Oculta a mensagem após alguns segundos (opcional)
                setTimeout(() => {
                    passwordResetMessage.style.display = "none";
                }, 5000); // Oculta após 5 segundos
            } catch (error) {
                console.error("Erro ao enviar email de redefinição:", error);
                alert("Erro ao redefinir a senha. Verifique o console para detalhes.");
                passwordResetMessage.textContent = "Erro ao enviar email de redefinição. Tente novamente.";
                passwordResetMessage.style.display = "block"; // Mostra mensagem de erro
            }
        });
    }

    // ==== ADICIONANDO EVENT LISTENERS PROGRAMATICAMENTE ====

    // Event listeners para inputs de quantidade de produtos (tabela de orçamento)
    document.querySelectorAll('#tabelaProdutos tbody').forEach(tbody => {
        tbody.addEventListener('change', function(event) {
            if (event.target.classList.contains('produto-quantidade')) {
                atualizarTotais();
            }
        });
    });

    // Event listeners para inputs de valor unitário de produtos (tabela de orçamento)
    document.querySelectorAll('#tabelaProdutos tbody').forEach(tbody => {
        tbody.addEventListener('input', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                formatarEntradaMoeda(event.target);
                atualizarTotais(); // CHAME A FUNÇÃO AQUI TAMBÉM NO EVENTO 'input'
            }
        });
        tbody.addEventListener('blur', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                atualizarTotais();
            }
        });
    });

    // Event listeners para o input de valor do frete (formulário de orçamento)
    const valorFreteInput = document.getElementById('valorFrete');
    if (valorFreteInput) {
        valorFreteInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
        });
        valorFreteInput.addEventListener('blur', atualizarTotais);
    }

     // Event listeners para inputs de quantidade de produtos (tabela de edição de pedido)
    document.querySelectorAll('#tabelaProdutosEdicao tbody').forEach(tbody => {
        tbody.addEventListener('change', function(event) {
            if (event.target.classList.contains('produto-quantidade')) {
                atualizarTotaisEdicao();
            }
        });
    });

    // Event listeners para inputs de valor unitário de produtos (tabela de edição de pedido)
    document.querySelectorAll('#tabelaProdutosEdicao tbody').forEach(tbody => {
        tbody.addEventListener('input', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                formatarEntradaMoeda(event.target);
                atualizarTotaisEdicao(); // CHAME A FUNÇÃO AQUI TAMBÉM NO EVENTO 'input'
            }
        });
        tbody.addEventListener('blur', function(event) {
            if (event.target.classList.contains('produto-valor-unit')) {
                atualizarTotaisEdicao();
            }
        });
    });

    // Event listeners para o input de valor do frete (formulário de edição de pedido)
    const valorFreteEdicaoInput = document.getElementById('valorFreteEdicao');
    if (valorFreteEdicaoInput) {
        valorFreteEdicaoInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
        });
        valorFreteEdicaoInput.addEventListener('blur', atualizarTotaisEdicao);
    }

     // Event listeners para o input de valor do pedido (formulário de edição de pedido)
    const valorPedidoEdicaoInput = document.getElementById('valorPedidoEdicao');
    if (valorPedidoEdicaoInput) {
        valorPedidoEdicaoInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
        });
        valorPedidoEdicaoInput.addEventListener('blur', atualizarTotaisEdicao);
    }

    // Event listener para o input de Entrada no formulário de edição de pedido
    const entradaEdicaoInput = document.getElementById('entradaEdicao');
    if (entradaEdicaoInput) {
        entradaEdicaoInput.addEventListener('input', function() {
            formatarEntradaMoeda(this);
            atualizarRestanteEdicao(); // Atualiza o restante ao digitar a entrada
        });
        entradaEdicaoInput.addEventListener('blur', atualizarRestanteEdicao); // Garante que atualiza no blur também
    }

    // Event listeners para os botões de paginação dos Orçamentos
    document.getElementById('nextPageOrcamentos').addEventListener('click', nextPageOrcamentos);
    document.getElementById('prevPageOrcamentos').addEventListener('click', previousPageOrcamentos);

    // Event listeners para os botões de paginação dos Pedidos
    document.getElementById('nextPagePedidos').addEventListener('click', nextPagePedidos);
    document.getElementById('prevPagePedidos').addEventListener('click', previousPagePedidos);

    // ==== FIM - ADICIONANDO EVENT LISTENERS PROGRAMATICAMENTE ====

    // Inicializar campos moeda para 'R$ 0,00' no carregamento da página
    limparCamposMoeda();

    // Inicializa a exibição na primeira página ao carregar a página
    mostrarOrcamentosGerados(1);
    mostrarPedidosRealizados(1);
});
