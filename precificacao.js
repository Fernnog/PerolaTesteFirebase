import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Configuração do Firebase (substitua com suas credenciais)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID",
    measurementId: "SEU_MEASUREMENT_ID"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Autenticação ---
let currentUser = null; // Variável global para armazenar o usuário atual

// ... (Funções de autenticação: registrarUsuario, login, logout, redefinirSenha, checkAuthState - mantidas como no seu código original) ...
// Funções de autenticação (mantidas como no original, mas com currentUser atualizado)
function registrarUsuario() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            document.getElementById('auth-message').textContent = `Usuário registrado: ${currentUser.email}`;
            showApp();
        })
        .catch((error) => {
            console.error("Erro ao registrar usuário:", error);
            document.getElementById('auth-message').textContent = `Erro ao registrar: ${error.message}`;
        });
}

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            document.getElementById('auth-message').textContent = `Usuário logado: ${currentUser.email}`;
            showApp();
        })
        .catch((error) => {
            console.error("Erro ao fazer login:", error);
            document.getElementById('auth-message').textContent = `Erro no login: ${error.message}`;
        });
}

function logout() {
    signOut(auth)
        .then(() => {
            currentUser = null;
            document.getElementById('auth-message').textContent = 'Nenhum usuário autenticado';
            hideApp();
        })
        .catch((error) => {
            console.error("Erro ao fazer logout:", error);
            document.getElementById('auth-message').textContent = `Erro no logout: ${error.message}`;
        });
}

function redefinirSenha() {
    const email = document.getElementById('email').value;
    if (email) {
        sendPasswordResetEmail(auth, email)
            .then(() => {
                document.getElementById('auth-message').textContent = 'E-mail de redefinição de senha enviado. Verifique sua caixa de entrada.';
            })
            .catch((error) => {
                console.error("Erro ao enviar e-mail de redefinição:", error);
                document.getElementById('auth-message').textContent = `Erro: ${error.message}`;
            });
    } else {
        document.getElementById('auth-message').textContent = 'Por favor, insira seu e-mail.';
    }
}

function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user; // Atualiza currentUser
        if (user) {
            document.getElementById('auth-message').textContent = `Usuário autenticado: ${user.email}`;
            showApp();
            // Carrega dados após autenticação
            carregarMateriaisInsumos();
            carregarMaoDeObra();
            carregarCustosIndiretos();
            carregarProdutosCadastrados();
            carregarPrecificacoesGeradas();
        } else {
            document.getElementById('auth-message').textContent = 'Nenhum usuário autenticado';
            hideApp();
        }
    });
}


// Funções de exibição/ocultação da interface
function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('user-info').textContent = `Usuário: ${currentUser.email}`;
}

function hideApp() {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('user-info').textContent = '';
}


// --- Funções de navegação (mantidas como no original)---
function mostrarSubpagina(subpaginaId) {
    const subpaginas = document.querySelectorAll('.subpagina');
    subpaginas.forEach(subpagina => {
        subpagina.style.display = 'none';
    });

    const subpagina = document.getElementById(subpaginaId);
    if (subpagina) {
        subpagina.style.display = 'block';
    }
}



// --- FUNÇÕES RELACIONADAS A MATERIAIS E INSUMOS ---

// Função para verificar se um material já está em uso
async function materialEmUso(nomeMaterial) {
    const produtosRef = collection(db, "produtos");
    const q = query(produtosRef, where("materiais", "array-contains", { nome: nomeMaterial }));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Retorna true se algum produto usar o material
}

async function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value;
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
    const comprimento = parseFloat(document.getElementById('comprimento-cm').value || 0);
    const largura = parseFloat(document.getElementById('largura-cm').value || 0);
    const altura = parseFloat(document.getElementById('altura-cm').value || 0);
    const volume = parseFloat(document.getElementById('volume-ml').value || 0);
    const peso = parseFloat(document.getElementById('peso-g').value || 0);
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value);

    // Verifica se o nome já está em uso *antes* de prosseguir
    if (await materialEmUso(nome)) {
        alert("Este material já está sendo usado em um ou mais produtos.  Não é possível cadastrar com o mesmo nome.");
        return; // Impede o cadastro
    }


    let quantidade = 0;
    let dimensoes = '';

    switch (tipo) {
        case 'comprimento':
            quantidade = comprimento / 100; // Convertendo cm para metros
            dimensoes = `${comprimento} cm`;
            break;
        case 'area':
            quantidade = (largura / 100) * (altura / 100); // Convertendo cm para metros
            dimensoes = `${largura} cm x ${altura} cm`;
            break;
        case 'litro':
            quantidade = volume / 1000; // Convertendo ml para litros
            dimensoes = `${volume} ml`;
            break;
        case 'quilo':
            quantidade = peso / 1000; // Convertendo g para kg
             dimensoes = `${peso} g`;
            break;
        case 'unidade':
            quantidade = 1;
            dimensoes = "1 un";
            break;

    }

    const custoUnitario = valorTotal / quantidade;

    const materialData = {
        nome: nome,
        tipo: tipo,
        dimensoes: dimensoes, //Salvar como string no Firebase
        valorTotal: valorTotal,
        custoUnitario: custoUnitario,
        userId: currentUser.uid, // Associa o material ao usuário
        timestamp: serverTimestamp()
    };


    try {
        const docRef = await addDoc(collection(db, "materiaisInsumos"), materialData);
        console.log("Material cadastrado com ID: ", docRef.id);

        // Limpa os campos do formulário após o cadastro
        document.getElementById('nome-material').value = '';
        document.getElementById('valor-total-material').value = '';
        // ... (limpe outros campos conforme necessário) ...

        carregarMateriaisInsumos(); // Recarrega a tabela
    } catch (error) {
        console.error("Erro ao cadastrar material:", error);
        alert("Erro ao cadastrar o material. Tente novamente.");
    }
}

async function excluirMaterialInsumo(materialId, nomeMaterial) {
  if (await materialEmUso(nomeMaterial)) {
      alert("Este material está sendo usado em um ou mais produtos. Remova-o dos produtos antes de excluí-lo.");
      return; // Impede a exclusão
  }

  try {
      await deleteDoc(doc(db, "materiaisInsumos", materialId));
      carregarMateriaisInsumos(); // Atualiza a tabela
  } catch (error) {
      console.error("Erro ao excluir material:", error);
      alert("Erro ao excluir o material. Tente novamente.");
  }
}

async function editarMaterialInsumo(materialId) {
    const docRef = doc(db, "materiaisInsumos", materialId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        alert("Material não encontrado.");
        return;
    }

    const materialOriginal = docSnap.data();

    //Preencher o formulário com os dados atuais
    document.getElementById('nome-material').value = materialOriginal.nome;
    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
        radio.checked = radio.value === materialOriginal.tipo;
    });
    document.getElementById('valor-total-material').value = materialOriginal.valorTotal;

    //Preencher os campos de dimensão/volume/peso com base no tipo
    switch(materialOriginal.tipo) {
        case 'comprimento':
            document.getElementById('comprimento-cm').value = parseFloat(materialOriginal.dimensoes.replace(" cm", ""));
            break;
        case 'area':
            const [largura, altura] = materialOriginal.dimensoes.replace(" cm", "").split(" x ").map(parseFloat);
            document.getElementById('largura-cm').value = largura;
            document.getElementById('altura-cm').value = altura;
            break;
        case 'litro':
             document.getElementById('volume-ml').value = parseFloat(materialOriginal.dimensoes.replace(" ml", ""));
            break;
        case 'quilo':
            document.getElementById('peso-g').value = parseFloat(materialOriginal.dimensoes.replace(" g", ""));
            break;
    }

    //Mostrar/ocultar campos
    atualizarCamposFormulario();

    //Mudar texto do botão, e ação
    const botaoCadastrar = document.getElementById('cadastrar-material-insumo-btn');
    botaoCadastrar.textContent = "Salvar Alterações";

    //Armazena id do material sendo editado
    botaoCadastrar.dataset.materialId = materialId;


     //Nova função para o click
    botaoCadastrar.onclick = async () => {

        const novoNome = document.getElementById('nome-material').value;
        const novoTipo = document.querySelector('input[name="tipo-material"]:checked').value;
        const novoComprimento = parseFloat(document.getElementById('comprimento-cm').value || 0);
        const novaLargura = parseFloat(document.getElementById('largura-cm').value || 0);
        const novaAltura = parseFloat(document.getElementById('altura-cm').value || 0);
        const novoVolume = parseFloat(document.getElementById('volume-ml').value || 0);
        const novoPeso = parseFloat(document.getElementById('peso-g').value || 0);
        const novoValorTotal = parseFloat(document.getElementById('valor-total-material').value);

        // Checa se o *novo* nome já está em uso, *se* o nome foi alterado.
        if (materialOriginal.nome !== novoNome && await materialEmUso(novoNome)) {
            alert("Já existe um material com este nome, ou este novo nome já está em uso em produtos. Escolha outro nome.");
            return;
        }

        let novaQuantidade = 0;
        let novasDimensoes = '';

        switch (novoTipo) {
            case 'comprimento':
                novaQuantidade = novoComprimento / 100;
                novasDimensoes = `${novoComprimento} cm`;
                break;
            case 'area':
                novaQuantidade = (novaLargura / 100) * (novaAltura / 100);
                novasDimensoes = `${novaLargura} cm x ${novaAltura} cm`;
                break;
            case 'litro':
                novaQuantidade = novoVolume / 1000;
                novasDimensoes = `${novoVolume} ml`;
                break;
            case 'quilo':
                novaQuantidade = novoPeso / 1000;
                 novasDimensoes = `${novoPeso} g`;
                break;
            case 'unidade':
                novaQuantidade = 1;
                novasDimensoes = "1 un"
                break;
        }

        const novoCustoUnitario = novoValorTotal / novaQuantidade;

        const materialAtualizado = {
            nome: novoNome,
            tipo: novoTipo,
            dimensoes: novasDimensoes,
            valorTotal: novoValorTotal,
            custoUnitario: novoCustoUnitario,
            // userId e timestamp não precisam ser atualizados
        };

        try {
            await updateDoc(docRef, materialAtualizado);
            console.log("Material atualizado com sucesso");
            carregarMateriaisInsumos(); // Recarrega
            // Resetar o botão
            botaoCadastrar.textContent = "Cadastrar";
            botaoCadastrar.onclick = cadastrarMaterialInsumo;  //Função original
            botaoCadastrar.dataset.materialId = "";

            //Limpar campos (opcional, se desejar)
              document.getElementById('nome-material').value = '';
              document.getElementById('valor-total-material').value = '';

        } catch (error) {
            console.error("Erro ao atualizar material:", error);
            alert("Erro ao atualizar. Tente novamente.");
        }
    };
}

function carregarMateriaisInsumos() {
    const tabela = document.querySelector('#tabela-materiais-insumos tbody');
    tabela.innerHTML = ''; // Limpa a tabela

    const q = query(collection(db, "materiaisInsumos"), where("userId", "==", currentUser.uid), orderBy("timestamp", "asc"));

   onSnapshot(q, (querySnapshot) => { //Usando onSnapshot para tempo real
        tabela.innerHTML = ''; // Limpa antes de re-popular
        querySnapshot.forEach((doc) => {
            const material = doc.data();
            material.id = doc.id; // Importante para edição/exclusão

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${material.nome}</td>
                <td>${material.tipo}</td>
                <td>${material.dimensoes}</td>
                <td>R$ ${material.valorTotal.toFixed(2)}</td>
                <td>R$ ${material.custoUnitario.toFixed(2)}</td>
                <td>
                    <button class="editar-btn" data-id="${material.id}">Editar</button>
                    <button class="excluir-btn" data-id="${material.id}">Excluir</button>
                </td>
            `;
            tabela.appendChild(row);
        });

         // Event listeners para botões de editar e excluir (dentro do onSnapshot)
        const editarBotoes = document.querySelectorAll('.editar-btn');
        editarBotoes.forEach(botao => {
            botao.addEventListener('click', (event) => {
                const materialId = event.target.dataset.id;
                editarMaterialInsumo(materialId);
            });
        });

        const excluirBotoes = document.querySelectorAll('.excluir-btn');
        excluirBotoes.forEach(botao => {
            botao.addEventListener('click', (event) => {
                const materialId = event.target.dataset.id;
                //Obter o nome do material ANTES de excluir
                const materialNome = event.target.closest('tr').querySelector('td:first-child').textContent;
                excluirMaterialInsumo(materialId, materialNome); // Passa o nome
            });
        });

    });
}

function buscarMateriaisCadastrados() {
    const termoBusca = document.getElementById('busca-material').value.toLowerCase();
    const tabela = document.querySelector('#tabela-materiais-insumos tbody');
    const linhas = tabela.querySelectorAll('tr');

    linhas.forEach(linha => {
        const nomeMaterial = linha.querySelector('td:first-child').textContent.toLowerCase();
        if (nomeMaterial.includes(termoBusca)) {
            linha.style.display = ''; // Mostra a linha
        } else {
            linha.style.display = 'none'; // Oculta a linha
        }
    });
}

// --- Funções relacionadas à Mão de Obra (mantidas e revisadas)---

async function carregarMaoDeObra() {
    const maoDeObraRef = collection(db, "maoDeObra");
    const q = query(maoDeObraRef, where("userId", "==", currentUser.uid));


    onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Deve haver apenas um documento, então pegamos o primeiro.
        const dadosMaoDeObra = snapshot.docs[0].data();
        document.getElementById('salario-receber').value = dadosMaoDeObra.salario || '';
        document.getElementById('horas-trabalhadas').value = dadosMaoDeObra.horasTrabalhadas || 220;
        document.getElementById('valor-hora').value = dadosMaoDeObra.valorHora.toFixed(2) || '';
        document.getElementById('incluir-ferias-13o-sim').checked = dadosMaoDeObra.incluirFerias13o;
        document.getElementById('incluir-ferias-13o-nao').checked = !dadosMaoDeObra.incluirFerias13o;
        document.getElementById('custo-ferias-13o').value = dadosMaoDeObra.custoFerias13o.toFixed(2);

        //Mostrar botão editar, esconder salvar
        document.getElementById('btn-salvar-mao-de-obra').style.display = 'none';
        document.getElementById('btn-editar-mao-de-obra').style.display = 'inline-block';


      } else {
        //Se não houver dados, mostra o botão Salvar, esconde o Editar
        document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';
        document.getElementById('btn-editar-mao-de-obra').style.display = 'none';

        //Valores padrão
        document.getElementById('horas-trabalhadas').value = 220;
        document.getElementById('incluir-ferias-13o-nao').checked = true;
      }

      calcularValorHora(); //Calcula sempre que houver mudança
    });
}

function calcularValorHora() {
    const salario = parseFloat(document.getElementById('salario-receber').value) || 0;
    const horasTrabalhadas = parseFloat(document.getElementById('horas-trabalhadas').value) || 220;
    const incluirFerias13o = document.getElementById('incluir-ferias-13o-sim').checked;

    const valorHora = salario / horasTrabalhadas;
    document.getElementById('valor-hora').value = valorHora.toFixed(2);

    let custoFerias13o = 0;
    if (incluirFerias13o) {
        custoFerias13o = valorHora * 0.2; // 20% do valor da hora
    }
     document.getElementById('custo-ferias-13o').value = custoFerias13o.toFixed(2);
}

async function salvarMaoDeObra() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horasTrabalhadas = parseFloat(document.getElementById('horas-trabalhadas').value) || 220;
    const valorHora = parseFloat(document.getElementById('valor-hora').value);
    const incluirFerias13o = document.getElementById('incluir-ferias-13o-sim').checked;
    const custoFerias13o = parseFloat(document.getElementById('custo-ferias-13o').value);

    const maoDeObraData = {
        salario: salario,
        horasTrabalhadas: horasTrabalhadas,
        valorHora: valorHora,
        incluirFerias13o: incluirFerias13o,
        custoFerias13o: custoFerias13o,
        userId: currentUser.uid
    };

    try {
       //Adiciona ou atualiza
       const maoDeObraRef = collection(db, "maoDeObra");
       const q = query(maoDeObraRef, where("userId", "==", currentUser.uid));
       const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            await addDoc(maoDeObraRef, maoDeObraData);
             console.log("Dados de mão de obra salvos com sucesso.");
        } else {
            //Já existe, então atualiza
             const docId = querySnapshot.docs[0].id;
             await updateDoc(doc(db, "maoDeObra", docId), maoDeObraData);
             console.log("Dados de mão de obra atualizados com sucesso.");
        }

        //Mostrar o botão de editar
        document.getElementById('btn-salvar-mao-de-obra').style.display = 'none';
        document.getElementById('btn-editar-mao-de-obra').style.display = 'inline-block';

        carregarMaoDeObra(); //Recarregar dados
    } catch(error) {
         console.error("Erro ao salvar/atualizar dados de mão de obra:", error);
    }
}

function editarMaoDeObra() {
  //Mostrar/ocultar botões
  document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
  document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';
}


// --- Funções relacionadas a Custos Indiretos (mantidas e revisadas) ---

function adicionarCustoIndireto() {
    const lista = document.getElementById('lista-custos-indiretos');
    const li = document.createElement('li');
    li.innerHTML = `
        <span class="custo-item-nome">Novo Custo</span>
        <input type="number" class="custo-valor" placeholder="Valor (R$)" step="0.01">
        <button class="editar-custo-btn">Salvar</button>
        <button class="remover-custo-btn">Remover</button>
    `;

    //Event listener botão "Salvar" do item
    li.querySelector('.editar-custo-btn').addEventListener('click', () => {
        const nome = li.querySelector('.custo-item-nome').textContent;
        const valor = parseFloat(li.querySelector('.custo-valor').value);

        if (nome && !isNaN(valor)) {
           salvarCustoIndireto(nome, valor);
        } else {
           alert('Preencha o nome e o valor do custo indireto.');
        }
    });

    //Event listener botão "Remover" do item
    li.querySelector('.remover-custo-btn').addEventListener('click', () => {
       li.remove();  //Remove do DOM, não do banco.
    });

    lista.appendChild(li);
}

async function salvarCustoIndireto(nome, valor) {

     const horasTrabalhadas = parseFloat(document.getElementById('horas-trabalhadas').value) || 220;
     const valorPorHora = valor / horasTrabalhadas;

    const custoData = {
        nome: nome,
        valor: valor,
        valorPorHora: valorPorHora,
        userId: currentUser.uid, // Associa ao usuário
        timestamp: serverTimestamp() // Timestamp para ordenação
    };

    try {
        const docRef = await addDoc(collection(db, "custosIndiretos"), custoData);
        console.log("Custo indireto salvo com ID:", docRef.id);
        carregarCustosIndiretos(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao salvar custo indireto:", error);
        alert("Erro ao salvar o custo indireto. Tente novamente.");
    }
}

//Função para excluir custo indireto.
async function excluirCustoIndireto(custoId) {
    try {
        await deleteDoc(doc(db, "custosIndiretos", custoId));
        carregarCustosIndiretos();  //Recarregar
    } catch(error) {
        console.error("Erro ao excluir custo indireto:", error);
        alert("Erro ao excluir. Tente novamente.");
    }
}

async function editarCustoIndireto(custoId) {
    const docRef = doc(db, "custosIndiretos", custoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        alert("Custo indireto não encontrado.");
        return;
    }

    const custo = docSnap.data();

    //Criar elementos do formulário
    const novoNomeInput = document.createElement('input');
    novoNomeInput.type = 'text';
    novoNomeInput.value = custo.nome;
    novoNomeInput.placeholder = "Novo Nome";

    const novoValorInput = document.createElement('input');
    novoValorInput.type = 'number';
    novoValorInput.value = custo.valor;
    novoValorInput.placeholder = "Novo Valor (R$)";
    novoValorInput.step = "0.01";

    const salvarBtn = document.createElement('button');
    salvarBtn.textContent = 'Salvar';

    //Substitui a linha da tabela
    const linhaAntiga = document.querySelector(`#tabela-custos-indiretos tr[data-id="${custoId}"]`);
    const novaLinha = document.createElement('tr');
    novaLinha.dataset.id = custoId;

    const tdNome = document.createElement('td');
    tdNome.appendChild(novoNomeInput);

    const tdValor = document.createElement('td');
    tdValor.appendChild(novoValorInput);

    const tdValorHora = document.createElement('td');  //Célula vazia (vai ser recalculado)

    const tdAcoes = document.createElement('td');
    tdAcoes.appendChild(salvarBtn);

    novaLinha.appendChild(tdNome);
    novaLinha.appendChild(tdValor);
    novaLinha.appendChild(tdValorHora);
    novaLinha.appendChild(tdAcoes);

    linhaAntiga.parentNode.replaceChild(novaLinha, linhaAntiga);

    //Event listener para salvar
    salvarBtn.addEventListener('click', async() => {
        const novoNome = novoNomeInput.value;
        const novoValor = parseFloat(novoValorInput.value);

        if (novoNome && !isNaN(novoValor)) {
            const horasTrabalhadas = parseFloat(document.getElementById('horas-trabalhadas').value) || 220;
            const novoValorPorHora = novoValor / horasTrabalhadas;

            const custoAtualizado = {
               nome: novoNome,
               valor: novoValor,
               valorPorHora: novoValorPorHora
               //userId e timestamp não mudam
            };

            try {
               await updateDoc(docRef, custoAtualizado);
               console.log("Custo indireto atualizado com sucesso.");
               carregarCustosIndiretos(); // Recarrega
            } catch(error) {
               console.error("Erro ao atualizar custo:", error);
               alert("Erro ao atualizar. Tente novamente");
            }
        } else {
           alert("Preencha o novo nome e valor.");
        }
    });
}

function carregarCustosIndiretos() {
    const tabela = document.querySelector('#tabela-custos-indiretos tbody');
    tabela.innerHTML = ''; // Limpa a tabela

    const q = query(collection(db, "custosIndiretos"), where("userId", "==", currentUser.uid), orderBy("timestamp", "asc"));

     onSnapshot(q, (querySnapshot) => {
        tabela.innerHTML = '';  //Limpa antes de re-popular
        querySnapshot.forEach((doc) => {
            const custo = doc.data();
            custo.id = doc.id; // Importante para edição/exclusão

            const row = document.createElement('tr');
            row.dataset.id = custo.id; //Armazena ID na linha
            row.innerHTML = `
                <td>${custo.nome}</td>
                <td>R$ ${custo.valor.toFixed(2)}</td>
                <td>R$ ${custo.valorPorHora.toFixed(2)}</td>
                <td>
                    <button class="editar-custo-tabela-btn">Editar</button>
                    <button class="excluir-custo-tabela-btn">Excluir</button>
                </td>
            `;
            tabela.appendChild(row);
        });

        //Event listeners para os botões (dentro do onSnapshot)
        const editarBotoes = document.querySelectorAll('.editar-custo-tabela-btn');
        editarBotoes.forEach(botao => {
            botao.addEventListener('click', (event) => {
                const custoId = event.target.closest('tr').dataset.id;
                editarCustoIndireto(custoId);
            });
        });

        const excluirBotoes = document.querySelectorAll('.excluir-custo-tabela-btn');
        excluirBotoes.forEach(botao => {
           botao.addEventListener('click', (event) => {
                const custoId = event.target.closest('tr').dataset.id;
                excluirCustoIndireto(custoId);
           });
        });
    });
}

function buscarCustosIndiretosCadastrados() {
    const termoBusca = document.getElementById('busca-custo-indireto').value.toLowerCase();
    const tabela = document.querySelector('#tabela-custos-indiretos tbody');
    const linhas = tabela.querySelectorAll('tr');

    linhas.forEach(linha => {
        const nomeCusto = linha.querySelector('td:first-child').textContent.toLowerCase(); // Primeira célula = nome
        if (nomeCusto.includes(termoBusca)) {
            linha.style.display = ''; // Mostra
        } else {
            linha.style.display = 'none'; // Oculta
        }
    });
}


// --- Funções relacionadas a Produtos Cadastrados ---
let materiaisAdicionados = []; // Array para armazenar materiais temporariamente

function adicionarMaterialAoProduto(material) {
    if (materiaisAdicionados.find(m => m.id === material.id)) {
        alert("Este material já foi adicionado ao produto.");
        return;
    }

    materiaisAdicionados.push(material);

    //Limpar campo de pesquisa
    document.getElementById('pesquisa-material').value = '';
    document.getElementById('resultados-pesquisa').innerHTML = '';

    atualizarTabelaMateriaisProduto();
}

function removerMaterialDoProduto(materialId) {
    materiaisAdicionados = materiaisAdicionados.filter(material => material.id !== materialId);
    atualizarTabelaMateriaisProduto();
}

function atualizarTabelaMateriaisProduto() {
    const tabela = document.querySelector('#tabela-materiais-produto tbody');
    tabela.innerHTML = ''; // Limpa a tabela

    materiaisAdicionados.forEach(material => {
        const row = document.createElement('tr');

        //Célula de dimensões/quantidade (input)
        const tdDimensoes = document.createElement('td');
        const inputDimensoes = document.createElement('input');
        inputDimensoes.type = 'number';
        inputDimensoes.classList.add('dimensoes-input');
        inputDimensoes.step = '0.01';


        //Célula de quantidade (input)
        const tdQuantidade = document.createElement('td');
        const inputQuantidade = document.createElement('input');
        inputQuantidade.type = 'number';
        inputQuantidade.classList.add('quantidade-input');
        inputQuantidade.step = '0.01';

                //Span para unidade de medida
        const spanUnidade = document.createElement('span');
        spanUnidade.classList.add('unidade-medida');

        let quantidadeMaterial = 0; // Inicializa

        //Preenche os inputs e a unidade de medida
        switch (material.tipo) {
            case 'comprimento':
                inputDimensoes.value = material.dimensoes.replace(' cm', ''); // Valor inicial = dimensão cadastrada
                spanUnidade.textContent = 'cm';
                inputQuantidade.value = 1; //Começa em 1 metro.
                quantidadeMaterial = parseFloat(inputQuantidade.value); //Quantidade inicial = 1 metro
                break;

            case 'area':
                const [largura, altura] = material.dimensoes.replace(' cm', '').split(' x ').map(parseFloat);
                inputDimensoes.value = largura; //Valor inicial = largura
                spanUnidade.textContent = 'cm';

                const inputAltura = document.createElement('input');
                inputAltura.type = 'number';
                inputAltura.classList.add('dimensoes-input');
                inputAltura.step = '0.01';
                inputAltura.value = altura; //Valor inicial = altura

                const spanX = document.createElement('span');
                spanX.textContent = 'x';
                spanX.classList.add('dimensoes-span');

                tdDimensoes.appendChild(inputDimensoes);
                tdDimensoes.appendChild(spanX);
                tdDimensoes.appendChild(inputAltura);
                tdDimensoes.appendChild(spanUnidade);

                inputQuantidade.value = 1; //Começa em 1 (m²)
                quantidadeMaterial = parseFloat(inputQuantidade.value);
                break;

            case 'litro':
                inputDimensoes.value = material.dimensoes.replace(' ml', '');
                spanUnidade.textContent = 'ml';
                inputQuantidade.value = 1000; //Começa em 1000ml (1 litro)
                quantidadeMaterial = parseFloat(inputQuantidade.value) / 1000; //Em litros
                break;
            case 'quilo':
                inputDimensoes.value = material.dimensoes.replace(' g', '');
                spanUnidade.textContent = 'g';
                inputQuantidade.value = 1000; //Começa em 1000g (1 quilo)
                quantidadeMaterial = parseFloat(inputQuantidade.value) / 1000; //Em কেজি
                break;
            case 'unidade':
                inputDimensoes.value = 1;
                spanUnidade.textContent = 'un';
                inputQuantidade.value = 1;  //Começa em 1 unidade.
                quantidadeMaterial = parseFloat(inputQuantidade.value); // Quantidade = valor do input
                break;
        }

        if(material.tipo !== 'area'){
            tdDimensoes.appendChild(inputDimensoes);
            tdDimensoes.appendChild(spanUnidade);
        }

        tdQuantidade.appendChild(inputQuantidade);


        // Célula de custo total (calculado)
        const tdCustoTotal = document.createElement('td');
        let custoTotalMaterial = material.custoUnitario * quantidadeMaterial;
        tdCustoTotal.textContent = `R$ ${custoTotalMaterial.toFixed(2)}`;


        // Event listener para recalcular o custo quando mudar a quantidade *ou* dimensões
        inputQuantidade.addEventListener('input', () => {
            const novoValorQuantidade = parseFloat(inputQuantidade.value);

            if(!isNaN(novoValorQuantidade) && novoValorQuantidade >=0){ //Validação
                if(material.tipo === 'litro'){
                    quantidadeMaterial = novoValorQuantidade / 1000;
                } else if (material.tipo === 'quilo'){
                    quantidadeMaterial = novoValorQuantidade / 1000;
                }
                else {
                    quantidadeMaterial = novoValorQuantidade; //Para comprimento, area e unidade
                }

                custoTotalMaterial = material.custoUnitario * quantidadeMaterial;
                tdCustoTotal.textContent = `R$ ${custoTotalMaterial.toFixed(2)}`;
            } else {
                 tdCustoTotal.textContent = 'R$ 0.00'; //Ou outra mensagem de erro
            }
        });

        inputDimensoes.addEventListener('input', recalcularCustoDimensao); //Para comprimento e largura
        if(material.tipo === 'area'){
            inputAltura.addEventListener('input', recalcularCustoDimensao);
        }


        function recalcularCustoDimensao(){
            let novaDimensao = parseFloat(inputDimensoes.value);
            let quantidade = parseFloat(inputQuantidade.value);

             if(!isNaN(novaDimensao) && novaDimensao >= 0 && !isNaN(quantidade) && quantidade >=0){ //Validação
                if(material.tipo === 'comprimento') {
                    quantidadeMaterial = quantidade; //Quantidade não muda com a dimensão
                } else if (material.tipo === 'area'){
                    const novaAltura = parseFloat(inputAltura.value);
                    if(!isNaN(novaAltura) && novaAltura >=0){
                        quantidadeMaterial = quantidade; //Quantidade não muda
                    }
                }

                custoTotalMaterial = material.custoUnitario * quantidadeMaterial;
                tdCustoTotal.textContent = `R$ ${custoTotalMaterial.toFixed(2)}`;
            } else {
                tdCustoTotal.textContent = 'R$ 0.00';
            }
        }

        //Botão de remover
        const tdAcoes = document.createElement('td');
        const removerBtn = document.createElement('button');
        removerBtn.textContent = 'Remover';
        removerBtn.addEventListener('click', () => removerMaterialDoProduto(material.id));
        tdAcoes.appendChild(removerBtn);



        row.innerHTML = `
            <td>${material.nome}</td>
            <td>${material.tipo}</td>
            <td>R$ ${material.custoUnitario.toFixed(2)}</td>
        `;

        row.appendChild(tdDimensoes);
        row.appendChild(tdQuantidade);
        row.appendChild(tdCustoTotal);
        row.appendChild(tdAcoes);

        tabela.appendChild(row);
    });
}

//Função de autocomplete para os materiais
function pesquisarMaterial() {
    const termo = document.getElementById('pesquisa-material').value.toLowerCase();
    const resultadosDiv = document.getElementById('resultados-pesquisa');
    resultadosDiv.innerHTML = '';

    if (termo.length === 0) {
        return; // Não pesquisa se estiver vazio
    }

    const q = query(collection(db, "materiaisInsumos"), where("userId", "==", currentUser.uid));
    getDocs(q).then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const material = doc.data();
            material.id = doc.id;
            if (material.nome.toLowerCase().includes(termo)) {
                const div = document.createElement('div');
                div.textContent = material.nome;
                div.addEventListener('click', () => {
                    adicionarMaterialAoProduto(material);
                });
                resultadosDiv.appendChild(div);
            }
        });
    });
}

async function cadastrarProduto() {
    const nomeProduto = document.getElementById('nome-produto').value;

    if (!nomeProduto) {
        alert("Por favor, insira um nome para o produto.");
        return;
    }

    if (materiaisAdicionados.length === 0) {
        alert("Adicione pelo menos um material ao produto.");
        return;
    }

    // Formata os materiais para o Firestore
    const materiaisParaFirestore = materiaisAdicionados.map(material => {
        //Encontrar a linha da tabela correspondente ao material
        const linhaMaterial = Array.from(document.querySelectorAll('#tabela-materiais-produto tbody tr')).find(row => {
            return row.querySelector('td:first-child').textContent === material.nome; //Compara o nome
        });

        if(!linhaMaterial){ //Se não achou a linha (não deveria acontecer)
             console.error("Linha do material não encontrada:", material.nome);
             return null; //Ou tratar de outra forma
        }


        //Pegar valores dos inputs da linha
        const inputDimensao = linhaMaterial.querySelector('.dimensoes-input');
        const inputQuantidade = linhaMaterial.querySelector('.quantidade-input');

        let dimensao = inputDimensao ? parseFloat(inputDimensao.value) : 0;
        let quantidade = inputQuantidade ? parseFloat(inputQuantidade.value) : 0;

        if(material.tipo === "area"){ //Se for área, pega a altura também
            const inputAltura = linhaMaterial.querySelector('.dimensoes-input:nth-child(3)'); //Terceiro input
            const altura = inputAltura ? parseFloat(inputAltura.value) : 0;

            return {
                nome: material.nome,
                tipo: material.tipo,
                largura: dimensao, // Usando os nomes corretos.
                altura: altura,
                quantidade: quantidade,
                custoUnitario: material.custoUnitario
            }

        } else {
             return {
                nome: material.nome,
                tipo: material.tipo,
                dimensao: dimensao,  //Pode ser comprimento, volume, peso, etc.
                quantidade: quantidade,
                custoUnitario: material.custoUnitario
            };
        }

    }).filter(item => item !== null); //Remove entradas null (se houver)

     if(materiaisParaFirestore.length === 0 && materiaisAdicionados.length > 0){
        alert("Erro ao obter dados dos materiais. Verifique o console.");
        return;
    }

    //Calcula custo total do produto
    let custoTotalProduto = 0;
    materiaisParaFirestore.forEach(item => {

        let quantidadeMaterial = 0;
        if(item.tipo === 'comprimento'){
            quantidadeMaterial = item.quantidade; //Quantidade já está em metros
        } else if (item.tipo === 'area'){
             quantidadeMaterial = item.quantidade;
        } else if(item.tipo === 'litro' || item.tipo === 'quilo'){
           quantidadeMaterial = item.quantidade; // Quantidade já nas unidades corretas
        } else {
           quantidadeMaterial = item.quantidade; //Para tipo 'unidade'
        }
        custoTotalProduto += item.custoUnitario * quantidadeMaterial;
    });

    const produtoData = {
        nome: nomeProduto,
        materiais: materiaisParaFirestore, // Array formatado
        custoTotal: custoTotalProduto,
        userId: currentUser.uid,
        timestamp: serverTimestamp()
    };

    try {
        const docRef = await addDoc(collection(db, "produtos"), produtoData);
        console.log("Produto cadastrado com ID:", docRef.id);

        // Limpar campos e resetar estado
        document.getElementById('nome-produto').value = '';
        materiaisAdicionados = [];
        atualizarTabelaMateriaisProduto();
        carregarProdutosCadastrados(); // Recarrega a lista
        alert("Produto cadastrado com sucesso!"); //Mensagem de sucesso

    } catch (error) {
        console.error("Erro ao cadastrar produto:", error);
        alert("Erro ao cadastrar o produto. Tente novamente.");
    }
}

function carregarProdutosCadastrados() {
    const tabela = document.querySelector('#tabela-produtos tbody');
    tabela.innerHTML = '';

    const q = query(collection(db, "produtos"), where("userId", "==", currentUser.uid), orderBy("timestamp", "asc"));

    onSnapshot(q, (querySnapshot) => {
        tabela.innerHTML = ''; // Limpa antes de re-popular
        querySnapshot.forEach((doc) => {
            const produto = doc.data();
            produto.id = doc.id;

            //Formatar a lista de materiais
            const listaMateriais = produto.materiais.map(item => {
                if(item.tipo === "area"){
                    return `${item.nome} (${item.largura}cm x ${item.altura}cm, ${item.quantidade} m²)`;
                } else if(item.tipo === "comprimento"){
                    return `${item.nome} (${item.dimensao}cm, ${item.quantidade} m)`;
                }else {
                    return `${item.nome} (${item.quantidade} ${item.tipo === 'litro' ? 'L' : item.tipo === 'quilo' ? 'kg' : 'un'})`;
                }
            }).join(', ');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${produto.nome}</td>
                <td>${listaMateriais}</td>
                <td>${produto.materiais.map(m => `R$ ${(m.custoUnitario * m.quantidade).toFixed(2)}`).join(', ')}</td>
                <td>R$ ${produto.custoTotal.toFixed(2)}</td>
                <td>
                    <button class="excluir-produto-btn" data-id="${produto.id}">Excluir</button>
                </td>
            `;
            tabela.appendChild(row);
        });

        // Event listener para o botão de excluir (dentro do onSnapshot)
        const excluirBotoes = document.querySelectorAll('.excluir-produto-btn');
        excluirBotoes.forEach(botao => {
            botao.addEventListener('click', (event) => {
                const produtoId = event.target.dataset.id;
                excluirProduto(produtoId);
            });
        });
    });
}

async function excluirProduto(produtoId){
    try {
      await deleteDoc(doc(db, "produtos", produtoId));
      console.log("Produto excluído com sucesso.");
      carregarProdutosCadastrados(); // Recarrega
    } catch(error){
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir. Tente novamente.");
    }
}

function buscarProdutosCadastrados() {
    const termoBusca = document.getElementById('busca-produto').value.toLowerCase();
    const tabela = document.querySelector('#tabela-produtos tbody');
    const linhas = tabela.querySelectorAll('tr');

    linhas.forEach(linha => {
        const nomeProduto = linha.querySelector('td:first-child').textContent.toLowerCase(); // Primeira célula
        if (nomeProduto.includes(termoBusca)) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none';
        }
    });
}

// --- Funções para Cálculo da Precificação ---
let taxaCreditoPercentual = 6.00; // Valor padrão

function buscarProdutosAutocomplete() {
    const termo = document.getElementById('produto-pesquisa').value.toLowerCase();
    const resultadosDiv = document.getElementById('produto-resultados');
    resultadosDiv.innerHTML = '';

    if (termo.length === 0) {
        resultadosDiv.classList.add('hidden'); // Esconde se estiver vazio
        return;
    }
     resultadosDiv.classList.remove('hidden'); // Mostra

    const q = query(collection(db, "produtos"), where("userId", "==", currentUser.uid));
    getDocs(q).then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const produto = doc.data();
            produto.id = doc.id; // Adiciona o ID
            if (produto.nome.toLowerCase().includes(termo)) {
                const div = document.createElement('div');
                div.textContent = produto.nome;
                div.addEventListener('click', () => {
                    selecionarProduto(produto); // Passa o objeto produto inteiro
                    resultadosDiv.classList.add('hidden');
                });
                resultadosDiv.appendChild(div);
            }
        });
    });
}

function selecionarProduto(produto) {
    document.getElementById('produto-pesquisa').value = produto.nome;
    document.getElementById('custo-produto').textContent = `R$ ${produto.custoTotal.toFixed(2)}`;

    //Mostra detalhes
    const detalhesDiv = document.getElementById('detalhes-produto');
    detalhesDiv.style.display = 'block';

    const listaMateriais = document.getElementById('lista-materiais-produto');
    listaMateriais.innerHTML = ''; // Limpa a lista

    produto.materiais.forEach(material => {
      const li = document.createElement('li');
        if(material.tipo === 'area'){
            li.textContent = `${material.nome}: ${material.largura}cm x ${material.altura}cm, ${material.quantidade}m² - R$ ${(material.custoUnitario * material.quantidade).toFixed(2)}`;
        } else if(material.tipo === "comprimento") {
           li.textContent = `${material.nome}: ${material.dimensao}cm, ${material.quantidade} m - R$ ${(material.custoUnitario * material.quantidade).toFixed(2)}`;
        }else {
          li.textContent = `${material.nome}: ${material.quantidade} ${material.tipo === 'litro' ? 'L' : material.tipo === 'quilo' ? 'kg' : 'un'} - R$ ${(material.custoUnitario * material.quantidade).toFixed(2)}`;
        }

      listaMateriais.appendChild(li);
    });

    calcularCustos(); // Calcula assim que um produto é selecionado
}

async function calcularCustos() {
    const custoProduto = parseFloat(document.getElementById('custo-produto').textContent.replace('R$ ', '')) || 0;
    const horasProduto = parseFloat(document.getElementById('horas-produto').value) || 1; // Padrão 1 hora

    // Custo da Mão de Obra
    const valorHora = parseFloat(document.getElementById('valor-hora').value) || 0;
    const custoFerias13o = parseFloat(document.getElementById('custo-ferias-13o').value) || 0;
    const custoMaoDeObra = valorHora * horasProduto;
    const custoTotalFerias13o = custoFerias13o * horasProduto;
    const totalMaoDeObra = custoMaoDeObra + custoTotalFerias13o;

    document.getElementById('custo-mao-de-obra-detalhe').textContent = `R$ ${custoMaoDeObra.toFixed(2)}`;
    document.getElementById('custo-ferias-13o-detalhe').textContent = `R$ ${custoTotalFerias13o.toFixed(2)}`;
    document.getElementById('total-mao-de-obra').textContent = `R$ ${totalMaoDeObra.toFixed(2)}`;


    // Custo Indireto
    let totalCustosIndiretos = 0;
     const listaCustosIndiretos = document.getElementById('lista-custos-indiretos-detalhes');
    listaCustosIndiretos.innerHTML = '';

    const custosIndiretosRef = collection(db, 'custosIndiretos');
    const qCustos = query(custosIndiretosRef, where("userId", "==", currentUser.uid));

    const querySnapshot = await getDocs(qCustos);

     querySnapshot.forEach(doc => {
        const custo = doc.data();
        const custoPorHora = custo.valorPorHora * horasProduto; // Multiplica pelas horas do produto
        totalCustosIndiretos += custoPorHora;

        const li = document.createElement('li');
        li.textContent = `${custo.nome}: R$ ${custoPorHora.toFixed(2)}`;
        listaCustosIndiretos.appendChild(li);
    });

    document.getElementById('custo-indireto').textContent = `R$ ${totalCustosIndiretos.toFixed(2)}`;

     //Mostrar detalhes dos custos indiretos
     if(totalCustosIndiretos > 0) {
          document.getElementById('detalhes-custos-indiretos').style.display = 'block';
     } else {
         document.getElementById('detalhes-custos-indiretos').style.display = 'none';
     }

    // Subtotal
    const subtotal = custoProduto + totalMaoDeObra + totalCustosIndiretos;
    document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;

    calcularPrecoVendaFinal(); // Calcula o preço final, incluindo margem de lucro
}

function calcularPrecoVendaFinal(){
      const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('R$ ', ''));
      const margemLucroFinal = parseFloat(document.getElementById('margem-lucro-final').value) || 0;

      const margemLucroValor = subtotal * (margemLucroFinal / 100);
      const totalFinal = subtotal + margemLucroValor;

      document.getElementById('margem-lucro-valor').textContent = `R$ ${margemLucroValor.toFixed(2)}`;
      document.getElementById('total-final').textContent = `R$ ${totalFinal.toFixed(2)}`;

      calcularTaxaCredito();

}

function calcularTaxaCredito() {
   const totalFinal = parseFloat(document.getElementById('total-final').textContent.replace('R$ ', ''));
    const incluirTaxa = document.getElementById('incluir-taxa-credito-sim').checked;

    let taxaCreditoValor = 0;
    if (incluirTaxa) {
       taxaCreditoValor = totalFinal * (taxaCreditoPercentual / 100);
    }

    const totalFinalComTaxas = totalFinal + taxaCreditoValor;

    document.getElementById('taxa-credito-valor').textContent = `R$ ${taxaCreditoValor.toFixed(2)}`;
    document.getElementById('total-final-com-taxas').textContent = `R$ ${totalFinalComTaxas.toFixed(2)}`;
}

function salvarTaxaCredito() {
   const novaTaxa = parseFloat(document.getElementById('taxa-credito-percentual').value);
   if(!isNaN(novaTaxa) && novaTaxa >= 0){
      taxaCreditoPercentual = novaTaxa;
       calcularTaxaCredito(); //Recalcula
       alert("Taxa de crédito salva: " + taxaCreditoPercentual + "%");
   } else {
     alert("Por favor, insira um valor válido para a taxa.");
   }
}

async function gerarNotaPrecificacao() {
   const nomeCliente = document.getElementById('nome-cliente').value || "Não informado"; // Padrão se vazio
    const produtoNome = document.getElementById('produto-pesquisa').value;

     if(!produtoNome) { //Verificação
       alert("Por favor, selecione um produto.");
       return;
    }

    //Obter dados do produto selecionado (usando a mesma lógica do autocomplete)
    const q = query(collection(db, "produtos"), where("userId", "==", currentUser.uid), where("nome", "==", produtoNome));
    const querySnapshot = await getDocs(q);

    if(querySnapshot.empty){
      alert("Produto não encontrado.");
      return;
    }

    const produto = querySnapshot.docs[0].data(); // Deveria ter só 1, com o mesmo nome
    produto.id = querySnapshot.docs[0].id;

    const horasProduto = parseFloat(document.getElementById('horas-produto').value) || 1;

    //Custo Mão de Obra
    const valorHora = parseFloat(document.getElementById('valor-hora').value) || 0;
    const custoFerias13o = parseFloat(document.getElementById('custo-ferias-13o').value) || 0;
    const custoMaoDeObra = valorHora * horasProduto;
    const custoTotalFerias13o = custoFerias13o * horasProduto;
    const totalMaoDeObra = custoMaoDeObra + custoTotalFerias13o;

   //Montar lista de materiais (detalhada)
    const listaMateriaisDetalhada = produto.materiais.map(material => {
        if(material.tipo === "area"){
             return `${material.nome} - ${material.largura}cm x ${material.altura}cm, ${material.quantidade}m² - R$ ${(material.custoUnitario * material.quantidade).toFixed(2)}`;
        }else if(material.tipo === "comprimento"){
            return `${material.nome} - ${material.dimensao}cm - ${material.quantidade}m - R$ ${(material.custoUnitario * material.quantidade).toFixed(2)}`;
        }
        else {
             return `${material.nome} - ${material.quantidade} ${material.tipo === 'litro' ? 'L' : material.tipo === 'quilo' ? 'kg' : 'un'} - R$ ${(material.custoUnitario * material.quantidade).toFixed(2)}`;
        }
    }).join('<br>');


    // Custos Indiretos (detalhados)
    let totalCustosIndiretos = 0;
    let listaCustosIndiretosDetalhada = "";
    const custosIndiretosRef = collection(db, 'custosIndiretos');
    const qCustos = query(custosIndiretosRef, where("userId", "==", currentUser.uid));
    const custosSnapshot = await getDocs(qCustos); // Usando await para ter os dados

    custosSnapshot.forEach(doc => { // Agora sim, iterar
        const custo = doc.data();
         const custoPorHoraProduto = custo.valorPorHora * horasProduto;
        totalCustosIndiretos += custoPorHoraProduto;
        listaCustosIndiretosDetalhada += `${custo.nome} - R$ ${custoPorHoraProduto.toFixed(2)}<br>`;
    });

     // Outros custos (cálculos)
    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('R$ ', ''));
    const margemLucroFinal = parseFloat(document.getElementById('margem-lucro-final').value) || 0;
    const margemLucroValor = parseFloat(document.getElementById('margem-lucro-valor').textContent.replace('R$ ', ''));
    const totalFinal = parseFloat(document.getElementById('total-final').textContent.replace('R$ ', ''));
    const taxaCreditoValor = parseFloat(document.getElementById('taxa-credito-valor').textContent.replace('R$ ', ''));
    const totalFinalComTaxas = parseFloat(document.getElementById('total-final-com-taxas').textContent.replace('R$ ', ''));

     const incluirTaxa = document.getElementById('incluir-taxa-credito-sim').checked; //Verifica se incluiu taxa.

     //Gerar número da precificação
     const numeroPrecificacao = await gerarNumeroPrecificacao();

    //Criar tabela HTML da nota de precificação
    const tabelaHTML = `
        <table class="tabela-precificacao-detalhada">
            <thead>
                <tr><th colspan="2">Nota de Precificação - Nº ${numeroPrecificacao}</th></tr>
            </thead>
            <tbody>
                <tr><td>Cliente:</td><td>${nomeCliente}</td></tr>
                <tr><td>Produto:</td><td>${produtoNome}</td></tr>
                <tr><td>Materiais:</td><td>${listaMateriaisDetalhada}</td></tr>
                <tr><td>Custo dos Materiais:</td><td>R$ ${produto.custoTotal.toFixed(2)}</td></tr>
                <tr><td>Horas de Trabalho:</td><td>${horasProduto}</td></tr>
                <tr><td>Custo Mão de Obra:</td><td>R$ ${custoMaoDeObra.toFixed(2)}</td></tr>
                <tr><td>Custo 13º e Férias:</td><td>R$ ${custoTotalFerias13o.toFixed(2)}</td></tr>
                <tr><td>Total Mão de Obra:</td><td>R$ ${totalMaoDeObra.toFixed(2)}</td></tr>
                <tr><td>Custos Indiretos:</td><td>${listaCustosIndiretosDetalhada}</td></tr>
                <tr><td>Total Custos Indiretos:</td><td>R$ ${totalCustosIndiretos.toFixed(2)}</td></tr>
                <tr><td>Subtotal:</td><td>R$ ${subtotal.toFixed(2)}</td></tr>
                <tr><td>Margem de Lucro (${margemLucroFinal}%):</td><td>R$ ${margemLucroValor.toFixed(2)}</td></tr>
                <tr><td>Total (com Margem):</td><td>R$ ${totalFinal.toFixed(2)}</td></tr>
                ${incluirTaxa ? `<tr><td>Taxa de Crédito (${taxaCreditoPercentual}%):</td><td>R$ ${taxaCreditoValor.toFixed(2)}</td></tr>` : ''}
                ${incluirTaxa ? `<tr><td>Total Final (com Taxas):</td><td>R$ ${totalFinalComTaxas.toFixed(2)}</td></tr>` : ''}

            </tbody>
        </table>
    `;

    //Salvar no banco de dados.
    const precificacaoData = {
       numero: numeroPrecificacao,
       cliente: nomeCliente,
       produto: produtoNome,
       detalhes: tabelaHTML,  //Salva a tabela como string.
       userId: currentUser.uid,
       timestamp: serverTimestamp()
    };

    try{
      const docRef = await addDoc(collection(db, "precificacoes"), precificacaoData);
      console.log("Precificação salva com ID:", docRef.id);
       carregarPrecificacoesGeradas(); //Recarrega
       alert("Nota de precificação gerada e salva com sucesso!");

       //Abrir em nova aba (opcional)
       const novaAba = window.open();
       novaAba.document.body.innerHTML = tabelaHTML;


    } catch(error){
      console.error("Erro ao salvar precificação:", error);
      alert("Erro ao salvar a precificação.");
    }
}

async function gerarNumeroPrecificacao(){
  const anoAtual = new Date().getFullYear();
  const precificacoesRef = collection(db, "precificacoes");
  const q = query(precificacoesRef, where("userId", "==", currentUser.uid), where("numero", ">=", anoAtual + "-0001"), where("numero", "<=", anoAtual + "-9999"));
  const querySnapshot = await getDocs(q);

  let maiorNumero = 0;
   querySnapshot.forEach(doc => {
     const numero = parseInt(doc.data().numero.split('-')[1]); //Pega a parte numérica
     if(numero > maiorNumero){
       maiorNumero = numero;
     }
   });

   const proximoNumero = maiorNumero + 1;
   const numeroFormatado = anoAtual + "-" + String(proximoNumero).padStart(4, '0'); //Formato: ANO-0001
   return numeroFormatado;
}

function carregarPrecificacoesGeradas() {
   const tabela = document.querySelector('#tabela-precificacoes-geradas tbody');
    tabela.innerHTML = '';

    const q = query(collection(db, "precificacoes"), where("userId", "==", currentUser.uid), orderBy("timestamp", "desc")); // Ordem decrescente

    onSnapshot(q, (querySnapshot) => {
        tabela.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const precificacao = doc.data();
            precificacao.id = doc.id;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${precificacao.numero}</td>
                <td>${precificacao.cliente}</td>
                <td>
                    <button class="visualizar-btn" data-id="${precificacao.id}">Visualizar</button>
                    <button class="excluir-precificacao-btn" data-id="${precificacao.id}">Excluir</button>
                </td>
            `;
            tabela.appendChild(row);
        });

        //Event Listeners (dentro do onSnapshot)
        const visualizarBotoes = document.querySelectorAll('.visualizar-btn');
        visualizarBotoes.forEach(botao => {
            botao.addEventListener('click', (event) => {
                const precificacaoId = event.target.dataset.id;
                visualizarPrecificacao(precificacaoId);

            });
        });

        const excluirBotoes = document.querySelectorAll('.excluir-precificacao-btn');
        excluirBotoes.forEach(botao => {
           botao.addEventListener('click', (event) => {
              const precificacaoId = event.target.dataset.id;
              excluirPrecificacao(precificacaoId);
           });
        });
    });
}

async function excluirPrecificacao(precificacaoId){
  try{
    await deleteDoc(doc(db, 'precificacoes', precificacaoId));
    console.log("Precificação excluída com sucesso.");
    carregarPrecificacoesGeradas(); //Recarrega
    document.getElementById('detalhe-precificacao-container').style.display = 'none'; //Esconde detalhes
    document.getElementById('detalhe-precificacao-container').innerHTML = '';

  } catch(error){
    console.error("Erro ao excluir:", error);
    alert("Erro ao excluir a precificação.");
  }
}

function visualizarPrecificacao(precificacaoId) {
   const container = document.getElementById('detalhe-precificacao-container');
   container.innerHTML = ''; // Limpa
    container.style.display = 'block';

    getDoc(doc(db, "precificacoes", precificacaoId)).then(docSnap => { //Usando getDoc, não onSnapshot
      if(docSnap.exists()){
        const precificacao = docSnap.data();
        container.innerHTML = precificacao.detalhes; // Mostra a tabela salva.
      } else {
         container.innerHTML = "<p>Precificação não encontrada.</p>";
      }
    }).catch(error => {
       console.error("Erro ao buscar:", error);
       container.innerHTML = "<p>Erro ao carregar detalhes.</p>";
    });
}

function buscarPrecificacoesGeradas() {
    const termoBusca = document.getElementById('busca-precificacao').value.toLowerCase();
    const tabela = document.querySelector('#tabela-precificacoes-geradas tbody');
    const linhas = tabela.querySelectorAll('tr');

    linhas.forEach(linha => {
        const numero = linha.querySelector('td:nth-child(1)').textContent.toLowerCase();
        const cliente = linha.querySelector('td:nth-child(2)').textContent.toLowerCase();

        if (numero.includes(termoBusca) || cliente.includes(termoBusca)) {
            linha.style.display = ''; // Mostra
        } else {
            linha.style.display = 'none'; // Oculta
        }
    });
}

// --- Funções auxiliares ---

function atualizarCamposFormulario() {
    const tipoMaterial = document.querySelector('input[name="tipo-material"]:checked').value;

    // Esconde todos os campos
    document.getElementById('campos-comprimento').style.display = 'none';
    document.getElementById('campos-area').style.display = 'none';
    document.getElementById('campos-litro').style.display = 'none';
    document.getElementById('campos-quilo').style.display = 'none';

    // Mostra os campos relevantes com base no tipo selecionado
    switch (tipoMaterial) {
        case 'comprimento':
            document.getElementById('campos-comprimento').style.display = 'block';
            break;
        case 'area':
            document.getElementById('campos-area').style.display = 'block';
            break;
        case 'litro':
            document.getElementById('campos-litro').style.display = 'block';
            break;
        case 'quilo':
            document.getElementById('campos-quilo').style.display = 'block';
            break;
        // 'unidade' não precisa de campos adicionais
    }
}


// --- Event Listeners ---

// Autenticação
document.getElementById('registerBtn').addEventListener('click', registrarUsuario);
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('forgotPasswordBtn').addEventListener('click', redefinirSenha);

// Navegação
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const subpaginaId = event.target.dataset.submenu;
        mostrarSubpagina(subpaginaId);
    });
});

// Materiais e Insumos
document.getElementById('cadastrar-material-insumo-btn').addEventListener('click', cadastrarMaterialInsumo);
document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
    radio.addEventListener('change', atualizarCamposFormulario);
});
document.getElementById('busca-material').addEventListener('keyup', buscarMateriaisCadastrados)

// Mão de Obra
document.getElementById('btn-salvar-mao-de-obra').addEventListener('click', salvarMaoDeObra);
document.getElementById('btn-editar-mao-de-obra').addEventListener('click', editarMaoDeObra);
document.getElementById('incluir-ferias-13o-sim').addEventListener('change', calcularValorHora);
document.getElementById('incluir-ferias-13o-nao').addEventListener('change', calcularValorHora);
document.getElementById('salario-receber').addEventListener('input', calcularValorHora);
document.getElementById('horas-trabalhadas').addEventListener('input', calcularValorHora);

// Custos Indiretos
document.getElementById('adicionarCustoIndiretoBtn').addEventListener('click', adicionarCustoIndireto);
document.getElementById('busca-custo-indireto').addEventListener('keyup', buscarCustosIndiretosCadastrados);

//Produtos Cadastrados
document.getElementById('pesquisa-material').addEventListener('input', pesquisarMaterial);
document.getElementById('cadastrar-produto-btn').addEventListener('click', cadastrarProduto);
document.getElementById('busca-produto').addEventListener('keyup', buscarProdutosCadastrados);

//Cálculo da Precificação
document.getElementById('produto-pesquisa').addEventListener('input', buscarProdutosAutocomplete);
document.getElementById('horas-produto').addEventListener('input', calcularCustos);
document.getElementById('margem-lucro-final').addEventListener('input', calcularPrecoVendaFinal);
document.getElementById('incluir-taxa-credito-sim').addEventListener('change', calcularTaxaCredito);
document.getElementById('incluir-taxa-credito-nao').addEventListener('change', calcularTaxaCredito);
document.getElementById('taxa-credito-percentual').addEventListener('input', calcularTaxaCredito);

// Inicialização
checkAuthState(); // Verifica o estado da autenticação ao carregar a página
