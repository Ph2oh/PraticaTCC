// Alteração Estrutural: Componente responsável por proteger as rotas.
// Se o usuário não tiver um token válido, ele será redirecionado para /login.
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redireciona para o login e salva a rota que o usuário tentou acessar
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
