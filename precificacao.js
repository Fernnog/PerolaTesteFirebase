// ==== INÍCIO SEÇÃO - IMPORTS FIREBASE SDKS ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Configuração do Firebase (substitua pelas suas credenciais)
const firebaseConfig = {
    //SUAS CREDENCIAIS AQUI
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

// Variáveis globais
let usuarioLogado = null;
let unsubscribeMateriais = null; // Para cancelar o listener de materiais
let unsubscribeProdutos = null; // Para cancelar o listener de produtos
let unsubscribeCustosIndiretos = null;
let unsubscribePrecificacoes = null;
let unsubscribeMaoDeObra = null;

// --- ELEMENTOS HTML (CACHE) ---
// Autenticação
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authMessage = document.getElementById('auth-message');
const userInfo = document.getElementById('user-info');

// Materiais e Insumos
const formMateriaisInsumos = document.getElementById('form-materiais-insumos');
const cadastrarMaterialInsumoBtn = document.getElementById('cadastrar-material-insumo-btn');
const tabelaMateriaisInsumos = document.getElementById('tabela-materiais-insumos').querySelector('tbody');
const buscaMaterialInput = document.getElementById('busca-material');
const tipoMaterialRadios = document.querySelectorAll('input[name="tipo-material"]'); // Todos os radios de tipo
const camposComprimento = document.getElementById('campos-comprimento');
const camposLitro = document.getElementById('campos-litro');
const camposQuilo = document.getElementById('campos-quilo');
const camposArea = document.getElementById('campos-area');

// Mão de Obra
const formMaoDeObra = document.getElementById('form-mao-de-obra');
const salarioReceberInput = document.getElementById('salario-receber');
const horasTrabalhadasInput = document.getElementById('horas-trabalhadas');
const valorHoraInput = document.getElementById('valor-hora');
const incluirFerias13oSimRadio = document.getElementById('incluir-ferias-13o-sim');
const incluirFerias13oNaoRadio = document.getElementById('incluir-ferias-13o-nao');
const custoFerias13oInput = document.getElementById('custo-ferias-13o');
const btnSalvarMaoDeObra = document.getElementById('btn-salvar-mao-de-obra');
const btnEditarMaoDeObra = document.getElementById('btn-editar-mao-de-obra');

// Custos Indiretos
const listaCustosIndiretos = document.getElementById('lista-custos-indiretos');
const adicionarCustoIndiretoBtn = document.getElementById('adicionarCustoIndiretoBtn');
const tabelaCustosIndiretos = document.getElementById('tabela-custos-indiretos').querySelector('tbody');
const buscaCustoIndiretoInput = document.getElementById('busca-custo-indireto');

// Produtos Cadastrados
const formProdutosCadastrados = document.getElementById('form-produtos-cadastrados');
const cadastrarProdutoBtn = document.getElementById('cadastrar-produto-btn');
const pesquisaMaterialInput = document.getElementById('pesquisa-material');
const resultadosPesquisaDiv = document.getElementById('resultados-pesquisa');
const tabelaMateriaisProduto = document.getElementById('tabela-materiais-produto').querySelector('tbody');
const tabelaProdutos = document.getElementById('tabela-produtos').querySelector('tbody');
const buscaProdutoInput = document.getElementById('busca-produto');

// Cálculo da Precificação
const nomeClienteInput = document.getElementById('nome-cliente');
const produtoPesquisaInput = document.getElementById('produto-pesquisa');
const produtoResultadosDiv = document.getElementById('produto-resultados');
const custoProdutoSpan = document.getElementById('custo-produto');
const detalhesProdutoDiv = document.getElementById('detalhes-produto');
const listaMateriaisProdutoPrecificacao = document.getElementById('lista-materiais-produto');
const horasProdutoInput = document.getElementById('horas-produto');
const custoMaoDeObraDetalheSpan = document.getElementById('custo-mao-de-obra-detalhe');
const custoFerias13oDetalheSpan = document.getElementById('custo-ferias-13o-detalhe');
const totalMaoDeObraSpan = document.getElementById('total-mao-de-obra');
const custoIndiretoSpan = document.getElementById('custo-indireto');
const detalhesCustosIndiretosDiv = document.getElementById('detalhes-custos-indiretos');
const listaCustosIndiretosDetalhes = document.getElementById('lista-custos-indiretos-detalhes');
const subtotalSpan = document.getElementById('subtotal');
const margemLucroValorSpan = document.getElementById('margem-lucro-valor');
const margemLucroFinalInput = document.getElementById('margem-lucro-final');
const totalFinalSpan = document.getElementById('total-final');
const taxaCreditoValorSpan = document.getElementById('taxa-credito-valor');
const incluirTaxaCreditoSimRadio = document.getElementById('incluir-taxa-credito-sim');
const incluirTaxaCreditoNaoRadio = document.getElementById('incluir-taxa-credito-nao');
const taxaCreditoPercentualInput = document.getElementById('taxa-credito-percentual');
const totalFinalComTaxasSpan = document.getElementById('total-final-com-taxas');

// Precificações Geradas
const tabelaPrecificacoesGeradas = document.getElementById('tabela-precificacoes-geradas').querySelector('tbody');
const buscaPrecificacaoInput = document.getElementById('busca-precificacao');
const detalhePrecificacaoContainer = document.getElementById('detalhe-precificacao-container');


// --- FUNÇÕES AUXILIARES ---

function showSection(sectionId) {
    document.querySelectorAll('.subpagina').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}

function clearForm(form) {
    form.reset();
}

function formatarMoeda(valor) {
    return valor.toFixed(2).replace('.', ',');
}


// --- AUTENTICAÇÃO ---

function updateAuthState(user) {
    if (user) {
        usuarioLogado = user;
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userInfo.textContent = `Usuário: ${user.email}`;
        carregarDados(); // Carrega todos os dados ao logar
    } else {
        usuarioLogado = null;
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        userInfo.textContent = '';
        limparDados(); // Limpa os dados ao deslogar
    }
}


function limparDados() {
    // Cancela os listeners, se existirem
    if (unsubscribeMateriais) unsubscribeMateriais();
    if (unsubscribeProdutos) unsubscribeProdutos();
    if (unsubscribeCustosIndiretos) unsubscribeCustosIndiretos();
    if (unsubscribePrecificacoes) unsubscribePrecificacoes();
    if (unsubscribeMaoDeObra) unsubscribeMaoDeObra();

    // Limpa as tabelas e listas
    tabelaMateriaisInsumos.innerHTML = '';
    tabelaProdutos.innerHTML = '';
    tabelaCustosIndiretos.innerHTML = '';
    tabelaPrecificacoesGeradas.innerHTML = '';
    listaCustosIndiretos.innerHTML = '';

    // Limpa outros campos, se necessário
    clearForm(formMateriaisInsumos);
    clearForm(formProdutosCadastrados);
    clearForm(formMaoDeObra);

}

registerBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            authMessage.textContent = `Usuário ${userCredential.user.email} registrado com sucesso!`;
        })
        .catch((error) => {
            authMessage.textContent = `Erro ao registrar: ${error.message}`;
        });
});

loginBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            authMessage.textContent = `Usuário ${userCredential.user.email} logado com sucesso!`;
            // updateAuthState é chamado automaticamente pelo onAuthStateChanged
        })
        .catch((error) => {
            authMessage.textContent = `Erro ao logar: ${error.message}`;
        });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            authMessage.textContent = 'Logout realizado com sucesso.';
            // updateAuthState é chamado automaticamente pelo onAuthStateChanged
        })
        .catch((error) => {
            authMessage.textContent = `Erro ao fazer logout: ${error.message}`;
        });
});

forgotPasswordBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    if (email) {
        sendPasswordResetEmail(auth, email)
            .then(() => {
                authMessage.textContent = `E-mail de redefinição de senha enviado para ${email}. Verifique sua caixa de entrada.`;
            })
            .catch((error) => {
                authMessage.textContent = `Erro ao enviar e-mail de redefinição: ${error.message}`;
            });
    } else {
        authMessage.textContent = "Por favor, digite seu e-mail no campo acima.";
    }
});

onAuthStateChanged(auth, updateAuthState);


// --- NAVEGAÇÃO ---
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const submenu = event.target.dataset.submenu;
        showSection(submenu);
        // Se precisar limpar dados ao trocar de seção, adicione aqui.
    });
});

// --- MATERIAIS E INSUMOS ---

// Função para alternar a visibilidade dos campos de dimensão
function toggleCamposDimensao() {
    const tipoSelecionado = document.querySelector('input[name="tipo-material"]:checked').value;

    camposComprimento.style.display = 'none';
    camposLitro.style.display = 'none';
    camposQuilo.style.display = 'none';
    camposArea.style.display = 'none';


    switch (tipoSelecionado) {
        case 'comprimento':
            camposComprimento.style.display = 'block';
            break;
        case 'litro':
            camposLitro.style.display = 'block';
            break;
        case 'quilo':
            camposQuilo.style.display = 'block';
            break;
        case 'area':
            camposArea.style.display = 'block';
            break;
    }
}

// Event listener para os radio buttons de tipo de material
tipoMaterialRadios.forEach(radio => {
    radio.addEventListener('change', toggleCamposDimensao);
});

//Cadastro
cadastrarMaterialInsumoBtn.addEventListener('click', () => {
    const nome = document.getElementById('nome-material').value;
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value);


    if (!nome || isNaN(valorTotal)) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    let dimensoes = {};
    let quantidade = 1; // Valor padrão para tipos que não usam dimensão
    let unidadeMedida = '';

    switch (tipo) {
        case 'comprimento':
            dimensoes.comprimento = parseFloat(document.getElementById('comprimento-cm').value);
            quantidade = dimensoes.comprimento;
            unidadeMedida = 'cm';
            break;
        case 'litro':
            dimensoes.volume = parseFloat(document.getElementById('volume-ml').value);
            quantidade = dimensoes.volume / 1000;
            unidadeMedida = 'L';
            break;
        case 'quilo':
            dimensoes.peso = parseFloat(document.getElementById('peso-g').value);
            quantidade = dimensoes.peso / 1000;
            unidadeMedida = 'kg';
            break;
        case 'unidade':
            quantidade = 1; // Já é 1 por padrão
            unidadeMedida = 'un';
            break;
        case 'area':
            dimensoes.largura = parseFloat(document.getElementById('largura-cm').value);
            dimensoes.altura = parseFloat(document.getElementById('altura-cm').value);
            quantidade = (dimensoes.largura * dimensoes.altura) / 10000;
            unidadeMedida = 'm²';
            break;
    }

     const custoUnitario = valorTotal / quantidade;


    const material = {
        nome,
        tipo,
        dimensoes,
        valorTotal,
        custoUnitario,
        unidadeMedida
    };

    addDoc(collection(firestore, 'materiais'), material)
    .then(() => {
        console.log("Material cadastrado com sucesso!");
        clearForm(formMateriaisInsumos); // Limpa o formulário
        toggleCamposDimensao();  //Reseta os campos para o padrão
        atualizarCustoProdutoAposAlteracaoMaterial(); // <--- Chamada aqui

    })
    .catch(error => {
        console.error("Erro ao cadastrar material:", error);
    });
});

function renderizarMateriais(snapshot) {
    tabelaMateriaisInsumos.innerHTML = ''; // Limpa a tabela

    snapshot.forEach(doc => {
        const material = doc.data();
        const materialId = doc.id;
        const row = document.createElement('tr');
        row.dataset.id = materialId; // Armazena o ID do documento

        let dimensoesTexto = '';
        switch (material.tipo) {
            case 'comprimento':
                dimensoesTexto = `${material.dimensoes.comprimento} cm`;
                break;
            case 'litro':
                dimensoesTexto = `${material.dimensoes.volume / 1000} L`;
                break;
            case 'quilo':
                dimensoesTexto = `${material.dimensoes.peso / 1000} kg`;
                break;
            case 'unidade':
                dimensoesTexto = '1 un';
                break;
            case 'area':
                dimensoesTexto = `${material.dimensoes.largura}cm x ${material.dimensoes.altura}cm (${(material.dimensoes.largura * material.dimensoes.altura / 10000).toFixed(2)} m²)`;
                break;
        }

        row.innerHTML = `
            <td>${material.nome}</td>
            <td>${material.tipo}</td>
            <td>${dimensoesTexto}</td>
            <td>R$ ${formatarMoeda(material.valorTotal)}</td>
            <td>R$ ${formatarMoeda(material.custoUnitario)}</td>
            <td>
                <button type="button" class="btn-editar-material">Editar</button>
                <button type="button" class="btn-excluir-material">Excluir</button>
            </td>
        `;
        tabelaMateriaisInsumos.appendChild(row);
    });

    // Adiciona event listeners aos botões após renderizar a tabela
    adicionarEventosBotoesMateriais();
}

// --- EDIÇÃO E EXCLUSÃO DE MATERIAIS ---
function adicionarEventosBotoesMateriais() {
    // Botões de Editar
    const botoesEditar = tabelaMateriaisInsumos.querySelectorAll('.btn-editar-material');
    botoesEditar.forEach(btn => {
        btn.addEventListener('click', () => editarMaterialInsumo(btn));
    });

    // Botões de Excluir
    const botoesExcluir = tabelaMateriaisInsumos.querySelectorAll('.btn-excluir-material');
    botoesExcluir.forEach(btn => {
        btn.addEventListener('click', () => excluirMaterialInsumo(btn)); // Corrigido aqui
    });
}
function editarMaterialInsumo(btn) {
      const row = btn.closest('tr');
    const materialId = row.dataset.id;

    getDoc(doc(firestore, 'materiais', materialId))
        .then(docSnap => {
            if (docSnap.exists()) {
                const material = docSnap.data();

                // Preenche o formulário com os dados do material
                document.getElementById('nome-material').value = material.nome;
                document.querySelector(`input[name="tipo-material"][value="${material.tipo}"]`).checked = true;
                document.getElementById('valor-total-material').value = material.valorTotal;


                // Preenche os campos de dimensão
                switch (material.tipo) {
                    case 'comprimento':
                         document.getElementById('comprimento-cm').value = material.dimensoes.comprimento;
                        break;
                    case 'litro':
                        document.getElementById('volume-ml').value = material.dimensoes.volume;
                        break;
                    case 'quilo':
                        document.getElementById('peso-g').value = material.dimensoes.peso;
                        break;
                    case 'area':
                        document.getElementById('largura-cm').value = material.dimensoes.largura;
                        document.getElementById('altura-cm').value = material.dimensoes.altura;
                        break;
                }

                  toggleCamposDimensao(); // Importante!

                // Muda o texto do botão e adiciona um novo event listener
                cadastrarMaterialInsumoBtn.textContent = 'Salvar Alterações';
                const salvarAlteracoesHandler = () => {
                   // Coleta os dados do formulário (similar ao cadastro)
                    const nome = document.getElementById('nome-material').value;
                    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
                    const valorTotal = parseFloat(document.getElementById('valor-total-material').value);

                    if (!nome || isNaN(valorTotal)) {
                        alert('Por favor, preencha todos os campos obrigatórios.');
                        return;
                    }

                    let dimensoes = {};
                    let quantidade = 1;
                    switch (tipo) {
                        case 'comprimento':
                            dimensoes.comprimento = parseFloat(document.getElementById('comprimento-cm').value);
                            quantidade = dimensoes.comprimento;
                            break;
                        case 'litro':
                            dimensoes.volume = parseFloat(document.getElementById('volume-ml').value);
                             quantidade = dimensoes.volume / 1000;
                            break;
                        case 'quilo':
                            dimensoes.peso = parseFloat(document.getElementById('peso-g').value);
                            quantidade = dimensoes.peso / 1000;
                            break;
                        case 'unidade':
                            quantidade = 1;
                            break;
                        case 'area':
                            dimensoes.largura = parseFloat(document.getElementById('largura-cm').value);
                            dimensoes.altura = parseFloat(document.getElementById('altura-cm').value);
                            quantidade = (dimensoes.largura * dimensoes.altura) / 10000;
                            break;
                    }

                    const custoUnitario = valorTotal / quantidade;

                    // Objeto com os dados atualizados
                    const materialAtualizado = {
                        nome,
                        tipo,
                        dimensoes,
                        valorTotal,
                        custoUnitario
                    };



                    // Atualiza o documento no Firestore
                    updateDoc(doc(firestore, 'materiais', materialId), materialAtualizado)
                        .then(() => {
                            console.log("Material atualizado com sucesso!");
                            clearForm(formMateriaisInsumos);
                            cadastrarMaterialInsumoBtn.textContent = 'Cadastrar';
                            cadastrarMaterialInsumoBtn.removeEventListener('click', salvarAlteracoesHandler); // Remove o listener específico
                            toggleCamposDimensao(); //Reseta os campos para o padrão
                             atualizarCustoProdutoAposAlteracaoMaterial();
                        })
                        .catch(error => {
                            console.error("Erro ao atualizar material:", error);
                        });


                };
                cadastrarMaterialInsumoBtn.addEventListener('click', salvarAlteracoesHandler);

            } else {
                console.log("Material não encontrado!");
            }
        })
        .catch(error => {
            console.error("Erro ao buscar material:", error);
        });

}


// --- FUNÇÃO DE VERIFICAÇÃO DE USO DE MATERIAL (Melhoria) ---
async function materialEstaEmUso(materialId) {
    const produtosRef = collection(firestore, 'produtos');
    const querySnapshot = await getDocs(produtosRef);

    for (const doc of querySnapshot.docs) {
        const produto = doc.data();
        if (produto.materiais && produto.materiais.some(m => m.materialId === materialId)) {
            return true; // Material está em uso
        }
    }
    return false; // Material não está em uso
}

// --- EXCLUSÃO DE MATERIAL (Melhoria) ---
async function excluirMaterialInsumo(btn) {
    const row = btn.closest('tr');
    const materialId = row.dataset.id;

    const emUso = await materialEstaEmUso(materialId); // Chama a função e espera a resposta

    if (emUso) {
        alert("Este material está sendo utilizado em um ou mais produtos cadastrados. Remova-o dos produtos antes de excluí-lo.");
    } else {
        // Código original para excluir o material (agora dentro do else)
        try {
            await deleteDoc(doc(firestore, 'materiais', materialId));
            row.remove();
            console.log("Material excluído com sucesso!");
            atualizarCustoProdutoAposAlteracaoMaterial(); // Mantém a atualização dos produtos
        } catch (error) {
            console.error("Erro ao excluir material:", error);
        }
    }
}



function buscarMateriaisCadastrados() {
    const termoBusca = buscaMaterialInput.value.toLowerCase();

    const rows = tabelaMateriaisInsumos.querySelectorAll('tr');

    rows.forEach(row => {
        const nomeMaterial = row.querySelector('td:first-child').textContent.toLowerCase();
        if (nomeMaterial.includes(termoBusca)) {
            row.style.display = ''; // Mostra a linha
        } else {
            row.style.display = 'none'; // Esconde a linha
        }
    });
}

// --- MÃO DE OBRA ---
function carregarDadosMaoDeObra() {
     if (!usuarioLogado) return; // Garante que só executa se estiver logado

    const maoDeObraRef = collection(firestore, 'maoDeObra');
    unsubscribeMaoDeObra = onSnapshot(maoDeObraRef, (snapshot) => { // onSnapshot para atualizações em tempo real
        snapshot.docChanges().forEach(change => {
            const dados = change.doc.data();

               if (change.type === "added" || change.type === "modified") {

                salarioReceberInput.value = dados.salario || '';
                horasTrabalhadasInput.value = dados.horasTrabalhadas || 220; // Valor padrão

                 if (dados.incluirFerias13o === 'sim') {
                    incluirFerias13oSimRadio.checked = true;
                } else {
                    incluirFerias13oNaoRadio.checked = true;
                }
                calcularValorHora(); // Calcula e atualiza os campos
                btnSalvarMaoDeObra.style.display = "none";
                btnEditarMaoDeObra.style.display = "inline-block";

            } else if (change.type === "removed") { //Se for removido, reseta
                clearForm(formMaoDeObra);
                valorHoraInput.value = '';
                custoFerias13oInput.value = '';
                btnSalvarMaoDeObra.style.display = 'inline-block';
                 btnEditarMaoDeObra.style.display = 'none';
            }
        });
    },
        (error) => { console.error("Erro ao carregar dados de mão de obra", error); }

    );
}

//Salvar
btnSalvarMaoDeObra.addEventListener('click', () => {
    const salario = parseFloat(salarioReceberInput.value);
    const horasTrabalhadas = parseInt(horasTrabalhadasInput.value);
    const incluirFerias13o = document.querySelector('input[name="incluir-ferias-13o"]:checked').value;

    if (isNaN(salario) || isNaN(horasTrabalhadas)) {
        alert("Preencha os valores de salário e horas trabalhadas.");
        return;
    }

    const dadosMaoDeObra = {
        salario,
        horasTrabalhadas,
        incluirFerias13o
    };

    // Adiciona os dados, usando addDoc para gerar um ID automático
    addDoc(collection(firestore, 'maoDeObra'), dadosMaoDeObra)
        .then(() => {
            console.log("Dados de mão de obra salvos com sucesso!");
            btnSalvarMaoDeObra.style.display = 'none'; //Esconde o botão Salvar
            btnEditarMaoDeObra.style.display = 'inline-block';//Mostra o botão Editar
        })
        .catch(error => console.error("Erro ao salvar dados de mão de obra:", error));
});

btnEditarMaoDeObra.addEventListener('click', () => {
    //1 - Coleta os dados dos inputs
    const salario = parseFloat(salarioReceberInput.value);
    const horasTrabalhadas = parseInt(horasTrabalhadasInput.value);
     const incluirFerias13o = document.querySelector('input[name="incluir-ferias-13o"]:checked').value;


    if (isNaN(salario) || isNaN(horasTrabalhadas)) {
        alert("Preencha os valores de salário e horas trabalhadas.");
        return;
    }

     const dadosMaoDeObraAtualizados = {
        salario,
        horasTrabalhadas,
        incluirFerias13o
    };

    // 2 - Busca o documento existente (precisa do ID)
    const maoDeObraRef = collection(firestore, 'maoDeObra');
    getDocs(maoDeObraRef)  // Usa getDocs, porque não sabemos o ID
        .then(querySnapshot => {
            if (querySnapshot.size === 0) { //Verifica se a coleção está vazia
                console.log("Nenhum dado de mão de obra encontrado para editar");
                return;
            }
            const docRef = querySnapshot.docs[0].ref; //Pega a referência do primeiro documento

            // 3- Atualiza o documento
              updateDoc(docRef, dadosMaoDeObraAtualizados)
                .then(() => {
                    console.log("Dados de mão de obra atualizados com sucesso!");
                })
                .catch(error => console.error("Erro ao atualizar dados de mão de obra:", error));
        })
           .catch(error => console.error("Erro ao buscar dados de mão de obra para edição:", error));
});

function calcularValorHora() {
     const salario = parseFloat(salarioReceberInput.value);
    const horasTrabalhadas = parseInt(horasTrabalhadasInput.value);
    const incluirFerias13o = document.querySelector('input[name="incluir-ferias-13o"]:checked').value;

    if (!isNaN(salario) && !isNaN(horasTrabalhadas) && horasTrabalhadas > 0) {
        const valorHora = salario / horasTrabalhadas;
        valorHoraInput.value = formatarMoeda(valorHora);

        if (incluirFerias13o === 'sim') {
            const custoFerias13o = valorHora * 0.2; // Exemplo: 20% do valor da hora
            custoFerias13oInput.value = formatarMoeda(custoFerias13o);
        } else {
            custoFerias13oInput.value = '0,00';
        }
    } else {
        valorHoraInput.value = '';
        custoFerias13oInput.value = '';
    }

}

// Event listeners para calcular o valor da hora
salarioReceberInput.addEventListener('input', calcularValorHora);
horasTrabalhadasInput.addEventListener('input', calcularValorHora);
incluirFerias13oSimRadio.addEventListener('change', calcularValorHora);
incluirFerias13oNaoRadio.addEventListener('change', calcularValorHora);

// --- CUSTOS INDIRETOS ---
function carregarCustosIndiretos() {
    if (!usuarioLogado) return; // Só carrega se estiver logado

     const custosIndiretosRef = collection(firestore, 'custosIndiretos');
    unsubscribeCustosIndiretos = onSnapshot(custosIndiretosRef, (snapshot) => {
        tabelaCustosIndiretos.innerHTML = ''; // Limpa a tabela
        listaCustosIndiretos.innerHTML = ''; // Limpa a lista de inputs

        snapshot.forEach(doc => {
            const custo = doc.data();
            const custoId = doc.id;

            // Adiciona na tabela (para visualização)
            const row = document.createElement('tr');
            row.dataset.id = custoId;
            row.innerHTML = `
                <td>${custo.descricao}</td>
                <td>R$ ${formatarMoeda(custo.valorMensal)}</td>
                <td>R$ ${formatarMoeda(custo.valorHora)}</td>
                <td>
                    <button type="button" class="btn-editar-custo">Editar</button>
                    <button type="button" class="btn-excluir-custo">Excluir</button>
                </td>
            `;
            tabelaCustosIndiretos.appendChild(row);
        });
         adicionarEventosCustosIndiretos();
    },
        (error) => { console.error("Erro ao carregar custos indiretos:", error) });
}

//Adicionar
adicionarCustoIndiretoBtn.addEventListener('click', () => {
    // Cria os elementos
    const li = document.createElement('li');
    li.classList.add('custo-indireto-item');

    const nomeInput = document.createElement('input');
    nomeInput.type = 'text';
    nomeInput.placeholder = 'Descrição do custo';
    nomeInput.classList.add('custo-item-nome');

    const valorInput = document.createElement('input');
    valorInput.type = 'number';
    valorInput.placeholder = 'Valor mensal';
    valorInput.classList.add('custo-item-valor');
    valorInput.step = '0.01';

    const salvarBtn = document.createElement('button');
    salvarBtn.textContent = 'Salvar';
    salvarBtn.type = 'button';
    salvarBtn.classList.add('custo-item-salvar');

    const cancelarBtn = document.createElement('button');
    cancelarBtn.textContent = 'Cancelar';
    cancelarBtn.type = 'button';
    cancelarBtn.classList.add('custo-item-cancelar'); // Adiciona classe

    // Monta a estrutura do <li>
    li.appendChild(nomeInput);
    li.appendChild(valorInput);
    li.appendChild(salvarBtn);
    li.appendChild(cancelarBtn); // Adiciona o botão

    // Adiciona o <li> à lista
    listaCustosIndiretos.appendChild(li);

     // Event listener para o botão "Cancelar"
    cancelarBtn.addEventListener('click', () => {
        li.remove(); // Remove o item da lista
    });

    // Event listener para o botão "Salvar"
    salvarBtn.addEventListener('click', () => {
        const descricao = nomeInput.value;
        const valorMensal = parseFloat(valorInput.value);

        if (!descricao || isNaN(valorMensal)) {
            alert('Preencha a descrição e o valor mensal.');
            return;
        }

        //Calcula
        let valorHora = 0;
        getDocs(collection(firestore, 'maoDeObra')).then(querySnapshot => {
            if (!querySnapshot.empty) {
                const dadosMaoDeObra = querySnapshot.docs[0].data();
                const horasTrabalhadas = dadosMaoDeObra.horasTrabalhadas || 220; // Padrão
                valorHora = valorMensal / horasTrabalhadas;
            }

             const custoIndireto = {
                descricao,
                valorMensal,
                valorHora
             };

            addDoc(collection(firestore, 'custosIndiretos'), custoIndireto)
                .then(() => {
                    console.log("Custo indireto cadastrado com sucesso!");
                    li.remove(); // Remove o formulário da lista
                })
                .catch(error => console.error("Erro ao cadastrar custo indireto:", error));
        });
    });
});

// --- EDIÇÃO E EXCLUSÃO DE CUSTOS INDIRETOS ---
function adicionarEventosCustosIndiretos() {
    // Botões de Editar
    const botoesEditar = tabelaCustosIndiretos.querySelectorAll('.btn-editar-custo');
    botoesEditar.forEach(btn => {
        btn.addEventListener('click', () => editarCustoIndireto(btn));
    });

    // Botões de Excluir
    const botoesExcluir = tabelaCustosIndiretos.querySelectorAll('.btn-excluir-custo');
    botoesExcluir.forEach(btn => {
        btn.addEventListener('click', () => excluirCustoIndireto(btn));
    });
}

function editarCustoIndireto(btn) {
    const row = btn.closest('tr');
    const custoId = row.dataset.id;

    getDoc(doc(firestore, 'custosIndiretos', custoId))
        .then(docSnap => {
            if (docSnap.exists()) {
                const custo = docSnap.data();

                // Cria os inputs para edição
                const inputDescricao = document.createElement('input');
                inputDescricao.type = 'text';
                inputDescricao.value = custo.descricao;
                inputDescricao.classList.add('edit-descricao');

                const inputValorMensal = document.createElement('input');
                inputValorMensal.type = 'number';
                inputValorMensal.value = custo.valorMensal;
                inputValorMensal.step = '0.01';
                inputValorMensal.classList.add('edit-valor-mensal');

                // Substitui as células da tabela pelos inputs
                row.cells[0].innerHTML = ''; // Limpa a célula
                row.cells[0].appendChild(inputDescricao);
                row.cells[1].innerHTML = '';
                row.cells[1].appendChild(inputValorMensal);

                // Remove o botão "Editar" e adiciona "Salvar" e "Cancelar"
                btn.style.display = 'none'; // Esconde o botão "Editar"
                const salvarBtn = document.createElement('button');
                salvarBtn.textContent = 'Salvar';
                salvarBtn.type = 'button';
                salvarBtn.classList.add('btn-salvar-edicao-custo');

                const cancelarBtn = document.createElement('button');
                cancelarBtn.textContent = 'Cancelar';
                cancelarBtn.type = 'button';
                cancelarBtn.classList.add('btn-cancelar-edicao-custo');

                row.cells[3].appendChild(salvarBtn); // Adiciona na célula de ações
                row.cells[3].appendChild(cancelarBtn);

                // Evento do botão "Salvar"
                salvarBtn.addEventListener('click', () => {
                    const novaDescricao = inputDescricao.value;
                    const novoValorMensal = parseFloat(inputValorMensal.value);

                    if (!novaDescricao || isNaN(novoValorMensal)) {
                        alert('Preencha a descrição e o valor mensal.');
                        return;
                    }

                    // Recalcula o valor por hora
                    let novoValorHora = 0;
                    getDocs(collection(firestore, 'maoDeObra')).then(querySnapshot => {
                        if (!querySnapshot.empty) {
                            const dadosMaoDeObra = querySnapshot.docs[0].data();
                            const horasTrabalhadas = dadosMaoDeObra.horasTrabalhadas || 220;
                            novoValorHora = novoValorMensal / horasTrabalhadas;
                        }

                        // Atualiza o documento no Firestore
                        updateDoc(doc(firestore, 'custosIndiretos', custoId), {
                            descricao: novaDescricao,
                            valorMensal: novoValorMensal,
                            valorHora: novoValorHora
                        })
                        .then(() => {
                            console.log("Custo indireto atualizado com sucesso!");
                        })
                        .catch(error => console.error("Erro ao atualizar custo indireto:", error));
                    });
                });

                // Evento do botão "Cancelar"
                cancelarBtn.addEventListener('click', () => {
                    // Restaura a exibição original da linha
                    row.cells[0].textContent = custo.descricao;
                    row.cells[1].textContent = `R$ ${formatarMoeda(custo.valorMensal)}`;
                    row.cells[2].textContent = `R$ ${formatarMoeda(custo.valorHora)}`;

                    // Remove os botões "Salvar" e "Cancelar" e exibe "Editar" novamente
                    salvarBtn.remove();
                    cancelarBtn.remove();
                    btn.style.display = 'inline-block'; // Mostra o botão "Editar"
                });

            } else {
                console.log("Custo indireto não encontrado!");
            }
        })
        .catch(error => console.error("Erro ao buscar custo indireto:", error));
}

function excluirCustoIndireto(btn) {
     const row = btn.closest('tr');
    const custoId = row.dataset.id;

     deleteDoc(doc(firestore, 'custosIndiretos', custoId))
        .then(() => {
            console.log("Custo indireto excluído com sucesso!");
             row.remove();
        })
        .catch(error => console.error("Erro ao excluir custo indireto:", error));

}

function buscarCustosIndiretosCadastrados() {
    const termoBusca = buscaCustoIndiretoInput.value.toLowerCase();
    const rows = tabelaCustosIndiretos.querySelectorAll('tr');

    rows.forEach(row => {
        const descricao = row.querySelector('td:first-child').textContent.toLowerCase();
        if (descricao.includes(termoBusca)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


// --- PRODUTOS CADASTRADOS ---

function carregarProdutosCadastrados() {
    if (!usuarioLogado) return;

    const produtosRef = collection(firestore, 'produtos');
    unsubscribeProdutos = onSnapshot(produtosRef, (snapshot) => {
        tabelaProdutos.innerHTML = ''; // Limpa a tabela

        snapshot.forEach(doc => {
            const produto = doc.data();
            const produtoId = doc.id;

            const row = document.createElement('tr');
            row.dataset.id = produtoId;

            // Formata a lista de materiais
            let materiaisList = '';
            if (produto.materiais && produto.materiais.length > 0) {
                materiaisList = produto.materiais.map(m => {
                    let detalhes = '';
                    if (m.tipo === 'area') {
                        detalhes = `${m.largura}cm x ${m.altura}cm`;
                    } else if (m.tipo === 'comprimento') {
                         detalhes = `${m.comprimento}cm`;
                    } else if (m.tipo === "litro") {
                        detalhes = `${m.quantidade}L`;
                    } else if (m.tipo === "quilo") {
                        detalhes = `${m.quantidade}kg`;
                    }
                      else {
                        detalhes = `${m.quantidade}un`;
                    }

                    return `${m.nome} (${detalhes})`;
                }).join(', ');
            }
             // Formata os custos e dimensões
                let custosDimensoesList = '';
                if (produto.materiais && produto.materiais.length > 0) {
                    custosDimensoesList = produto.materiais.map(m => {
                        let detalhes = `Custo Unit.: R$ ${formatarMoeda(m.custoUnitario)}`;
                        if (m.tipo === 'area') {
                            detalhes += `, ${m.largura}cm x ${m.altura}cm`;
                        } else if (m.tipo === 'comprimento') {
                            detalhes += `, ${m.comprimento}cm`;
                        } else if (m.tipo === 'litro' || m.tipo === 'quilo' || m.tipo === 'unidade'){
                            detalhes += `, ${m.quantidade}${m.tipo.charAt(0)}`; //"L", "kg" ou "un"
                        }
                        return detalhes;

                    }).join('; ');
                }

            row.innerHTML = `
                <td>${produto.nome}</td>
                <td>${materiaisList}</td>
                <td>${custosDimensoesList}</td>
                <td>R$ ${formatarMoeda(produto.custoTotalMateriais || 0)}</td>
                <td>
                    <button type="button" class="btn-editar-produto">Editar</button>
                    <button type="button" class="btn-excluir-produto">Excluir</button>
                </td>
            `;
            tabelaProdutos.appendChild(row);

        });
        adicionarEventosProdutos(); //Adiciona os event listeners
    },
        (error) => { console.error("Erro ao carregar produtos:", error) });
}

function adicionarEventosProdutos(){
    //Editar
    const botoesEditar = tabelaProdutos.querySelectorAll('.btn-editar-produto');
    botoesEditar.forEach(btn => {
        btn.addEventListener('click', () => editarProdutoCadastrado(btn));
    });

    //Excluir
     const botoesExcluir = tabelaProdutos.querySelectorAll('.btn-excluir-produto');
    botoesExcluir.forEach(btn => {
        btn.addEventListener('click', () => excluirProdutoCadastrado(btn));
    });

}

//Adicionar
cadastrarProdutoBtn.addEventListener('click', () => {
    const nomeProduto = document.getElementById('nome-produto').value;

    if (!nomeProduto) {
        alert('Por favor, insira um nome para o produto.');
        return;
    }

    // Coleta os materiais da tabela
    const materiaisDoProduto = [];
    const rows = tabelaMateriaisProduto.querySelectorAll('tr');
    rows.forEach(row => {
        const materialId = row.dataset.materialId;
        const nome = row.querySelector('.nome-material-produto').textContent;
        const tipo = row.querySelector('.tipo-material-produto').textContent;
        const custoUnitario = parseFloat(row.querySelector('.custo-unitario-material-produto').textContent.replace('R$ ', '').replace(',', '.'));

        let quantidade = 0;
        let largura = null;
        let altura = null;
        let comprimento = null;

          switch (tipo) {
            case "area":
                largura = parseFloat(row.querySelector('.dimensoes-input[data-tipo="largura"]').value);
                altura = parseFloat(row.querySelector('.dimensoes-input[data-tipo="altura"]').value);
                quantidade = (largura * altura) / 10000; //Em m²
                break;

            case "comprimento":
                comprimento = parseFloat(row.querySelector('.dimensoes-input[data-tipo="comprimento"]').value);
                quantidade = comprimento / 100 // Em metros;
                break;

            case "litro":
            case "quilo":
            case "unidade":
                quantidade = parseFloat(row.querySelector('.quantidade-input').value); //Direto a quantidade
                 break;
        }

        const custoTotal = parseFloat(row.querySelector('.custo-total-material-produto').textContent.replace('R$ ', '').replace(',', '.'));

        materiaisDoProduto.push({
            materialId,
            nome,
            tipo,
            custoUnitario,
            quantidade,
            largura,
            altura,
            comprimento,
            custoTotal
        });
    });

     // Calcula o custo total dos materiais
    const custoTotalMateriais = materiaisDoProduto.reduce((total, m) => total + m.custoTotal, 0);


    const produto = {
        nome: nomeProduto,
        materiais: materiaisDoProduto,
        custoTotalMateriais
    };

    addDoc(collection(firestore, 'produtos'), produto)
        .then(() => {
            console.log("Produto cadastrado com sucesso!");
            clearForm(formProdutosCadastrados);
            tabelaMateriaisProduto.innerHTML = ''; // Limpa a tabela de materiais do produto
            pesquisaMaterialInput.value = ''; //Limpa o campo
        })
        .catch(error => console.error("Erro ao cadastrar produto:", error));
});

function adicionarMaterialAoProduto(material, materialId) {
     // Verifica se o material já foi adicionado
    const linhasExistente = tabelaMateriaisProduto.querySelectorAll(`tr[data-material-id="${materialId}"]`);
    if (linhasExistente.length > 0) {
        alert('Este material já foi adicionado ao produto.');
        return;
    }

    const row = document.createElement('tr');
    row.dataset.materialId = materialId;

    //Células com informações
    const nomeCell = document.createElement('td');
    nomeCell.textContent = material.nome;
    nomeCell.classList.add('nome-material-produto');
    row.appendChild(nomeCell);

    const tipoCell = document.createElement('td');
    tipoCell.textContent = material.tipo;
    tipoCell.classList.add('tipo-material-produto')
    row.appendChild(tipoCell);

    const custoUnitarioCell = document.createElement('td');
    custoUnitarioCell.textContent = `R$ ${formatarMoeda(material.custoUnitario)}`;
    custoUnitarioCell.classList.add('custo-unitario-material-produto');
    row.appendChild(custoUnitarioCell);

     // --- CÉLULA DE DIMENSÕES/QUANTIDADE (inputs e lógica) ---

    const dimensoesCell = document.createElement('td');
    let dimensoesInput, quantidadeInput;

     if (material.tipo === 'area') {
        dimensoesInput = document.createElement('input');
        dimensoesInput.type = 'number';
        dimensoesInput.classList.add('dimensoes-input');
        dimensoesInput.dataset.tipo = 'largura';
        dimensoesInput.placeholder = 'Largura (cm)';
        dimensoesInput.value = 100; //Valor Padrão
        dimensoesCell.appendChild(dimensoesInput);

        const xSpan = document.createElement('span');
        xSpan.textContent = ' x ';
        xSpan.classList.add('dimensoes-span');
        dimensoesCell.appendChild(xSpan);

        const alturaInput = document.createElement('input');
        alturaInput.type = 'number';
        alturaInput.classList.add('dimensoes-input');
        alturaInput.dataset.tipo = 'altura';
        alturaInput.placeholder = 'Altura (cm)';
        alturaInput.value = 100;
        dimensoesCell.appendChild(alturaInput);

          dimensoesInput.addEventListener('input', calcularCustoTotalMaterial);
          alturaInput.addEventListener('input', calcularCustoTotalMaterial);


    } else if(material.tipo === 'comprimento') {
        dimensoesInput = document.createElement('input');
        dimensoesInput.type = 'number';
        dimensoesInput.classList.add('dimensoes-input');
        dimensoesInput.dataset.tipo = 'comprimento';
        dimensoesInput.placeholder = 'Comprimento (cm)';
        dimensoesInput.value = 100;
        dimensoesCell.appendChild(dimensoesInput);

        dimensoesInput.addEventListener('input', calcularCustoTotalMaterial);

    } else{ // litro, quilo, unidade
        quantidadeInput = document.createElement('input');
        quantidadeInput.type = 'number';
        quantidadeInput.classList.add('quantidade-input');
        quantidadeInput.value = 1;
        dimensoesCell.appendChild(quantidadeInput);

        const unidadeSpan = document.createElement('span');
        unidadeSpan.classList.add('unidade-medida');

          if(material.tipo === 'litro'){
            unidadeSpan.textContent = 'L';
          } else if (material.tipo === 'quilo'){
            unidadeSpan.textContent = 'kg';
          } else {
            unidadeSpan.textContent = 'un';
          }
        dimensoesCell.appendChild(unidadeSpan);

          quantidadeInput.addEventListener('input', calcularCustoTotalMaterial);

    }

    row.appendChild(dimensoesCell);

    // --- CÉLULA DE QUANTIDADE (exibição, mesmo para área/comp) ---
     const quantidadeCell = document.createElement('td');
      quantidadeCell.classList.add('quantidade-final');  //Para exibir
    row.appendChild(quantidadeCell);



     // --- CÉLULA DE CUSTO TOTAL ---
    const custoTotalCell = document.createElement('td');
    custoTotalCell.classList.add('custo-total-material-produto');
    row.appendChild(custoTotalCell);

    // --- CÉLULA DE AÇÕES (botão remover) ---
    const acoesCell = document.createElement('td');
    const removerBtn = document.createElement('button');
    removerBtn.textContent = 'Remover';
    removerBtn.type = 'button';
    removerBtn.addEventListener('click', () => {
        row.remove();
        calcularCustoTotalProduto(); //Recalcula quando remove
    });
    acoesCell.appendChild(removerBtn);
    row.appendChild(acoesCell);

    tabelaMateriaisProduto.appendChild(row);
    calcularCustoTotalMaterial(); //Calcula ao adicionar

    // --- FUNÇÃO calcularCustoTotalMaterial (dentro do escopo) ---
        function calcularCustoTotalMaterial() {
            let quantidade = 0;
            let custoTotal = 0;

            if (material.tipo === 'area') {
                const largura = parseFloat(dimensoesInput.value) || 0;
                const altura = parseFloat(alturaInput.value) || 0;
                quantidade = (largura * altura) / 10000; // Em m²

            } else if (material.tipo === 'comprimento'){
                const comprimento = parseFloat(dimensoesInput.value) || 0;
                quantidade = comprimento / 100; // Em metros

            }else {
                quantidade = parseFloat(quantidadeInput.value) || 0;
            }

            custoTotal = material.custoUnitario * quantidade;
            quantidadeCell.textContent = quantidade.toFixed(2);
            custoTotalCell.textContent = `R$ ${formatarMoeda(custoTotal)}`;
        }

}

//Pesquisar material
pesquisaMaterialInput.addEventListener('input', () => {
     const termo = pesquisaMaterialInput.value.trim();

      if (termo.length < 2) { // Evita buscas com termos muito curtos
        resultadosPesquisaDiv.innerHTML = '';
        resultadosPesquisaDiv.style.display = 'none';
        return;
      }

      const materiaisRef = collection(firestore, 'materiais');
      getDocs(materiaisRef).then(snapshot => { //Usa getDocs, pois não estamos usando onSnapshot
          resultadosPesquisaDiv.innerHTML = ''; // Limpa resultados anteriores
          resultadosPesquisaDiv.style.display = 'block';

          let resultadosEncontrados = false; //Flag

           snapshot.forEach(doc => {
              const material = doc.data();
              const materialId = doc.id;

               if (material.nome.toLowerCase().includes(termo.toLowerCase())) {
                   resultadosEncontrados = true; //Marca que encontrou
                    const div = document.createElement('div');
                    div.textContent = `${material.nome} (${material.tipo})`;
                    div.addEventListener('click', () => {
                        adicionarMaterialAoProduto(material, materialId);
                        resultadosPesquisaDiv.innerHTML = ''; // Limpa após selecionar
                        resultadosPesquisaDiv.style.display = 'none';
                        pesquisaMaterialInput.value = '';
                    });
                    resultadosPesquisaDiv.appendChild(div);
               }
           });

           if(!resultadosEncontrados){
            resultadosPesquisaDiv.style.display = 'none'; //Esconde se não tiver resultados
           }
      });
});

function calcularCustoTotalProduto() {
    let custoTotal = 0;
    const rows = tabelaMateriaisProduto.querySelectorAll('tr');
    rows.forEach(row => {
        const custoTotalMaterial = parseFloat(row.querySelector('.custo-total-material-produto').textContent.replace('R$ ', '').replace(',', '.'));
        custoTotal += custoTotalMaterial;
    });

    // custoTotalProdutoSpan (Se você tiver um elemento para exibir o total)
    // custoTotalProdutoSpan.textContent = `R$ ${formatarMoeda(custoTotal)}`;
    //  Se não tiver, pode simplesmente retornar o valor:  return custoTotal;
}

// --- EDIÇÃO E EXCLUSÃO DE PRODUTOS ---

function editarProdutoCadastrado(btn){
     const row = btn.closest('tr');
    const produtoId = row.dataset.id;

     getDoc(doc(firestore, 'produtos', produtoId))
        .then(docSnap => {
            if (docSnap.exists()) {
                const produto = docSnap.data();

                // Preenche o formulário e a tabela de materiais
                document.getElementById('nome-produto').value = produto.nome;

                 tabelaMateriaisProduto.innerHTML = ''; // Limpa a tabela de materiais do produto

                //Reconstroi
                if(produto.materiais && produto.materiais.length > 0) {
                    produto.materiais.forEach(m => {
                        //Simula o objeto material como ele estaria após ser lido do Firestore no cadastro
                        const materialParaAdicionar = {
                            nome: m.nome,
                            tipo: m.tipo,
                            custoUnitario: m.custoUnitario,
                            dimensoes: {} //Preenchido abaixo
                        };
                        //Preenche as dimensoes baseado no tipo
                        if(m.tipo === 'area'){
                            materialParaAdicionar.dimensoes.largura = m.largura;
                            materialParaAdicionar.dimensoes.altura = m.altura;
                        } else if (m.tipo === 'comprimento'){
                            materialParaAdicionar.dimensoes.comprimento = m.comprimento;
                        }
                         // Adiciona o material à tabela, usando a função existente
                        adicionarMaterialAoProduto(materialParaAdicionar, m.materialId);

                         // Agora, precisamos setar os valores dos inputs *após* a adição
                        const linhaMaterial = tabelaMateriaisProduto.querySelector(`tr[data-material-id="${m.materialId}"]`);
                        if(linhaMaterial){
                            if(m.tipo === 'area'){
                                linhaMaterial.querySelector('.dimensoes-input[data-tipo="largura"]').value = m.largura;
                                linhaMaterial.querySelector('.dimensoes-input[data-tipo="altura"]').value = m.altura;

                            } else if (m.tipo === 'comprimento'){
                                linhaMaterial.querySelector('.dimensoes-input[data-tipo="comprimento"]').value = m.comprimento;
                            } else {
                                //Litro, quilo ou unidade
                                linhaMaterial.querySelector('.quantidade-input').value = m.quantidade;
                            }
                              // Dispara o cálculo para a linha
                                const eventoInput = new Event('input', { bubbles: true });
                                if (m.tipo === 'area' || m.tipo === "comprimento") {
                                     linhaMaterial.querySelector('.dimensoes-input').dispatchEvent(eventoInput);
                                } else{
                                     linhaMaterial.querySelector('.quantidade-input').dispatchEvent(eventoInput);
                                }


                        }
                    });
                }

                // Troca o botão "Cadastrar" por "Salvar Alterações"
                cadastrarProdutoBtn.textContent = 'Salvar Alterações';
                const salvarAlteracoesHandler = () => {
                    // Coleta os dados atualizados do formulário e da tabela
                    const nomeProdutoAtualizado = document.getElementById('nome-produto').value;

                    const materiaisAtualizados = [];
                    const rows = tabelaMateriaisProduto.querySelectorAll('tr');
                    rows.forEach(row => {
                        const materialId = row.dataset.materialId;
                        const nome = row.querySelector('.nome-material-produto').textContent;
                        const tipo = row.querySelector('.tipo-material-produto').textContent;
                        const custoUnitario = parseFloat(row.querySelector('.custo-unitario-material-produto').textContent.replace('R$ ', '').replace(',', '.'));
                        let quantidade = 0;
                        let largura = null;
                        let altura = null;
                        let comprimento = null;

                        switch (tipo) {
                            case "area":
                                largura = parseFloat(row.querySelector('.dimensoes-input[data-tipo="largura"]').value);
                                altura = parseFloat(row.querySelector('.dimensoes-input[data-tipo="altura"]').value);
                                quantidade = (largura * altura) / 10000; //Em m²
                                break;

                            case "comprimento":
                                comprimento = parseFloat(row.querySelector('.dimensoes-input[data-tipo="comprimento"]').value);
                                quantidade = comprimento / 100; // Em metros
                                break;

                            case "litro":
                            case "quilo":
                            case "unidade":
                                quantidade = parseFloat(row.querySelector('.quantidade-input').value);
                                break;
                        }
                        const custoTotal = parseFloat(row.querySelector('.custo-total-material-produto').textContent.replace('R$ ', '').replace(',', '.'));

                        materiaisAtualizados.push({
                            materialId,
                            nome,
                            tipo,
                            custoUnitario,
                            quantidade,
                            largura,
                            altura,
                            comprimento,
                            custoTotal
                        });
                    });

                    const custoTotalMateriaisAtualizado = materiaisAtualizados.reduce((total, m) => total + m.custoTotal, 0);

                    const produtoAtualizado = {
                        nome: nomeProdutoAtualizado,
                        materiais: materiaisAtualizados,
                        custoTotalMateriais: custoTotalMateriaisAtualizado
                    };

                    // Atualiza o documento no Firestore
                    updateDoc(doc(firestore, 'produtos', produtoId), produtoAtualizado)
                        .then(() => {
                            console.log("Produto atualizado com sucesso!");
                            clearForm(formProdutosCadastrados);
                            tabelaMateriaisProduto.innerHTML = '';
                            cadastrarProdutoBtn.textContent = 'Cadastrar Produto';
                            cadastrarProdutoBtn.removeEventListener('click', salvarAlteracoesHandler);
                             pesquisaMaterialInput.value = '';

                        })
                        .catch(error => console.error("Erro ao atualizar produto:", error));
                };
                cadastrarProdutoBtn.addEventListener('click', salvarAlteracoesHandler);

            } else {
                console.log("Produto não encontrado!");
            }
        })
        .catch(error => console.error("Erro ao buscar produto:", error));
}

function excluirProdutoCadastrado(btn){
    const row = btn.closest('tr');
    const produtoId = row.dataset.id;

    deleteDoc(doc(firestore, 'produtos', produtoId))
        .then(() => {
            console.log("Produto excluído com sucesso!");
            row.remove(); // Remove a linha da tabela
        })
        .catch(error => console.error("Erro ao excluir produto:", error));
}

function buscarProdutosCadastrados() {
    const termo = buscaProdutoInput.value.toLowerCase();
    const rows = tabelaProdutos.querySelectorAll('tr');

    rows.forEach(row => {
        const nomeProduto = row.querySelector('td:first-child').textContent.toLowerCase(); // Primeira coluna
        if (nomeProduto.includes(termo)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// --- CÁLCULO DA PRECIFICAÇÃO ---

//Pesquisar Produto
produtoPesquisaInput.addEventListener('input', () => {
    const termo = produtoPesquisaInput.value.trim();

     if (termo.length < 2) {
        produtoResultadosDiv.innerHTML = '';
        produtoResultadosDiv.classList.add('hidden');
        return;
    }

      const produtosRef = collection(firestore, 'produtos');
      getDocs(produtosRef).then(snapshot => { //Usa getDocs, pois não estamos usando onSnapshot

          produtoResultadosDiv.innerHTML = '';
          produtoResultadosDiv.classList.remove('hidden');

          snapshot.forEach(doc => {
              const produto = doc.data();
              const produtoId = doc.id;

                if (produto.nome.toLowerCase().includes(termo.toLowerCase())) {
                    const div = document.createElement('div');
                    div.textContent = produto.nome;
                    div.addEventListener('click', () => {
                        selecionarProduto(produto, produtoId);
                        produtoResultadosDiv.innerHTML = '';
                        produtoResultadosDiv.classList.add('hidden');
                         produtoPesquisaInput.value = produto.nome;
                    });
                    produtoResultadosDiv.appendChild(div);

                }
          });
      });
});

function selecionarProduto(produto, produtoId) {
     custoProdutoSpan.textContent = `R$ ${formatarMoeda(produto.custoTotalMateriais)}`;

     // Limpa a lista anterior
    listaMateriaisProdutoPrecificacao.innerHTML = '';

     // Preenche a lista de materiais
    if (produto.materiais && produto.materiais.length > 0) {
        produto.materiais.forEach(m => {
            const li = document.createElement('li');
            let detalhes = '';
             if (m.tipo === 'area') {
                  detalhes = `${m.largura}cm x ${m.altura}cm = ${ (m.largura * m.altura / 10000).toFixed(2)}m²`;
             } else if (m.tipo === "comprimento"){
                  detalhes = `${m.comprimento}cm = ${ (m.comprimento /100).toFixed(2) }m`;
             } else if (m.tipo === 'litro') {
                    detalhes = `${m.quantidade}L`;
                } else if (m.tipo === 'quilo') {
                    detalhes = `${m.quantidade}kg`;
                } else {
                    detalhes = `${m.quantidade}un`;
                }
            li.textContent = `${m.nome} (${detalhes}) - R$ ${formatarMoeda(m.custoTotal)}`;
            listaMateriaisProdutoPrecificacao.appendChild(li);
        });
    }

    detalhesProdutoDiv.style.display = 'block';
     calcularCustos(); // Importante!
}

function calcularCustos() {
    // Custo do Produto
    const custoProduto = parseFloat(custoProdutoSpan.textContent.replace('R$ ', '').replace(',', '.'));

     // Custo da Mão de Obra
    const horasProduto = parseFloat(horasProdutoInput.value) || 0; //usa 0 como padrão

    let valorHoraTrabalhada = 0;
    let custoFerias13oHora = 0;

    getDocs(collection(firestore, "maoDeObra")).then(querySnapshot => { //usa getDocs, pois não estamos usando onSnapshot
        if(!querySnapshot.empty){
            const dadosMaoDeObra = querySnapshot.docs[0].data();
            valorHoraTrabalhada = dadosMaoDeObra.salario / dadosMaoDeObra.horasTrabalhadas;

             if (dadosMaoDeObra.incluirFerias13o === 'sim') {
                custoFerias13oHora = valorHoraTrabalhada * 0.2; // Exemplo: 20%
            }
        }

        const custoMaoDeObra = valorHoraTrabalhada * horasProduto;
        const custoFerias13o = custoFerias13oHora * horasProduto;
        const totalMaoDeObra = custoMaoDeObra + custoFerias13o;

         custoMaoDeObraDetalheSpan.textContent = `R$ ${formatarMoeda(custoMaoDeObra)}`;
         custoFerias13oDetalheSpan.textContent = `R$ ${formatarMoeda(custoFerias13o)}`;
         totalMaoDeObraSpan.textContent = `R$ ${formatarMoeda(totalMaoDeObra)}`;

          // --- CUSTOS INDIRETOS ---
        let totalCustosIndiretos = 0;
         listaCustosIndiretosDetalhes.innerHTML = ''; // Limpa a lista

         getDocs(collection(firestore, 'custosIndiretos')).then(querySnapshot => { //Usa getDocs, pois não estamos usando onSnapshot
            querySnapshot.forEach(doc => {
                const custo = doc.data();
                 const custoIndiretoPorHora = custo.valorHora * horasProduto;
                totalCustosIndiretos += custoIndiretoPorHora;

                 const li = document.createElement('li');
                li.textContent = `${custo.descricao} - R$ ${formatarMoeda(custoIndiretoPorHora)}`;
                listaCustosIndiretosDetalhes.appendChild(li);
            });
            custoIndiretoSpan.textContent = `R$ ${formatarMoeda(totalCustosIndiretos)}`;
            detalhesCustosIndiretosDiv.style.display = 'block'; //Mostra

            // --- SUBTOTAL, MARGEM DE LUCRO, TOTAL ---
            const subtotal = custoProduto + totalMaoDeObra + totalCustosIndiretos;
            subtotalSpan.textContent = `R$ ${formatarMoeda(subtotal)}`;

            calcularPrecoVendaFinal(); //Chama para já calcular com a margem

         });
    });
}

function calcularPrecoVendaFinal(){
     // --- SUBTOTAL (já calculado em calcularCustos) ---
    const subtotal = parseFloat(subtotalSpan.textContent.replace('R$ ', '').replace(',', '.'));

    // --- MARGEM DE LUCRO ---
    const margemLucroFinal = parseFloat(margemLucroFinalInput.value) || 0;
    const margemLucroValor = subtotal * (margemLucroFinal / 100);
    margemLucroValorSpan.textContent = `R$ ${formatarMoeda(margemLucroValor)}`;

    // --- TOTAL (COM MARGEM DE LUCRO) ---
    const totalFinal = subtotal + margemLucroValor;
    totalFinalSpan.textContent = `R$ ${formatarMoeda(totalFinal)}`;

        // --- TAXA DE CRÉDITO ---
    calcularTaxaCredito(); // Chama para calcular ao atualizar a margem
}

function calcularTaxaCredito() {
    const totalFinal = parseFloat(totalFinalSpan.textContent.replace('R$ ', '').replace(',', '.'));
    const incluirTaxa = document.querySelector('input[name="incluir-taxa-credito"]:checked').value === 'sim';
    const taxaCreditoPercentual = parseFloat(taxaCreditoPercentualInput.value) || 0;

    let taxaCreditoValor = 0;
    if (incluirTaxa) {
        taxaCreditoValor = totalFinal * (taxaCreditoPercentual / 100);
    }
    taxaCreditoValorSpan.textContent = `R$ ${formatarMoeda(taxaCreditoValor)}`;

    // --- TOTAL FINAL (COM TAXAS) ---
    const totalFinalComTaxas = totalFinal + taxaCreditoValor;
    totalFinalComTaxasSpan.textContent = `R$ ${formatarMoeda(totalFinalComTaxas)}`;
}

// Event listeners para recálculo
horasProdutoInput.addEventListener('input', calcularCustos);
margemLucroFinalInput.addEventListener('input', calcularPrecoVendaFinal);
incluirTaxaCreditoSimRadio.addEventListener('change', calcularTaxaCredito);
incluirTaxaCreditoNaoRadio.addEventListener('change', calcularTaxaCredito);
taxaCreditoPercentualInput.addEventListener('input', calcularTaxaCredito);

// --- GERAR NOTA DE PRECIFICAÇÃO ---

function gerarNotaPrecificacao() {
    const nomeCliente = nomeClienteInput.value;
    const produtoSelecionado = produtoPesquisaInput.value;
    const horasProduto = parseFloat(horasProdutoInput.value) || 0;

    // Coleta os dados formatados dos elementos HTML
    const custoProduto = custoProdutoSpan.textContent;
    const listaMateriais = Array.from(listaMateriaisProdutoPrecificacao.querySelectorAll('li')).map(li => li.textContent).join('\n');
    const custoMaoDeObra = custoMaoDeObraDetalheSpan.textContent;
    const custoFerias13o = custoFerias13oDetalheSpan.textContent;
    const totalMaoDeObra = totalMaoDeObraSpan.textContent;
    const listaCustosIndiretos = Array.from(listaCustosIndiretosDetalhes.querySelectorAll('li')).map(li => li.textContent).join('\n');
    const custoIndireto = custoIndiretoSpan.textContent;
    const subtotal = subtotalSpan.textContent;
    const margemLucroValor = margemLucroValorSpan.textContent;
    const margemLucroPercentual = margemLucroFinalInput.value + '%';
    const total = totalFinalSpan.textContent;
    const taxaCreditoValor = taxaCreditoValorSpan.textContent;
    const totalComTaxas = totalFinalComTaxasSpan.textContent;

     // Busca o número da última precificação para o ano atual
     const anoAtual = new Date().getFullYear();
     const precificacoesRef = collection(firestore, 'precificacoes');
      const q = query(precificacoesRef, where("ano", "==", anoAtual));

    getDocs(q).then(querySnapshot => {

        const numeroPrecificacao = querySnapshot.size + 1;
        const numeroFormatado = `${numeroPrecificacao.toString().padStart(3, '0')}/${anoAtual}`;

        //Cria a tabela
        const tabela = document.createElement('table');
        tabela.classList.add('tabela-precificacao-detalhada');
        tabela.innerHTML = `
        <thead>
            <tr><th colspan="2">Nota de Precificação - ${numeroFormatado}</th></tr>
        </thead>
        <tbody>
            ${nomeCliente ? `<tr><td>Cliente:</td><td>${nomeCliente}</td></tr>` : ''}
            <tr><td>Produto:</td><td>${produtoSelecionado}</td></tr>
            <tr><td>Horas para Concluir:</td><td>${horasProduto}</td></tr>
            <tr><td>Custo do Produto:</td><td>${custoProduto}</td></tr>
            <tr><td colspan="2"><b>Materiais do Produto:</b></td></tr>
            <tr><td colspan="2"><pre>${listaMateriais}</pre></td></tr>
            <tr><td colspan="2"><b>Mão de Obra:</b></td></tr>
            <tr><td>Custo Mão de Obra:</td><td>${custoMaoDeObra}</td></tr>
            <tr><td>Custo 13º e Férias:</td><td>${custoFerias13o}</td></tr>
            <tr><td>Total Mão de Obra:</td><td>${totalMaoDeObra}</td></tr>
            <tr><td colspan="2"><b>Custos Indiretos (por hora):</b></td></tr>
            <tr><td colspan="2"><pre>${listaCustosIndiretos}</pre></td></tr>
            <tr><td>Custo Indireto Total:</td><td>${custoIndireto}</td></tr>
             <tr><td>Subtotal:</td><td>${subtotal}</td></tr>
            <tr><td>Margem de Lucro (${margemLucroPercentual}):</td><td>${margemLucroValor}</td></tr>
            <tr><td>Total (com Margem de Lucro):</td><td>${total}</td></tr>
            <tr><td>Taxa de Compra a Crédito:</td><td>${taxaCreditoValor}</td></tr>
            <tr><td>Total Final (com Taxas):</td><td>${totalComTaxas}</td></tr>

        </tbody>
    `;
        // Salva no firestore
        const precificacao = {
            numero: numeroPrecificacao,
            ano: anoAtual,
            nomeCliente: nomeCliente,
            produto: produtoSelecionado,
            horasProduto: horasProduto,
            custoProduto: custoProduto,
            materiais: listaMateriais,  // Salva como string mesmo
            custoMaoDeObra: custoMaoDeObra,
            custoFerias13o: custoFerias13o,
            totalMaoDeObra: totalMaoDeObra,
            custosIndiretos: listaCustosIndiretos, // Salva como string
            custoIndiretoTotal: custoIndireto,
            subtotal: subtotal,
            margemLucroValor: margemLucroValor,
            margemLucroPercentual: margemLucroPercentual,
            total: total,
            taxaCreditoValor: taxaCreditoValor,
            totalComTaxas: totalComTaxas
        };

        addDoc(collection(firestore, "precificacoes"), precificacao)
            .then(() => {
                console.log("Precificação salva com sucesso!");
                 detalhePrecificacaoContainer.innerHTML = ''; // Limpa
                detalhePrecificacaoContainer.appendChild(tabela); // Adiciona a tabela
                detalhePrecificacaoContainer.style.display = 'block';

            })
            .catch(error => { console.error("Erro ao salvar precificação", error); });
    });
}

function salvarTaxaCredito() {
    calcularTaxaCredito(); // Simplesmente recalcula
}

function carregarPrecificacoesGeradas(){
     if (!usuarioLogado) return; // Só carrega se estiver logado

     const precificacoesRef = collection(firestore, 'precificacoes');
    unsubscribePrecificacoes = onSnapshot(precificacoesRef, (snapshot) => {

        tabelaPrecificacoesGeradas.innerHTML = ''; // Limpa a tabela
        snapshot.forEach(doc => {
             const precificacao = doc.data();
            const precificacaoId = doc.id;
             const numeroFormatado = `${precificacao.numero.toString().padStart(3, '0')}/${precificacao.ano}`;

             const row = document.createElement('tr');
            row.dataset.id = precificacaoId;
            row.innerHTML = `
                <td>${numeroFormatado}</td>
                <td>${precificacao.nomeCliente || '-'}</td>
                <td>
                    <button type="button" class="btn-visualizar-precificacao">Visualizar</button>
                    <button type="button" class="btn-excluir-precificacao">Excluir</button>
                </td>
            `;
             tabelaPrecificacoesGeradas.appendChild(row);
        });
         adicionarEventosPrecificacoes(); //Adiciona os listeners aos botões

    }, (error) => { console.error("Erro ao carregar precificações", error) });

}

function adicionarEventosPrecificacoes(){

    //Visualizar
    const botoesVisualizar = tabelaPrecificacoesGeradas.querySelectorAll('.btn-visualizar-precificacao');
     botoesVisualizar.forEach(btn => {
        btn.addEventListener('click', () => visualizarPrecificacao(btn));
    });

    //Excluir
    const botoesExcluir = tabelaPrecificacoesGeradas.querySelectorAll('.btn-excluir-precificacao');
    botoesExcluir.forEach(btn => {
        btn.addEventListener('click', () => excluirPrecificacao(btn));
    });
}

function visualizarPrecificacao(btn){
     const row = btn.closest('tr');
    const precificacaoId = row.dataset.id;

     getDoc(doc(firestore, 'precificacoes', precificacaoId))
        .then(docSnap => {
            if (docSnap.exists()) {
                const precificacao = docSnap.data();
                const numeroFormatado = `${precificacao.numero.toString().padStart(3, '0')}/${precificacao.ano}`;

                // Cria a tabela (similar à de geração)
                const tabela = document.createElement('table');
                tabela.classList.add('tabela-precificacao-detalhada');
                tabela.innerHTML = `
                    <thead>
                        <tr><th colspan="2">Nota de Precificação - ${numeroFormatado}</th></tr>
                    </thead>
                    <tbody>
                        ${precificacao.nomeCliente ? `<tr><td>Cliente:</td><td>${precificacao.nomeCliente}</td></tr>` : ''}
                        <tr><td>Produto:</td><td>${precificacao.produto}</td></tr>
                        <tr><td>Horas para Concluir:</td><td>${precificacao.horasProduto}</td></tr>
                        <tr><td>Custo do Produto:</td><td>${precificacao.custoProduto}</td></tr>
                        <tr><td colspan="2"><b>Materiais do Produto:</b></td></tr>
                        <tr><td colspan="2"><pre>${precificacao.materiais}</pre></td></tr>
                        <tr><td colspan="2"><b>Mão de Obra:</b></td></tr>
                        <tr><td>Custo Mão de Obra:</td><td>${precificacao.custoMaoDeObra}</td></tr>
                        <tr><td>Custo 13º e Férias:</td><td>${precificacao.custoFerias13o}</td></tr>
                        <tr><td>Total Mão de Obra:</td><td>${precificacao.totalMaoDeObra}</td></tr>
                        <tr><td colspan="2"><b>Custos Indiretos (por hora):</b></td></tr>
                         <tr><td colspan="2"><pre>${precificacao.custosIndiretos}</pre></td></tr>
                        <tr><td>Custo Indireto Total:</td><td>${precificacao.custoIndiretoTotal}</td></tr>
                        <tr><td>Subtotal:</td><td>${precificacao.subtotal}</td></tr>
                        <tr><td>Margem de Lucro (${precificacao.margemLucroPercentual}):</td><td>${precificacao.margemLucroValor}</td></tr>
                        <tr><td>Total (com Margem de Lucro):</td><td>${precificacao.total}</td></tr>
                        <tr><td>Taxa de Compra a Crédito:</td><td>${precificacao.taxaCreditoValor}</td></tr>
                        <tr><td>Total Final (com Taxas):</td><td>${precificacao.totalComTaxas}</td></tr>
                    </tbody>
                `;

                 detalhePrecificacaoContainer.innerHTML = ''; // Limpa visualização anterior
                detalhePrecificacaoContainer.appendChild(tabela); // Adiciona a tabela
                detalhePrecificacaoContainer.style.display = 'block';

            } else {
                 console.log("Precificação não encontrada!");
            }

        }).catch(error => { console.error("Erro ao buscar precificacao", error) });

}

function excluirPrecificacao(btn){
     const row = btn.closest('tr');
    const precificacaoId = row.dataset.id;

    deleteDoc(doc(firestore, 'precificacoes', precificacaoId))
    .then(() => {
        console.log("Precificação excluída com sucesso!");
         row.remove(); // Remove a linha
         detalhePrecificacaoContainer.innerHTML = ''; //Limpa a visualização
         detalhePrecificacaoContainer.style.display = 'none'; //Esconde
    })
    .catch(error => console.error("Erro ao excluir precificação:", error));
}

function buscarPrecificacoesGeradas(){
     const termoBusca = buscaPrecificacaoInput.value.toLowerCase();
    const rows = tabelaPrecificacoesGeradas.querySelectorAll('tr');

     rows.forEach(row => {
        const numeroAno = row.querySelector('td:first-child').textContent.toLowerCase();
        const nomeCliente = row.querySelector('td:nth-child(2)').textContent.toLowerCase();

        if (numeroAno.includes(termoBusca) || nomeCliente.includes(termoBusca)) {
            row.style.display = ''; // Mostra
        } else {
            row.style.display = 'none'; // Esconde
        }
    });
}

function atualizarCustoProdutoAposAlteracaoMaterial() {
    const produtosRef = collection(firestore, 'produtos');

    getDocs(produtosRef).then(querySnapshot => {
        querySnapshot.forEach(produtoDoc => {
            const produto = produtoDoc.data();
            const produtoId = produtoDoc.id;

            if (produto.materiais && produto.materiais.length > 0) {
                //Cria uma Promise para cada material
                const promises = produto.materiais.map(materialProduto => {
                     return getDoc(doc(firestore, 'materiais', materialProduto.materialId))
                        .then(materialDocSnap => {
                            if (materialDocSnap.exists()) {
                                const materialAtualizado = materialDocSnap.data();

                                // Atualiza custo unitário e total no material do produto
                                materialProduto.custoUnitario = materialAtualizado.custoUnitario;

                                //Recalcula o custo total, baseado no tipo
                                if(materialProduto.tipo === 'area'){
                                    materialProduto.custoTotal = materialAtualizado.custoUnitario * ((materialProduto.largura * materialProduto.altura)/10000);

                                } else if (materialProduto.tipo === 'comprimento'){
                                    materialProduto.custoTotal = materialAtualizado.custoUnitario * (materialProduto.comprimento / 100);

                                } else{
                                    //Litro, quilo ou unidade
                                     materialProduto.custoTotal = materialAtualizado.custoUnitario * materialProduto.quantidade;
                                }

                            } else {
                                 // Se o material não existe mais, zera os custos (ou remove)
                                materialProduto.custoUnitario = 0;
                                materialProduto.custoTotal = 0;
                                console.warn(`Material com ID ${materialProduto.materialId} não encontrado. Custos zerados no produto ${produto.nome}.`);
                            }
                             //Retorna o material atualizado *DENTRO* do .then interno
                              return materialProduto;
                        });
                });

                //Espera TODAS as Promises dos materiais resolverem
                 Promise.all(promises).then(materiaisAtualizados => {
                     //Calcula o novo custo total do produto
                    const novoCustoTotal = materiaisAtualizados.reduce((total, m) => total + m.custoTotal, 0);

                    // Atualiza o documento do produto no Firestore
                    updateDoc(doc(firestore, 'produtos', produtoId), {
                        materiais: materiaisAtualizados,
                        custoTotalMateriais: novoCustoTotal
                    })
                    .then(() => console.log(`Produto ${produto.nome} atualizado com sucesso!`))
                    .catch(error => console.error("Erro ao atualizar produto:", error));
                });
            }
        });
    });
}

// --- CARREGAMENTO INICIAL ---

function carregarDados() {
    carregarMateriais();      // Materiais e Insumos
    carregarCustosIndiretos(); // Custos Indiretos
    carregarProdutosCadastrados();  //Produtos Cadastrados
    carregarPrecificacoesGeradas();
    carregarDadosMaoDeObra();
}

function carregarMateriais() {
    if (!usuarioLogado) return; // Garante que só carrega se estiver logado

    // Cancela qualquer listener anterior para evitar duplicatas
    if (unsubscribeMateriais) {
        unsubscribeMateriais();
    }

    const materiaisRef = collection(firestore, 'materiais');
    // Usa onSnapshot para ATUALIZAÇÕES EM TEMPO REAL
    unsubscribeMateriais = onSnapshot(materiaisRef, renderizarMateriais,
        (error) => {
            console.error("Erro ao carregar materiais:", error);
        }
    );
}
