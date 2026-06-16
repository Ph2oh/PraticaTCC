// Alteração Estrutural: Este contexto gerencia o estado de autenticação global.
// Ele armazena o token JWT no localStorage para manter a sessão ativa, e sincroniza entre abas.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface Usuario {
    id: string;
    nome: string;
    email: string;
    // Alteração estrutural: Flag `isAdmin` adicionada na tipagem para identificar o primeiro usuário e controlar níveis de acesso
    isAdmin?: boolean;
}

interface AuthContextType {
    token: string | null;
    usuario: Usuario | null;
    login: (token: string, usuario: Usuario) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const [token, setToken] = useState<string | null>(localStorage.getItem('sgo_token'));
    const [usuario, setUsuario] = useState<Usuario | null>(() => {
        const saved = localStorage.getItem('sgo_usuario');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (newToken: string, novoUsuario: Usuario) => {
        setToken(newToken);
        setUsuario(novoUsuario);
        localStorage.setItem('sgo_token', newToken);
        localStorage.setItem('sgo_usuario', JSON.stringify(novoUsuario));
    };

    const logout = () => {
        setToken(null);
        setUsuario(null);
        localStorage.removeItem('sgo_token');
        localStorage.removeItem('sgo_usuario');

        // Remove também residual do sessionStorage (apenas profilaxia)
        sessionStorage.removeItem('sgo_token');
        sessionStorage.removeItem('sgo_usuario');

        // Resetar o tema para o padrão do sistema para a tela de login não ficar com as cores do último usuário
        localStorage.removeItem('vite-ui-theme');
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        // Remover cores customizadas (HSL) injetadas no CSS
        root.style.removeProperty('--primary');

        queryClient.clear(); // Limpa TODO o cache da tela para não vazar pro próximo usuário
    };

    // Interceptador Global: se qualquer chamada de API retornar 401 ou 403, disparamos logout
    useEffect(() => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            if (response.status === 401 || response.status === 403) {
                const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
                if (url.includes('/api/')) {
                    window.dispatchEvent(new Event('auth:unauthorized'));
                }
            }
            return response;
        };

        return () => {
            window.fetch = originalFetch; // Cleanup ao desmontar
        };
    }, []);

    // Sincronização entre abas e tratamento de logout forçado
    useEffect(() => {
        const handleUnauthorized = () => {
            logout();
            window.location.href = "/";
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'sgo_token') {
                const newToken = e.newValue;

                if (!newToken) {
                    // Outra aba fez logout
                    setToken(null);
                    setUsuario(null);
                    queryClient.clear();
                    // Alteracao: redireciona para '/' (landing page) em vez de '/login'
                    // pois a landing page e agora a porta de entrada para usuarios nao autenticados.
                    window.location.href = "/"; // Forca ir para a landing, limpando refs de memoria
                } else {
                    // Outra aba fez login. Ponto de Cuidado Crítico (Vazamento Multi-Tenant)
                    // Nós não podemos apenas dar setToken(). Os Hooks Query continuarão com refetch ativo
                    // misturando listas de usuários. Precisamos matar a memória reativa: Reload.
                    const savedUsuario = localStorage.getItem('sgo_usuario');
                    setToken(newToken);
                    setUsuario(savedUsuario ? JSON.parse(savedUsuario) : null);
                    queryClient.clear();

                    // A recarga inteira garante que os requests HTTP iniciais (useQuery) 
                    // usarão de imediato o HEADER da conta nova.
                    setTimeout(() => {
                        window.location.reload();
                    }, 50);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, [queryClient]);

    return (
        <AuthContext.Provider value={{ token, usuario, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};
