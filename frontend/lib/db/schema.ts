import { bigint, date, index, integer, numeric, pgTable, serial, text, time, timestamp, unique } from 'drizzle-orm/pg-core';

// Listas editáveis pela UI (/categorias e /agentes), uma por usuário. `ordem` preserva a ordem
// definida por ele. O nome é único por dono; `usuario_id` null = dado anterior à autenticação,
// ainda não atribuído (`pnpm db:atribuir`). NULLS NOT DISTINCT mantém esses nomes únicos também.
export const categorias = pgTable(
  'categorias',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [
    unique('categorias_usuario_id_nome_unique').on(t.usuarioId, t.nome).nullsNotDistinct(),
    index('categorias_usuario_id_idx').on(t.usuarioId),
  ],
);

export const agentes = pgTable(
  'agentes',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [
    unique('agentes_usuario_id_nome_unique').on(t.usuarioId, t.nome).nullsNotDistinct(),
    index('agentes_usuario_id_idx').on(t.usuarioId),
  ],
);

// Contas de acesso. `email` é gravado normalizado (minúsculas, sem espaços); `senhaHash` é bcrypt.
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

// Sessões de login. O cookie guarda o token aleatório; aqui fica só o SHA-256 dele.
export const sessoes = pgTable(
  'sessoes',
  {
    id: serial('id').primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessoes_usuario_id_idx').on(t.usuarioId)],
);

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
  // Quem registrou a transação; cada usuário só enxerga as suas. Null = transação anterior à
  // autenticação, ainda não atribuída (ver `pnpm db:atribuir`).
  usuarioId: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('transacoes_usuario_id_idx').on(t.usuarioId)]);

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
