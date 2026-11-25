import { bigint, date, index, integer, numeric, pgTable, serial, text, time, timestamp } from 'drizzle-orm/pg-core';

// Listas editáveis pela UI (/categorias e /agentes). `ordem` preserva a ordem definida pelo usuário.
export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull().unique(),
  ordem: integer('ordem').notNull().default(0),
});

export const agentes = pgTable('agentes', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull().unique(),
  ordem: integer('ordem').notNull().default(0),
});

export const transacoes = pgTable('transacoes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  chaveAcesso: text('chave_acesso'),
  estabelecimento: text('estabelecimento').notNull().default(''),
  valorTotal: numeric('valor_total', { precision: 12, scale: 2 }).notNull().default('0'),
  desconto: numeric('desconto', { precision: 12, scale: 2 }).notNull().default('0'),
  dataEmissao: date('data_emissao', { mode: 'string' }),
  horaEmissao: time('hora_emissao'),
  // Remover um agente da lista não apaga as transações; elas ficam sem agente.
  agenteId: integer('agente_id').references(() => agentes.id, { onDelete: 'set null' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const itens = pgTable(
  'itens',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    transacaoId: bigint('transacao_id', { mode: 'number' })
      .notNull()
      .references(() => transacoes.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull().default(0),
    codigo: text('codigo'),
    descricao: text('descricao').notNull(),
    qtd: numeric('qtd', { precision: 15, scale: 4 }).notNull().default('1'),
    un: text('un').notNull().default('UN'),
    vlUnit: numeric('vl_unit', { precision: 21, scale: 10 }).notNull().default('0'),
    vlTotal: numeric('vl_total', { precision: 12, scale: 2 }).notNull().default('0'),
    // null = item ainda não categorizado (aparece em /categorizar).
    // Remover uma categoria da lista devolve seus itens para "não categorizado".
    categoriaId: integer('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),
  },
  (t) => [index('itens_transacao_id_idx').on(t.transacaoId), index('itens_categoria_id_idx').on(t.categoriaId)],
);
