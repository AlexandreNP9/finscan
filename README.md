# 📊 FinScan - EM DESENVOLVIMENTO

> Gestão financeira inteligente: escaneie notas fiscais, extraia os produtos da compra e use IA para descobrir seus reais padrões de consumo, do macro ao micro.

O **FinScan** é uma plataforma desenvolvida para resolver a falta de granularidade no rastreio de despesas pessoais. Em vez de registrar um gasto genérico (ex: "R$ 300 no Mercado"), o sistema automatiza a extração de itens de cupons fiscais e os categoriza usando Inteligência Artificial. 

A partir desse projeto, espera-se oferecer uma visão completa e detalhada da saúde financeira.

---

## ✨ Principais Funcionalidades

-    📷 **Leitura de QR Code:** Captura da URL da Nota Fiscal de Consumidor Eletrônica (NFC-e) diretamente pela câmera via navegador web.
-    🕷️ **Automação e Web Scraping:** Extração de descrições, quantidades e preços diretamente da SEFAZ, executada de forma assíncrona para não travar a interface.
-    🔄 **Fluxo de Captura Inteligente (Wizard):** Interface dividida em 3 etapas (Captura, Revisão Fiscal e Enriquecimento) para reduzir a sobrecarga cognitiva do usuário.
-    🧠 **Categorização via IA:** Processamento de linguagem natural (LLM) para higienizar nomes de produtos abreviados (ex: `BISC RECH CHOC`) e alocá-los em categorias estruturadas.
-    📝 **Gestão de Despesas Manuais:** Módulo complementar para inserção de contas fixas e variáveis (aluguel, água, luz, assinaturas).
-    📈 **Dashboard Analítico:** Painel visual para cruzamento de gastos em múltiplos níveis (macro vs. micro).

---

## 🛠️ Stack Tecnológica e Arquitetura

### Frontend
*    Next.js 16
*    Estilização: Tailwind CSS
*    Leitura de QR Code: `@yudiel/react-qr-scanner`

### Backend
*    Rotas de API: Next.js Route Handlers (`/api/sefaz`).
*    Extração de Dados: Cheerio (Faz o parsing do HTML da SEFAZ no lado do servidor, contornando bloqueios de CORS e extraindo itens via seletores CSS específicos).
*    Banco de Dados: PostgreSQL 16, acessado via Drizzle ORM (schema em `frontend/lib/db/schema.ts`, migrations em `frontend/drizzle/`).

### Infraestrutura e DevOps
*    Gerenciador de Pacotes: `pnpm`
*    Containerização: Docker e Docker Compose.

---

## 🚀 Como rodar com Docker

Pré-requisitos: [Docker](https://docs.docker.com/get-docker/) com o plugin Docker Compose v2 (comando `docker compose`) e Git. Não é preciso instalar Node, pnpm nem PostgreSQL.

```bash
git clone https://github.com/AlexandreNP9/finscan.git
cd finscan
cp .env.example .env          # opcional: preencha GEMINI_API_KEY para habilitar a IA
docker compose up --build -d
```

> No Linux pode ser preciso usar `sudo docker compose ...`.

O primeiro build leva alguns minutos. O compose sobe o PostgreSQL e, quando o banco estiver pronto, o app aplica as migrations sozinho e começa a responder em **http://localhost:3000**.

### Primeiro acesso
1. Abra http://localhost:3000. Você será levado para a tela de login.
2. Clique em **Criar conta** e cadastre nome, e-mail e senha. A conta já vem com as categorias padrão.
3. Em **Agentes**, cadastre ao menos uma fonte de pagamento (ex.: "Cartão de crédito"). Ela é necessária para registrar uma nota.
4. Em **Nova transação**, escaneie o QR Code de uma NFC-e ou cole o HTML da página da SEFAZ.
5. Em **Categorizar**, use a IA para limpar os nomes dos produtos e classificá-los. Essa é a única parte que exige `GEMINI_API_KEY`. Sem a chave, o app mostra um aviso.

Para ativar a IA depois de subir: gere uma chave em https://aistudio.google.com/app/apikey, coloque em `GEMINI_API_KEY` no `.env` da raiz e rode `docker compose up -d`.

### Comandos úteis
```bash
docker compose logs -f app   # logs do app (scraping, API, IA)
docker compose down          # para tudo (os dados ficam salvos no volume)
docker compose down -v       # para tudo e APAGA o banco (recomeça do zero)
```

Se a porta 3000 ou 5433 já estiver em uso, altere o lado esquerdo de `ports` em `docker-compose.yml`.

### Acesso pelo celular
A leitura do QR Code pela câmera exige HTTPS. Com o app rodando, crie um túnel e abra o link HTTPS gerado:
```bash
npx localtunnel --port 3000
# ou, mais estável:
ssh -p 443 -R0:localhost:3000 a.pinggy.io
```

---

## 🧑‍💻 Desenvolvimento (sem Docker para o app)

Suba só o banco e rode o Next.js localmente (Node 20.9+ e pnpm):
```bash
docker compose up -d db
cd frontend
```
Crie `frontend/.env` com:
```bash
DATABASE_URL=postgresql://finscan:finscan@localhost:5433/finscan
GEMINI_API_KEY=sua-chave
```
E então:
```bash
pnpm install
pnpm db:migrate   # aplica as migrations
pnpm dev
```
Ao alterar `frontend/lib/db/schema.ts`, gere uma nova migration com `pnpm db:generate`.

### Importar os dados antigos (opcional, uma vez)
Para levar as transações, categorias e agentes de `frontend/data/*.json` para a conta de um usuário já cadastrado:
```bash
docker compose exec app pnpm db:seed seu@email.com
```

---

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---
*Desenvolvido como projeto acadêmico de Projeto Integrador.*  
*BCC5005 - Projeto Integrador, prof. PhD. Reginaldo Ré*