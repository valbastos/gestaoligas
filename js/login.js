document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Credenciais simplificadas para demonstração
        const users = {
            'superadm': { password: 'senha123', role: 'superadm' },
            'ong': { password: 'senha123', role: 'ong' },
            'gestor': { password: 'senha123', role: 'gestor' },
            'mara': { password: 'senha123', role: 'mara' }
        };
        
        if (users[username] && users[username].password === password) {
            // Login bem-sucedido
            localStorage.setItem('currentUser', JSON.stringify({
                username: username,
                role: users[username].role
            }));
            
            // Redirecionar com base no papel do usuário
            switch(users[username].role) {
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
            }
        } else {
            // Login falhou
            alert('Usuário ou senha incorretos');
        }
    });
});
