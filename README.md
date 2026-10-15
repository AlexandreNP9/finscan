# 📊 FinScan - EM DESENVOLVIMENTO

> Gestão financeira inteligente: escaneie notas fiscais, extraia os produtos da compra e use IA para descobrir seus reais padrões de consumo, do macro ao micro.

O **FinScan** é uma plataforma desenvolvida para resolver a falta de granularidade no rastreio de despesas pessoais. Em vez de registrar um gasto genérico (ex: "R$ 300 no Mercado"), o sistema automatiza a extração de itens de cupons fiscais e os categoriza usando Inteligência Artificial. 

A partir desse projeto, espera-se oferecer uma visão completa e detalhada da saúde financeira.

---

## ✨ Principais Funcionalidades

*   📷 **Leitura de QR Code:** Captura da URL da Nota Fiscal de Consumidor Eletrônica (NFC-e) diretamente pela câmera via navegador web.
*   🕷️ **Automação e Web Scraping:** Extração de descrições, quantidades e preços diretamente da SEFAZ, executada de forma assíncrona para não travar a interface.
*   🧠 **Categorização via IA:** Processamento de linguagem natural (LLM) para higienizar nomes de produtos abreviados (ex: `BISC RECH CHOC`) e alocá-los em categorias estruturadas.
*   📝 **Gestão de Despesas Manuais:** Módulo complementar para inserção de contas fixas e variáveis (aluguel, água, luz, assinaturas).
*   📈 **Dashboard Analítico:** Painel visual para cruzamento de gastos em múltiplos níveis (macro vs. micro).

---

## 🛠️ Stack Tecnológica e Arquitetura

### Frontend
NextJS e Bootstrap

### Backend


---

## Como rodar frontend
cd frontend
pnpm dev

## 📄 Licença

Este projeto é distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---
*Desenvolvido como projeto acadêmico de Projeto Integrador.*
*BCC5005 - Projeto Integrador, prof. PhD. Reginaldo Ré*