// Importa os dados antigos de data/*.json para o Postgres (uso único).
// Uso: pnpm db:seed [email]   (requer DATABASE_URL e as migrations já aplicadas)
//
// Com `email` (de uma conta já criada em /cadastro), as transações importadas ficam vinculadas a
// esse usuário. Sem ele, ficam sem dono e só aparecem depois de `pnpm db:atribuir <email>`.
//
// Categorias e agentes são acrescentados à lista do dono (nomes que ele já tem são mantidos).
// Transações só são importadas se a tabela estiver vazia, para o script não duplicar dados se
// rodar de novo.
import './carregar-env';
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { agentes, categorias, transacoes } from '../lib/db/schema';
import { acrescentarNomes, buscarUsuarioPorEmail, criarTransacao, escopoPessoal } from '../lib/db/repositorio';

function lerJson<T>(arquivo: string): T {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', arquivo), 'utf8'));
}

async function main() {
  const email = process.argv[2];
  let usuarioId: number | null = null;
  if (email) {
    const usuario = await buscarUsuarioPorEmail(email);
    if (!usuario) throw new Error(`Usuário com e-mail "${email}" não encontrado. Crie a conta em /cadastro antes.`);
    usuarioId = usuario.id;
  }

  const nomesCategorias = lerJson<string[]>('categorias.json');
  const nomesAgentes = lerJson<string[]>('agentes.json');
  const transacoesJson = lerJson<Record<string, unknown>[]>('transacoes.json');

  // Os itens já salvos podem referenciar categorias/agentes que foram removidos das listas;
  // eles são adicionados ao final para não perder a informação.
  const categoriasUsadas = transacoesJson.flatMap((t) =>
    ((t.items as { categoria?: string }[]) ?? []).map((i) => i.categoria ?? ''),
  );
  const agentesUsados = transacoesJson.map((t) => String(t.agenteOrigem ?? ''));
  const todasCategorias = [...new Set([...nomesCategorias, ...categoriasUsadas].map((n) => n.trim()).filter(Boolean))];
  const todosAgentes = [...new Set([...nomesAgentes, ...agentesUsados].map((n) => n.trim()).filter(Boolean))];

  // Com e-mail, vão para a lista desse usuário (que já tem as categorias padrão); sem, ficam sem dono.
  await acrescentarNomes(categorias, todasCategorias, escopoPessoal(usuarioId));
  await acrescentarNomes(agentes, todosAgentes, escopoPessoal(usuarioId));
  console.log(`Categorias: ${todasCategorias.length}, agentes: ${todosAgentes.length}`);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(transacoes);
  if (total > 0) {
    console.log(`Tabela transacoes já tem ${total} registro(s); transações não foram importadas.`);
    return;
  }

  // O JSON guarda a mais recente primeiro; inserimos de trás para frente para manter a mesma ordem
  // (a API lista por id decrescente).
  for (const t of [...transacoesJson].reverse()) {
    await criarTransacao(t, escopoPessoal(usuarioId));
  }
  console.log(`Transações importadas: ${transacoesJson.length}${email ? ` (vinculadas a ${email})` : ' (sem dono)'}`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
