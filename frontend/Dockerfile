FROM node:22-alpine

WORKDIR /app

# Usa a versão do pnpm fixada em "packageManager" no package.json.
RUN corepack enable

# Copia os arquivos de dependência primeiro (melhora o cache do Docker).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --ignore-scripts: nenhuma dependência precisa de build nativo (bcryptjs é JS puro).
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copia o restante do código (.env e afins ficam de fora via .dockerignore:
# as variáveis chegam pelo docker-compose em tempo de execução).
COPY . .

RUN pnpm build

EXPOSE 3000

# Aplica as migrations pendentes do banco e inicia o servidor de produção.
CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
