// Helpers usados pelas páginas (client components).

/**
 * `fetch` para as rotas /api. Se a sessão tiver expirado (401), manda para o login, voltando
 * depois para a página atual.
 */
export async function buscarApi(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401 && typeof window !== 'undefined') {
    const atual = window.location.pathname + window.location.search;
    window.location.replace(`/login?proximo=${encodeURIComponent(atual)}`);
    // Não resolve: a página vai ser trocada, e quem chamou não deve tratar a resposta.
    return new Promise<Response>(() => {});
  }
  return res;
}

/** Destino pós-login vindo de `?proximo=`; só aceita caminhos internos (evita open redirect). */
export function destinoPosLogin(): string {
  const proximo = new URLSearchParams(window.location.search).get('proximo');
  return proximo && proximo.startsWith('/') && !proximo.startsWith('//') && !proximo.startsWith('/\\')
    ? proximo
    : '/';
}
