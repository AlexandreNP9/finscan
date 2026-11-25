import { NextResponse, type NextRequest } from 'next/server';

// Checagem otimista de autenticação (só verifica se o cookie existe). A validação real da sessão
// é feita no banco por `exigirUsuario()` em cada route handler (lib/auth.ts).
// O nome do cookie é repetido aqui de propósito: lib/auth.ts é `server-only` e acessa o banco.
const COOKIE_SESSAO = 'finscan_sessao';

const PAGINAS_PUBLICAS = new Set(['/login', '/cadastro']);
const API_PUBLICA = new Set(['/api/auth/login', '/api/auth/cadastro']);
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

function json401() {
  return NextResponse.json({ sucesso: false, erro: 'Não autenticado' }, { status: 401 });
}

/** Rejeita requisições que alteram dados vindas de outro site (CSRF), quando o navegador informa a origem. */
function origemInvalida(request: NextRequest): boolean {
  if (METODOS_SEGUROS.has(request.method)) return false;
  const origem = request.headers.get('origin');
  if (!origem) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origem).host !== host;
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const ehApi = pathname.startsWith('/api/');
  const logado = request.cookies.has(COOKIE_SESSAO);

  if (ehApi && origemInvalida(request)) {
    return NextResponse.json({ sucesso: false, erro: 'Origem não permitida' }, { status: 403 });
  }

  if (ehApi) {
    return API_PUBLICA.has(pathname) || logado ? NextResponse.next() : json401();
  }

  if (PAGINAS_PUBLICAS.has(pathname)) {
    return logado ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (!logado) {
    const login = new URL('/login', request.url);
    login.searchParams.set('proximo', pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // Tudo, exceto assets do Next e arquivos com extensão (public/, favicon.ico).
  matcher: ['/((?!_next/static|_next/image|.*\\.[^/]+$).*)'],
};
