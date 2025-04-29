document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    checkAuth();
    
    // Configurar elementos UI
    setupUIHandlers();
    
    // Carregar dados do dashboard
    loadDashboardData();
});

// Verificação de autenticação
function checkAuth() {
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            // Usuário não autenticado, redirecionar para login
            window.location.href = 'index.html';
            return;
        }
        
        // Verificar se o usuário tem perfil de Super ADM
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        if (userProfile.role !== 'superadm') {
            // Não é Super ADM, redirecionar com base no papel
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
            return;
        }
        
        // Mostrar nome do usuário
        const usernameElement = document.querySelector('.username');
        if (usernameElement) {
            usernameElement.textContent = userProfile.name || 'Super Administrador';
        }
    });
}

// Configuração de handlers de UI
function setupUIHandlers() {
    // Handler de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            auth.signOut().then(() => {
                localStorage.removeItem('userProfile');
                window.location.href = 'index.html';
            });
        });
    }
    
    // Handler de atualização de dados
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            showUploadModal();
        });
    }
}

// Carregamento de dados do dashboard
function loadDashboardData() {
    showLoading();
    
    // Buscar os dados mais recentes
    db.collection('indicadores')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get()
        .then(snapshot => {
            hideLoading();
            
            if (snapshot.empty) {
                console.log('Nenhum dado encontrado no Firestore.');
                return;
            }
            
            // Obter dados do documento mais recente
            const data = snapshot.docs[0].data();
            
            // Atualizar timestamp da última atualização
            updateLastUpdate(data.timestamp);
            
            // Atualizar KPIs principais
            updateKPIs(data);
            
            // Atualizar gráficos
            updateCharts(data);
            
            // Atualizar tabela de ranking
            updateRankingTable(data);
            
            // Atualizar alertas
            updateAlerts(data);
        })
        .catch(error => {
            hideLoading();
            console.error("Erro ao carregar dados:", error);
            showError("Falha ao carregar dados do dashboard.");
        });
}

// Atualizar informação de última atualização
function updateLastUpdate(timestamp) {
    const lastUpdateElement = document.querySelector('.last-update strong');
    if (lastUpdateElement && timestamp) {
        const date = timestamp.toDate();
        lastUpdateElement.textContent = date.toLocaleDateString('pt-BR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

// Atualizar KPIs principais
function updateKPIs(data) {
    // Atualizar valor total de vendas
    const totalVendasElement = document.querySelector('.kpi-card:nth-child(1) .value');
    if (totalVendasElement && data.totalVendas) {
        totalVendasElement.textContent = 'R$ ' + formatNumber(data.totalVendas);
    }
    
    // Atualizar itens vendidos
    const itensVendidosElement = document.querySelector('.kpi-card:nth-child(1) .subtitle');
    if (itensVendidosElement && data.itensVendidos) {
        itensVendidosElement.textContent = data.itensVendidos + ' itens vendidos';
    }
    
    // Atualizar microcrédito concedido
    const creditoConcedidoElement = document.querySelector('.kpi-card:nth-child(2) .value');
    if (creditoConcedidoElement && data.microcreditoConcedido) {
        creditoConcedidoElement.textContent = 'R$ ' + formatNumber(data.microcreditoConcedido);
    }
    
    // Atualizar operações de microcrédito
    const operacoesElement = document.querySelector('.kpi-card:nth-child(2) .subtitle');
    if (operacoesElement && data.operacoesMicrocredito) {
        operacoesElement.textContent = data.operacoesMicrocredito + ' operações';
    }
    
    // Atualizar saldo devedor
    const saldoDevedorElement = document.querySelector('.kpi-card:nth-child(3) .value');
    if (saldoDevedorElement && data.saldoDevedor) {
        saldoDevedorElement.textContent = 'R$ ' + formatNumber(data.saldoDevedor);
    }
    
    // Atualizar percentual de saldo devedor
    const percentualDevedorElement = document.querySelector('.kpi-card:nth-child(3) .subtitle');
    if (percentualDevedorElement && data.percentualDevedor) {
        percentualDevedorElement.textContent = data.percentualDevedor + '% do total concedido';
    }
    
    // Atualizar taxa de conversão
    const taxaConversaoElement = document.querySelector('.kpi-card:nth-child(4) .value');
    if (taxaConversaoElement && data.taxaConversao) {
        taxaConversaoElement.textContent = data.taxaConversao + '%';
    }
    
    // Atualizar valor vendido
    const valorVendidoElement = document.querySelector('.kpi-card:nth-child(4) .subtitle');
    if (valorVendidoElement && data.valorVendido) {
        valorVendidoElement.textContent = 'R$ ' + formatNumber(data.valorVendido) + ' vendidos';
    }
}

// Atualizar gráficos com dados do Firestore
function updateCharts(data) {
    // Gráfico de faturamento por ONG
    if (data.faturamentoPorOng) {
        const labels = Object.keys(data.faturamentoPorOng);
        const values = Object.values(data.faturamentoPorOng);
        
        const faturamentoCtx = document.getElementById('faturamentoChart').getContext('2d');
        new Chart(faturamentoCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Faturamento (R$)',
                    data: values,
                    backgroundColor: '#FF0066',
                    borderColor: '#FF0066',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'R$ ' + context.raw.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico de inadimplência por ONG
    if (data.inadimplenciaPorOng) {
        const labels = Object.keys(data.inadimplenciaPorOng);
        const values = Object.values(data.inadimplenciaPorOng);
        
        const inadimplenciaCtx = document.getElementById('inadimplenciaChart').getContext('2d');
        new Chart(inadimplenciaCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Taxa de Inadimplência (%)',
                    data: values,
                    backgroundColor: '#FF9500',
                    borderColor: '#FF9500',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.raw + '%';
                            }
                        }
                    }
                }
            }
        });
    }
}

// Atualizar tabela de ranking das maras
function updateRankingTable(data) {
    if (!data.topMaras || !Array.isArray(data.topMaras) || data.topMaras.length === 0) {
        console.log('Dados de ranking não encontrados ou inválidos');
        return;
    }
    
    const tableBody = document.querySelector('.table-container tbody');
    if (!tableBody) return;
    
    // Limpar tabela existente
    tableBody.innerHTML = '';
    
    // Adicionar linhas para cada mara no top
    data.topMaras.forEach(mara => {
        const row = document.createElement('tr');
        
        // Nome da Mara
        const nameCell = document.createElement('td');
        nameCell.textContent = mara.nome;
        row.appendChild(nameCell);
        
        // ONG
        const ongCell = document.createElement('td');
        ongCell.textContent = mara.ong;
        row.appendChild(ongCell);
        
        // Valor de vendas
        const valorCell = document.createElement('td');
        valorCell.textContent = 'R$ ' + formatNumber(mara.valorVendas);
        row.appendChild(valorCell);
        
        // Quantidade de itens
        const qtdCell = document.createElement('td');
        qtdCell.textContent = mara.itensVendidos;
        row.appendChild(qtdCell);
        
        tableBody.appendChild(row);
    });
}

// Atualizar alertas
function updateAlerts(data) {
    if (!data.alertas || !Array.isArray(data.alertas) || data.alertas.length === 0) {
        return;
    }
    
    const alertsContainer = document.querySelector('.alert-container');
    if (!alertsContainer) return;
    
    // Limpar alertas existentes
    alertsContainer.innerHTML = '';
    
    // Adicionar novos alertas
    data.alertas.forEach(alerta => {
        const alertElement = document.createElement('div');
        alertElement.className = `alert ${alerta.tipo}`; // tipo pode ser 'danger', 'warning', 'success'
        
        const iconElement = document.createElement('div');
        iconElement.className = 'alert-icon';
        iconElement.textContent = alerta.tipo === 'danger' ? '⚠️' : 
                                 alerta.tipo === 'warning' ? '⚠️' : '✓';
        
        const contentElement = document.createElement('div');
        contentElement.className = 'alert-content';
        
        const titleElement = document.createElement('div');
        titleElement.className = 'alert-title';
        titleElement.textContent = alerta.titulo;
        
        const textElement = document.createElement('p');
        textElement.textContent = alerta.mensagem;
        
        contentElement.appendChild(titleElement);
        contentElement.appendChild(textElement);
        
        alertElement.appendChild(iconElement);
        alertElement.appendChild(contentElement);
        
        alertsContainer.appendChild(alertElement);
    });
}

// Modal de upload de arquivo
function showUploadModal() {
    // Criar o modal dinamicamente
    const modalHtml = `
    <div id="upload-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Atualizar Dados</h3>
                <button class="close-button" id="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="tabs">
                    <button class="tab active" data-tab="tab-indicadores">Indicadores de Ligas</button>
                    <button class="tab" data-tab="tab-produtos">Produtos</button>
                </div>
                
                <div class="tab-content active" id="tab-indicadores">
                    <p>Faça upload do arquivo Excel com os dados atualizados de indicadores.</p>
                    <div class="form-group">
                        <label for="indicadores-file">Arquivo de Indicadores</label>
                        <input type="file" id="indicadores-file" accept=".xlsx,.xls,.csv">
                    </div>
                </div>
                
                <div class="tab-content" id="tab-produtos">
                    <p>Faça upload do arquivo Excel com os dados atualizados de produtos.</p>
                    <div class="form-group">
                        <label for="produtos-file">Arquivo de Produtos</label>
                        <input type="file" id="produtos-file" accept=".xlsx,.xls,.csv">
                    </div>
                </div>
                
                <div id="upload-progress" class="progress" style="display: none;">
                    <div class="progress-bar" style="width: 0%"></div>
                    <div class="progress-text">0%</div>
                </div>
                
                <div id="upload-result" class="alert" style="display: none;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="cancel-upload">Cancelar</button>
                <button class="btn btn-primary" id="submit-upload">Processar Arquivo</button>
            </div>
        </div>
    </div>
    `;
    
    // Inserir o modal no DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstChild);
    
    // Mostrar o modal
    const modal = document.getElementById('upload-modal');
    modal.style.display = 'flex';
    
    // Configurar eventos
    setupModalEvents();
}

// Configurar eventos do modal
function setupModalEvents() {
    const modal = document.getElementById('upload-modal');
    const closeButton = document.getElementById('close-modal');
    const cancelButton = document.getElementById('cancel-upload');
    const submitButton = document.getElementById('submit-upload');
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Fechar o modal
    function closeModal() {
        document.body.removeChild(modal);
    }
    
    // Evento de fechar
    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    
    // Evento de clique fora
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Troca de abas
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Atualizar abas ativas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Processar upload
    submitButton.addEventListener('click', function() {
        // Determinar qual aba está ativa
        const activeTab = document.querySelector('.tab.active').getAttribute('data-tab');
        
        let fileInput, fileType;
        if (activeTab === 'tab-indicadores') {
            fileInput = document.getElementById('indicadores-file');
            fileType = 'indicadores';
        } else {
            fileInput = document.getElementById('produtos-file');
            fileType = 'produtos';
        }
        
        // Verificar se um arquivo foi selecionado
        if (!fileInput.files || fileInput.files.length === 0) {
            showUploadResult('error', 'Por favor, selecione um arquivo para upload.');
            return;
        }
        
        const file = fileInput.files[0];
        
        // Verificar tipo de arquivo
        const validTypes = ['.xlsx', '.xls', '.csv'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!validTypes.includes(fileExt)) {
            showUploadResult('error', 'Formato de arquivo inválido. Por favor, utilize Excel ou CSV.');
            return;
        }
        
        // Iniciar upload
        uploadFile(file, fileType);
    });
}

// Função para upload de arquivo para o Firebase Storage
function uploadFile(file, fileType) {
    const progressBar = document.getElementById('upload-progress');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    const progressText = progressBar.querySelector('.progress-text');
    
    // Mostrar barra de progresso
    progressBar.style.display = 'block';
    
    // Referência de armazenamento
    const storageRef = storage.ref(`uploads/${fileType}/${Date.now()}_${file.name}`);
    
    // Iniciar upload
    const uploadTask = storageRef.put(file);
    
    // Monitorar progresso
    uploadTask.on('state_changed', 
        // Progresso
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const progressPercent = Math.round(progress);
            progressBarInner.style.width = progressPercent + '%';
            progressText.textContent = progressPercent + '%';
        },
        // Erro
        (error) => {
            console.error('Erro no upload:', error);
            showUploadResult('error', `Erro ao fazer upload: ${error.message}`);
        },
        // Concluído
        () => {
            // URL do arquivo
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                                // Salvar referência no Firestore
                saveFileReference(downloadURL, fileType, file.name)
                    .then(() => {
                        showUploadResult('success', `Upload concluído com sucesso. O arquivo será processado em breve.`);
                        
                        // Após alguns segundos, recarregar a página
                        setTimeout(() => {
                            // Fechar modal
                            const modal = document.getElementById('upload-modal');
                            document.body.removeChild(modal);
                            
                            // Recarregar dados
                            loadDashboardData();
                        }, 3000);
                    })
                    .catch(error => {
                        console.error('Erro ao salvar referência:', error);
                        showUploadResult('error', `Erro ao processar o arquivo: ${error.message}`);
                    });
            });
        }
    );
}

// Salvar referência do arquivo no Firestore
function saveFileReference(fileUrl, fileType, fileName) {
    return db.collection('fileUploads').add({
        fileUrl: fileUrl,
        fileType: fileType,
        fileName: fileName,
        uploadedBy: auth.currentUser.uid,
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        processedAt: null
    });
}

// Mostrar resultado do upload
function showUploadResult(type, message) {
    const resultElement = document.getElementById('upload-result');
    resultElement.className = `alert ${type === 'success' ? 'success' : 'danger'}`;
    resultElement.textContent = message;
    resultElement.style.display = 'block';
}

// Utilitários
function formatNumber(value) {
    return parseFloat(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showLoading() {
    const loadingElement = document.getElementById('loading') || document.createElement('div');
    if (!document.getElementById('loading')) {
        loadingElement.id = 'loading';
        loadingElement.className = 'loading';
        loadingElement.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loadingElement);
    }
    loadingElement.style.display = 'flex';
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-toast') || document.createElement('div');
    if (!document.getElementById('error-toast')) {
        errorElement.id = 'error-toast';
        errorElement.className = 'error-toast';
        document.body.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    setTimeout(() => {
        errorElement.classList.remove('show');
    }, 5000);
}
