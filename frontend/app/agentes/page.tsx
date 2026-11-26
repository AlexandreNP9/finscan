import PaginaLista from '../../components/PaginaLista';
import { SUGESTOES_AGENTES } from '../../lib/sugestoes';

export default function GerenciarAgentes() {
  return (
    <PaginaLista
      chave="agentes"
      titulo="Fontes pagadoras"
      descricao="Contas, cartões e carteiras de onde sai o dinheiro das suas compras."
      rotulo="Nova fonte pagadora"
      placeholder="Ex.: Cartão Inter"
      sugestoes={SUGESTOES_AGENTES}
      vazio="Nenhuma fonte pagadora cadastrada."
    />
  );
}
