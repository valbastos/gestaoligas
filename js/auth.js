document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const loadingElement = document.getElementById('loading');
    
    // Verificar se já está logado
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // Verificar o perfil do usuário no Firestore
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        // Salvar dados do usuário
                        localStorage.setItem('userProfile', JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            role: userData.role,
                            name: userData.name,
                            ongId: userData.ongId || null,
                            ligaId: userData.ligaId || null
                        }));
                        
                        // Redirecionar com base no papel
                        redirectByRole(userData.role);
                    } else {
                        // Se o documento do usuário não existir
                        console.error("Documento do usuário não encontrado!");
                        localStorage.removeItem('userProfile');
                        showError("Erro ao carregar perfil do usuário.");
                    }
                })
                .catch(error => {
                    console.error("Erro ao buscar perfil do usuário:", error);
                    showError("Erro ao carregar perfil do usuário.");
                });
        }
    });
    
    // Login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Mostrar loading
        showLoading();
        
        // Autenticação com Firebase
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Buscar perfil do usuário
                return db.collection('users').doc(userCredential.user.uid).get();
            })
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    // Salvar dados do usuário
                    localStorage.setItem('userProfile', JSON.stringify({
                        uid: doc.id,
                        email: email,
                        role: userData.role,
                        name: userData.name,
                        ongId: userData.ongId || null,
                        ligaId: userData.ligaId || null
                    }));
                    
                    // Redirecionar com base no papel
                    redirectByRole(userData.role);
                } else {
                    throw new Error("Documento do usuário não encontrado!");
                }
            })
            .catch(error => {
                hideLoading();
                console.error("Erro de autenticação:", error);
                
                // Mostrar mensagem de erro amigável
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    showError("Email ou senha incorretos. Por favor, tente novamente.");
                } else if (error.code === 'auth/invalid-email') {
                    showError("Formato de email inválido.");
                } else if (error.code === 'auth/too-many-requests') {
                    showError("Muitas tentativas de login. Tente novamente mais tarde.");
                } else {
                    showError("Erro ao fazer login: " + error.message);
                }
            });
    });
    
    // Funções auxiliares
    function showLoading() {
        loadingElement.style.display = 'flex';
    }
    
    function hideLoading() {
        loadingElement.style.display = 'none';
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    function hideError() {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }
    
    function redirectByRole(role) {
        // Redirecionar com base no papel do usuário
        switch(role) {
            case 'superadm':
                window.location.href = 'dashboard-super-adm.html';
                break;
            case 'ong':
                window.location.href = 'dashboard-ong.html';
                break;
            case 'gestor':
                window.location.href = 'dashboard-liga.html';
                break;
            case 'mara':
                window.location.href = 'dashboard-mara.html';
                break;
            default:
                // Se o papel for desconhecido
                showError("Perfil de usuário inválido. Contate o administrador.");
                auth.signOut();
                localStorage.removeItem('userProfile');
        }
    }
});
