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

### Infraestrutura e DevOps
*    Gerenciador de Pacotes: `pnpm`
*    Containerização: Docker e Docker Compose.

---

## 🚀 Como rodar o frontend
### Rode o docker-compose
```bash
cd finscan/frontend   
docker-compose up --build -d
```

Pode ser que precise usar o ```sudo``` no Linux

### Acesse a aplicação
* No computador, acessar no 
```bash
http://localhost:3000
```

* No celular: em um terminal, crie um túnel seguro rodando e acesse o link HTTPS gerado.
```bash
npx localtunnel --port 3000
``` 

* *Alternativa mais estávelpara o celular*: fazer um ssh com o pinggy.io rodando 
```bash
ssh -p 443 -R0:localhost:3000 a.pinggy.io
```

### Comandos úteis:

Para visualizar os logs da API de scraping: ```docker-compose logs -f```

Para derrubar a aplicação: ```docker-compose down```

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---
*Desenvolvido como projeto acadêmico de Projeto Integrador.*  
*BCC5005 - Projeto Integrador, prof. PhD. Reginaldo Ré*