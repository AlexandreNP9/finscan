// Acrescenta categorias às contas e grupos que já existem (as contas e grupos novos já recebem
// CATEGORIAS_PADRAO na criação). Por padrão, só as categorias que entraram depois na lista padrão,
// para não trazer de volta categorias que alguém apagou de propósito. Entram antes de "Outros".
// Pode rodar de novo sem duplicar: quem já tem o nome é pulado. Grupos finalizados ficam de fora.
// Uso: pnpm db:categorias-padrao [--simular] [nome ...]
// No Docker: docker compose exec app pnpm db:categorias-padrao --simular
import './carregar-env';
import { acrescentarCategoriasAosExistentes } from '../lib/db/repositorio';

// Categorias que entraram em CATEGORIAS_PADRAO depois que já havia contas (PR #109).
const NOVAS_PADRAO = ['Moradia', 'Contas da casa', 'Doações'];

async function main() {
  const args = process.argv.slice(2);
  const simular = args.includes('--simular');
  const nomes = args.filter((a) => a !== '--simular');
  const alvo = nomes.length > 0 ? nomes : NOVAS_PADRAO;

  const r = await acrescentarCategoriasAosExistentes(alvo, simular);
  console.log(`${simular ? '[simulação] ' : ''}Categorias: ${alvo.join(', ')}`);
  console.log(`${r.donos} conta(s)/grupo(s) ativos analisados; ${r.alterados.length} ${simular ? 'receberiam' : 'receberam'} categorias:`);
  for (const a of r.alterados) console.log(`  ${a.dono}: ${a.nomes.join(', ')}`);
  if (simular && r.alterados.length > 0) console.log('Nada foi gravado. Rode sem --simular para aplicar.');
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
