#!/bin/bash
# Script de Atualização Rápida para Produção - SGO SaaS

echo "Iniciando atualização automática do SGO..."

# Puxa o código mais recente
echo "Baixando código do GitHub..."
git pull origin develop

# Instala novos pacotes (se houver)
echo " Instalando dependências..."
npm install

# Atualiza configurações de banco
echo " Atualizando Banco de Dados..."
npx prisma generate
npx prisma migrate deploy

# Compila o frontend React
echo " Compilando a nova interface..."
npm run build

# Reinicia a aplicação sem tempo de inatividade
echo " Reiniciando o motor PM2..."
pm2 restart ecosystem.config.cjs

echo " Atualização concluída com sucesso! Seu site já está com a nova versão no ar."
