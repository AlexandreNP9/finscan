# 📊 FinScan

> Gestão financeira inteligente: escaneie notas fiscais, extraia os produtos da compra e use IA para descobrir seus reais padrões de consumo, do macro ao micro.

O **FinScan** é uma plataforma desenvolvida para resolver a falta de granularidade no rastreio de despesas pessoais. Em vez de registrar um gasto genérico (ex: "R$ 300 no Mercado"), o sistema automatiza a extração de itens de cupons fiscais e os categoriza usando Inteligência Artificial. 

O projeto adota uma arquitetura híbrida moderna, separando a interface de usuário de um motor robusto de automação e processamento de dados, oferecendo uma visão completa e detalhada da saúde financeira.

---

## ✨ Principais Funcionalidades

*   📷 **Leitura de QR Code:** Captura da URL da Nota Fiscal de Consumidor Eletrônica (NFC-e) diretamente pela câmera via navegador web.
*   🕷️ **Automação e Web Scraping:** Extração de descrições, quantidades e preços diretamente da SEFAZ, executada de forma assíncrona para não travar a interface.
*   🧠 **Categorização via IA:** Processamento de linguagem natural (LLM) para higienizar nomes de produtos abreviados (ex: `BISC RECH CHOC`) e alocá-los em categorias estruturadas.
*   📝 **Gestão de Despesas Manuais:** Módulo complementar para inserção de contas fixas e variáveis (aluguel, água, luz, assinaturas).
*   📈 **Dashboard Analítico:** Painel visual para cruzamento de gastos em múltiplos níveis (macro vs. micro).

---

## 🛠️ Stack Tecnológica e Arquitetura

Este projeto adota uma arquitetura desacoplada (Microsserviços) para garantir alta performance no processamento de dados e fluidez na interface:

**Frontend (Interface e UI):**
*   **Next.js / React:** Gerenciamento das telas e rotas de navegação, consumindo as APIs do backend.
*   **Bootstrap:** Utilizado para a componentização visual e prototipação ágil de interfaces limpas, acessíveis e totalmente responsivas.
*   **Bibliotecas JS:** Captura e processamento nativo de QR Codes diretamente pelo dispositivo do usuário.

**Backend (Processamento e Extração de Dados):**
*   **Python:** Linguagem central do motor de processamento, ideal para automação de tarefas e tratamento de dados complexos.
*   **FastAPI:** Framework assíncrono e de alto desempenho para construir a API que recebe as requisições do frontend e orquestra o scraping e a IA.
*   **BeautifulSoup / Playwright:** Bibliotecas utilizadas para a raspagem de dados estruturados das páginas governamentais.
*   **SDKs de LLM:** Integração nativa com modelos de Inteligência Artificial (Gemini/OpenAI) para classificação dos itens em JSON.

**Banco de Dados e Autenticação:**
*   **Supabase (PostgreSQL):** Responsável por todo o sistema de autenticação e pela modelagem relacional do banco de dados, desenhada para garantir a integridade das ligações estruturais (ex: Tabela `Transações` 1:N Tabela `Itens_Transacao`).

---

## 🚀 Como rodar o projeto localmente

cd finscan/Mobile\ Finance\ Management\ Form/
sudo npm install -g pnpm
pnpm install
pnpm dev

Aí é só rodar no link do localhost que aparecer.

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---
*Desenvolvido como projeto acadêmico de Projeto Integrador.*
*BCC5005 - Projeto Integrador, prof. PhD. Reginaldo Ré*