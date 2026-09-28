# Estágio 1: Build
FROM node:22-alpine AS builder

# Habilita o pnpm nativamente no Node
RUN corepack enable && corepack prepare pnpm@latest --activate

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência primeiro (otimiza o cache do Docker)
COPY package.json pnpm-lock.yaml ./

# Instala as dependências de forma idêntica ao lockfile
RUN pnpm install --frozen-lockfile

# Copia todo o código fonte
COPY . .

# Faz o build da aplicação Vite para produção
RUN pnpm run build

# Estágio 2: Servidor Web (Nginx)
FROM nginx:alpine

# Remove a página padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia os arquivos compilados do estágio 1 para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta padrão da web
EXPOSE 80

# Inicia o servidor
CMD ["nginx", "-g", "daemon off;"]