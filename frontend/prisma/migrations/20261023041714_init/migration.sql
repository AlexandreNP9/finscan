-- CreateTable
CREATE TABLE "Agente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transacao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "valorPago" DECIMAL(10,2) NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "agenteId" TEXT NOT NULL,
    "chaveAcesso" TEXT,
    "estabelecimentoNome" TEXT,
    "estabelecimentoCnpj" TEXT,
    "estabelecimentoEndereco" TEXT,
    "numeroNota" TEXT,
    "serieNota" TEXT,
    "protocoloAutorizacao" TEXT,
    "valorBruto" DECIMAL(10,2),
    "valorDesconto" DECIMAL(10,2),
    "formaPagamentoOriginal" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,4) NOT NULL,
    "valorUnitario" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "codigoProduto" TEXT,
    "unidadeMedida" TEXT,
    "transacaoId" TEXT NOT NULL,
    "categoriaId" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Transacao_chaveAcesso_key" ON "Transacao"("chaveAcesso");

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
