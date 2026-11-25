// Vincula ao usuário os dados sem dono (anteriores à autenticação): categorias, agentes e
// transações. Categorias/agentes com nome que o usuário já tem são mesclados nos dele.
// Uso: pnpm db:atribuir <email>   (a conta precisa existir; crie em /cadastro)
// No Docker: docker compose exec finance-web pnpm db:atribuir <email>
import './carregar-env';
import { atribuirDadosSemDono, buscarUsuarioPorEmail } from '../lib/db/repositorio';

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('Uso: pnpm db:atribuir <email>');

  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) throw new Error(`Usuário com e-mail "${email}" não encontrado. Crie a conta em /cadastro antes.`);

  const r = await atribuirDadosSemDono(usuario.id);
  console.log(`Dados sem dono vinculados a ${usuario.nome} <${usuario.email}>:`);
  console.log(`  categorias: ${r.categorias.vinculadas} vinculada(s), ${r.categorias.mescladas} mesclada(s) com as existentes`);
  console.log(`  agentes:    ${r.agentes.vinculados} vinculado(s), ${r.agentes.mesclados} mesclado(s) com os existentes`);
  console.log(`  transações: ${r.transacoes}`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
