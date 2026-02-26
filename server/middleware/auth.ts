import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-sgo-dev-2026';

export interface AuthRequest extends Request {
    usuarioId?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Pegar o header Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acesso negado: Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        req.usuarioId = decoded.id;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Acesso negado: Token inválido ou expirado.' });
    }
};
