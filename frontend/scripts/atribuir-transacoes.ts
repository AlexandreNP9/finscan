// Vincula as transações sem dono (registradas antes da autenticação) a um usuário.
// Uso: pnpm db:atribuir <email>   (a conta precisa existir; crie em /cadastro)
// No Docker: docker compose exec finance-web pnpm db:atribuir <email>
import './carregar-env';
import { atribuirTransacoesSemDono, buscarUsuarioPorEmail } from '../lib/db/repositorio';

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('Uso: pnpm db:atribuir <email>');

  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario) throw new Error(`Usuário com e-mail "${email}" não encontrado. Crie a conta em /cadastro antes.`);

  const total = await atribuirTransacoesSemDono(usuario.id);
  console.log(`${total} transação(ões) sem dono vinculada(s) a ${usuario.nome} <${usuario.email}>.`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
