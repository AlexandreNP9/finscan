import PaginaLista from '../../components/PaginaLista';

export default function GerenciarCategorias() {
  return (
    <PaginaLista
      chave="categorias"
      titulo="Categorias"
      descricao="A IA usa esta lista para classificar os itens das suas notas. Remover uma categoria deixa os itens dela sem categoria."
      rotulo="Nova categoria"
      placeholder="Ex.: Pet Shop"
      vazio="Nenhuma categoria cadastrada."
    />
  );
}
