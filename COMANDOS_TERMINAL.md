# Comandos importantes do projeto

## Execução da aplicação

- Instalar dependências:
  - `npm install`
- Rodar apenas o frontend (Vite):
  - `npm run dev`
- Rodar apenas a API (Express + TSX):
  - `npm run dev:server`
- Rodar frontend + API ao mesmo tempo:
  - `npm run dev:all`

## Banco de dados (Prisma)

- Gerar/regerar o client Prisma:
  - `npx prisma generate`
- Visualizar BD prisma:
    `npx prisma studio`
- Criar migração e aplicar no banco local:
  - `npx prisma migrate dev --name "nome-da-migracao"`
- Resetar banco e reaplicar migrações (apaga dados):
  - `npx prisma migrate reset --force`
- Popular o banco com dados iniciais:
  - `npm run seed`

## Qualidade e build

- Rodar lint:
  - `npm run lint`
- Rodar testes (uma vez):
  - `npm run test`
- Rodar testes em modo watch:
  - `npm run test:watch`
- Build de produção:
  - `npm run build`
- Build de desenvolvimento:
  - `npm run build:dev`
- Preview do build:
  - `npm run preview`

## Diagnóstico rápido de porta ocupada (Windows / PowerShell)

- Ver processo na porta 3001 (API):
  - `Get-NetTCPConnection -LocalPort 3001 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess`
- Encerrar processo pelo PID:
  - `Stop-Process -Id <PID> -Force`

## Fluxo recomendado para subir tudo do zero

1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate dev --name "init-local"` (se necessário)
4. `npm run seed`
5. `npm run dev:all`
