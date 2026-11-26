import { type AnyPgColumn, bigint, boolean, date, index, integer, numeric, pgTable, serial, text, time, timestamp, unique } from 'drizzle-orm/pg-core';

// Listas editáveis pela UI (/categorias e /agentes), uma por dono. O dono é um usuário
// (lista pessoal: `usuario_id` preenchido, `grupo_id` null) ou um grupo (`grupo_id` preenchido,
// `usuario_id` null). Os dois null = dado anterior à autenticação, ainda não atribuído
// (`pnpm db:atribuir`). `ordem` preserva a ordem definida pelo dono. O nome é único por dono;
// NULLS NOT DISTINCT faz os nulls contarem como iguais nessa unicidade.
export const categorias = pgTable(
  'categorias',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),
    grupoId: integer('grupo_id').references((): AnyPgColumn => grupos.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [
    unique('categorias_dono_nome_unique').on(t.usuarioId, t.grupoId, t.nome).nullsNotDistinct(),
    index('categorias_usuario_id_idx').on(t.usuarioId),
    index('categorias_grupo_id_idx').on(t.grupoId),
  ],
);

export const agentes = pgTable(
  'agentes',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id').references(() => usuarios.id, { onDelete: 'cascade' }),
    grupoId: integer('grupo_id').references((): AnyPgColumn => grupos.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    ordem: integer('ordem').notNull().default(0),
  },
  (t) => [
    unique('agentes_dono_nome_unique').on(t.usuarioId, t.grupoId, t.nome).nullsNotDistinct(),
    index('agentes_usuario_id_idx').on(t.usuarioId),
    index('agentes_grupo_id_idx').on(t.grupoId),
  ],
);

// Contas de acesso. `email` é gravado normalizado (minúsculas, sem espaços); `senhaHash` é bcrypt.
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  // Objetivo do usuário com as categorias (ex.: "separar o essencial do supérfluo"), definido em
  // /categorias. Vai no prompt da IA para orientar sugestões de categorias novas. '' = não definido.
  objetivo: text('objetivo').notNull().default(''),
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
    // Contexto escolhido nesta sessão: null = conta pessoal; senão, o grupo que as telas mostram.
    grupoAtivoId: integer('grupo_ativo_id').references((): AnyPgColumn => grupos.id, { onDelete: 'set null' }),
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
  // Quem registrou a transação. Null = transação anterior à autenticação, ainda não atribuída
  // (ver `pnpm db:atribuir`).
  usuarioId: integer('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  // Grupo dono da transação; null = transação da conta pessoal de `usuario_id`.
  grupoId: integer('grupo_id').references((): AnyPgColumn => grupos.id, { onDelete: 'cascade' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('transacoes_usuario_id_idx').on(t.usuarioId), index('transacoes_grupo_id_idx').on(t.grupoId)]);

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

// Grupos de finanças compartilhadas (família, casal…). Têm transações, categorias, fontes pagadoras
// e objetivo próprios. O host gerencia membros e privilégios e pode transferir o papel; se ele sair
// sem transferir, o grupo é finalizado (`finalizado_em`) e fica somente leitura para todos.
export const grupos = pgTable('grupos', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  hostId: integer('host_id').references(() => usuarios.id, { onDelete: 'set null' }),
  // Código para entrar no grupo; o host pode gerar outro (o antigo deixa de valer).
  codigoConvite: text('codigo_convite').notNull().unique(),
  objetivo: text('objetivo').notNull().default(''),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  finalizadoEm: timestamp('finalizado_em', { withTimezone: true }),
});

// Participação de um usuário num grupo (o host também tem a sua linha). Ver é sempre permitido;
// os demais privilégios são dados pelo host. Quem sai (`saiu_em`) mantém acesso somente leitura
// ao que foi registrado até essa data.
export const membrosGrupo = pgTable(
  'membros_grupo',
  {
    id: serial('id').primaryKey(),
    grupoId: integer('grupo_id')
      .notNull()
      .references(() => grupos.id, { onDelete: 'cascade' }),
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    podeRegistrar: boolean('pode_registrar').notNull().default(true),
    podeEditarTodas: boolean('pode_editar_todas').notNull().default(false),
    podeGerenciarListas: boolean('pode_gerenciar_listas').notNull().default(false),
    podeConvidar: boolean('pode_convidar').notNull().default(false),
    entrouEm: timestamp('entrou_em', { withTimezone: true }).notNull().defaultNow(),
    saiuEm: timestamp('saiu_em', { withTimezone: true }),
  },
  (t) => [unique('membros_grupo_grupo_usuario_unique').on(t.grupoId, t.usuarioId), index('membros_grupo_usuario_id_idx').on(t.usuarioId)],
);
