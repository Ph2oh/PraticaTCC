// Alteração Estrutural: Este contexto gerencia o estado de autenticação global.
// Ele armazena o token JWT no localStorage para manter a sessão ativa, e sincroniza entre abas.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface Usuario {
    id: string;
    nome: string;
    email: string;
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

        queryClient.clear(); // Limpa TODO o cache da tela para não vazar pro próximo usuário
    };

    // Sincronização entre abas: O navegador dispara o evento 'storage' em TODAS as abas 
    // quando o localStorage é alterado por UMA das abas.
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'sgo_token') {
                const newToken = e.newValue;

                if (!newToken) {
                    // Outra aba fez logout
                    setToken(null);
                    setUsuario(null);
                    queryClient.clear();
                    window.location.href = "/login"; // Força ir pro login, limpando refs de memória
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
        return () => window.removeEventListener('storage', handleStorageChange);
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
