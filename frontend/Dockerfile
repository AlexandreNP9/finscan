# Usa a versão oficial do Node (Alpine é mais leve)
FROM node:20-alpine

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Instala o pnpm globalmente
RUN npm install -g pnpm

# Copia os arquivos de dependência primeiro (melhora o cache do Docker)
COPY package.json pnpm-lock.yaml ./

# Instala as dependências
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copia todo o resto do código para o contêiner
COPY . .

# Adicione esta linha para gerar o Prisma Client dentro do Docker:
RUN npx prisma generate

RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]

# Roda o build de produção do Next.js
RUN pnpm build

# Expõe a porta que o Next.js usa
EXPOSE 3000

# Comando para iniciar o servidor de produção
CMD ["pnpm", "start"]