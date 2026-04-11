// Alteracao Estrutural: Componente responsavel por proteger as rotas.
// Se o usuario nao tiver um token valido, ele sera redirecionado para a landing page ('/').
// A landing page serve como porta de entrada publica, com links para /login e /register.
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Alteracao: Redireciona para '/' (landing page) em vez de '/login',
        // pois a landing page e a porta de entrada correta para usuarios nao autenticados.
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
