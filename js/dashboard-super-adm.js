document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário está logado e tem permissão
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser.username || currentUser.role !== 'superadm') {
        window.location.href = 'index.html';
        return;
    }
    
    // Configurar evento de logout
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
    
    // Configurar evento de atualização
    document.getElementById('update-btn').addEventListener('click', function() {
        alert('Para atualizar os dados no ambiente de produção, você precisará fazer upload dos arquivos Excel/CSV atualizados. Esta funcionalidade está simulada neste MVP.');
    });
    
    // Criar gráfico de faturamento por ONG
    const faturamentoCtx = document.getElementById('faturamentoChart').getContext('2d');
    new Chart(faturamentoCtx, {
        type: 'bar',
        data: {
            labels: ['REDE ACESSIBILIDADE', 'ECLESIA MOVEMENT', 'VIVENDA DA CRIANÇA', 'RESILIÊNCIA AZUL', 'SONHAR ALTO', 'UNIDADES PRÓPRIAS'],
            datasets: [{
                label: 'Faturamento (R$)',
                data: [12338.07, 4164.10, 3268.47, 2572.37, 2752.05, 381.78],
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
                }
            }
        }
    });
    
    // Criar gráfico de inadimplência por ONG
    const inadimplenciaCtx = document.getElementById('inadimplenciaChart').getContext('2d');
    new Chart(inadimplenciaCtx, {
        type: 'bar',
        data: {
            labels: ['REDE ACESSIBILIDADE', 'ECLESIA MOVEMENT', 'VIVENDA DA CRIANÇA', 'RESILIÊNCIA AZUL', 'SONHAR ALTO', 'UNIDADES PRÓPRIAS'],
            datasets: [{
                label: 'Taxa de Inadimplência (%)',
                data: [12, 32, 18, 15, 29, 43],
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
                }
            }
        }
    });
});
