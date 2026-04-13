import { PrismaClient } from '@prisma/client';

// Compartilha uma única instância do Prisma Client em todo o escopo do servidor
// para evitar sobrecarga de conexões (Too many connections) no PostgreSQL
export const prisma = new PrismaClient();
