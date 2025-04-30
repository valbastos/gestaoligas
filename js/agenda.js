document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            // Redirecionar para login se não estiver autenticado
            window.location.href = 'index.html';
            return;
        }
        
        // Configurar UI depois de autenticado
        setupUI();
        
        // Carregar visitas existentes
        loadVisits();
    });
    
    // Setup da interface
    function setupUI() {
        // Configurar botão de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }
        
        // Configurar botão de nova visita
        const addVisitBtn = document.getElementById('add-visit-btn');
        if (addVisitBtn) {
            addVisitBtn.addEventListener('click', function() {
                showModal();
            });
        }
        
        // Configurar botões do modal
        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', hideModal);
        }
        
        const cancelFormBtn = document.getElementById('cancel-form');
        if (cancelFormBtn) {
            cancelFormBtn.addEventListener('click', hideModal);
        }
        
        // Configurar submissão do formulário
        const visitForm = document.getElementById('visit-form');
        if (visitForm) {
            visitForm.addEventListener('submit', function(e) {
                e.preventDefault();
                submitVisit();
            });
        }
        
        // Configurar clique fora do modal para fechar
        window.addEventListener('click', function(e) {
            const modal = document.getElementById('new-visit-modal');
            if (e.target === modal) {
                hideModal();
            }
        });
    }
    
    // Carregar visitas do Firestore
    function loadVisits() {
        // Mostrar indicador de carregamento
        const loading = document.createElement('div');
        loading.className = 'loading-indicator';
        loading.textContent = 'Carregando visitas...';
        document.body.appendChild(loading);
        
        // Obter referência ao perfil do usuário
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        
        // Construir query com base no papel do usuário
        let visitsQuery = db.collection('visits').orderBy('date', 'asc');
        
        if (userProfile.role === 'ong') {
            // Filtrar por ONG específica
            visitsQuery = visitsQuery.where('ongId', '==', userProfile.ongId);
        } else if (userProfile.role === 'gestor') {
            // Filtrar por Liga específica
            visitsQuery = visitsQuery.where('ligaId', '==', userProfile.ligaId);
        }
        
        // Executar consulta
        visitsQuery.get()
            .then(snapshot => {
                // Remover indicador de carregamento
                document.body.removeChild(loading);
                
                if (snapshot.empty) {
                    console.log('Nenhuma visita encontrada');
                    return;
                }
                
                // Processar os resultados
                const visits = [];
                snapshot.forEach(doc => {
                    const visit = doc.data();
                    visit.id = doc.id;
                    visits.push(visit);
                });
                
                // Atualizar o calendário com as visitas
                updateCalendar(visits);
                
                // Atualizar a lista de próximas visitas
                updateNextVisitsList(visits);
            })
            .catch(error => {
                console.error('Erro ao carregar visitas:', error);
                document.body.removeChild(loading);
                alert('Erro ao carregar visitas. Por favor, tente novamente.');
            });
    }
    
    // Mostrar modal de nova visita
    function showModal() {
        const modal = document.getElementById('new-visit-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Definir data padrão como hoje
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('visit-date').value = today;
        }
    }
    
    // Esconder modal
    function hideModal() {
        const modal = document.getElementById('new-visit-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('visit-form').reset();
        }
    }
    
    // Submeter nova visita
    function submitVisit() {
        // Obter valores do formulário
        const date = document.getElementById('visit-date').value;
        const time = document.getElementById('visit-time').value;
        const ong = document.getElementById('visit-ong').value;
        const purpose = document.getElementById('visit-purpose').value;
        const notes = document.getElementById('visit-notes').value;
        
        // Validar dados
        if (!date || !time || !ong || !purpose) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        // Obter informações do usuário
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        
        // Criar objeto de visita
        const visitData = {
            date: date,
            time: time,
            ongName: ong,
            purpose: purpose,
            notes: notes || '',
            status: 'scheduled', // scheduled, completed, canceled
            createdBy: userProfile.uid,
            createdByName: userProfile.name || 'Usuário',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Adicionar ao Firestore
        db.collection('visits').add(visitData)
            .then(docRef => {
                console.log('Visita agendada com ID:', docRef.id);
                
                // Fechar modal
                hideModal();
                
                // Exibir mensagem de sucesso
                alert('Visita agendada com sucesso!');
                
                // Recarregar visitas
                loadVisits();
            })
            .catch(error => {
                console.error('Erro ao agendar visita:', error);
                alert('Erro ao agendar visita. Por favor, tente novamente.');
            });
    }
    
    // Atualizar calendário com visitas
    function updateCalendar(visits) {
        // Implementação básica - Para um calendário completo,
        // você pode usar uma biblioteca como FullCalendar
        
        // Para esta implementação simplificada, vamos adicionar eventos aos dias
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Filtrar visitas apenas do mês atual
        const currentMonthVisits = visits.filter(visit => {
            const visitDate = new Date(visit.date);
            return visitDate.getMonth() === currentMonth && 
                   visitDate.getFullYear() === currentYear;
        });
        
        // Limpar eventos existentes
        const calendarDays = document.querySelectorAll('.calendar-day');
        calendarDays.forEach(day => {
            // Manter apenas o número do dia
            const dateElement = day.querySelector('.calendar-date');
            if (dateElement) {
                const date = dateElement.textContent;
                day.innerHTML = '';
                day.appendChild(dateElement);
            }
        });
        
        // Adicionar eventos aos dias correspondentes
        currentMonthVisits.forEach(visit => {
            const visitDate = new Date(visit.date);
            const dayOfMonth = visitDate.getDate();
            
            // Encontrar o elemento do dia correspondente
            calendarDays.forEach(day => {
                const dateElement = day.querySelector('.calendar-date');
                if (dateElement && parseInt(dateElement.textContent) === dayOfMonth) {
                    // Criar elemento de evento
                    const eventElement = document.createElement('div');
                    eventElement.className = `event ${visit.status}`;
                    
                    // Adicionar hora
                    const timeElement = document.createElement('div');
                    timeElement.className = 'event-time';
                    timeElement.textContent = visit.time;
                    
                    // Adicionar título
                    const titleElement = document.createElement('div');
                    titleElement.className = 'event-title';
                    titleElement.textContent = visit.ongName;
                    
                    // Adicionar ao evento
                    eventElement.appendChild(timeElement);
                    eventElement.appendChild(titleElement);
                    
                    // Adicionar evento ao dia
                    day.appendChild(eventElement);
                    
                    // Adicionar evento de clique
                    eventElement.addEventListener('click', function() {
                        showVisitDetails(visit);
                    });
                }
            });
        });
    }
    
    // Atualizar lista de próximas visitas
    function updateNextVisitsList(visits) {
        const listContainer = document.querySelector('.next-visits-list');
        if (!listContainer) return;
        
        // Limpar lista existente
        listContainer.innerHTML = '';
        
        // Filtrar apenas visitas futuras
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureVisits = visits.filter(visit => {
            const visitDate = new Date(visit.date);
            return visitDate >= today;
        });
        
        // Ordenar por data/hora
        futureVisits.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
        
        // Limitar a 5 visitas
        const nextVisits = futureVisits.slice(0, 5);
        
        // Adicionar à lista
        if (nextVisits.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'Nenhuma visita agendada.';
            listContainer.appendChild(emptyMessage);
        } else {
            nextVisits.forEach(visit => {
                const visitItem = document.createElement('li');
                visitItem.className = 'next-visit-item';
                
                // Formatar data
                const visitDate = new Date(visit.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                let dateText;
                if (visitDate.getTime() === today.getTime()) {
                    dateText = 'Hoje';
                } else if (visitDate.getTime() === today.getTime() + 86400000) {
                    dateText = 'Amanhã';
                } else {
                    dateText = visitDate.toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short'
                    });
                }
                
                // Criar elementos
                const dateElement = document.createElement('div');
                dateElement.className = 'next-visit-date';
                dateElement.textContent = `${dateText}, ${visit.time}`;
                
                const detailsElement = document.createElement('div');
                detailsElement.className = 'next-visit-details';
                detailsElement.textContent = `${visit.ongName} - ${visit.purpose}`;
                
                // Adicionar ao item
                visitItem.appendChild(dateElement);
                visitItem.appendChild(detailsElement);
                
                // Adicionar evento de clique
                visitItem.addEventListener('click', function() {
                    showVisitDetails(visit);
                });
                
                // Adicionar à lista
                listContainer.appendChild(visitItem);
            });
        }
    }
    
    // Mostrar detalhes da visita
    function showVisitDetails(visit) {
        alert(`Visita para ${visit.ongName}
Data: ${visit.date}
Hora: ${visit.time}
Objetivo: ${visit.purpose}
Observações: ${visit.notes || 'Nenhuma observação'}`);
        
        // Em uma implementação completa, você pode mostrar um modal
        // com mais detalhes e opções para editar/cancelar a visita
    }
});
