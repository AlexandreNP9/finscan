"use client";

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { destinoPosLogin } from '../lib/cliente';
import Aviso from './Aviso';
import Botao, { Spinner } from './Botao';

type Modo = 'login' | 'cadastro';

const TEXTOS: Record<Modo, { titulo: string; subtitulo: string; botao: string; enviando: string; rota: string }> = {
  login: {
    titulo: 'Entrar',
    subtitulo: 'Acesse sua conta para ver suas finanças.',
    botao: 'Entrar',
    enviando: 'Entrando…',
    rota: '/api/auth/login',
  },
  cadastro: {
    titulo: 'Criar conta',
    subtitulo: 'Cadastre-se para registrar suas notas fiscais.',
    botao: 'Criar conta',
    enviando: 'Criando conta…',
    rota: '/api/auth/cadastro',
  },
};

const classeInput =
  'w-full min-h-11 rounded-lg border border-linha-forte bg-superficie px-3 text-[15px] outline-none focus:border-acao';
const classeLabel = 'block text-[13px] font-medium text-texto-2 mb-1.5';

export default function FormularioAuth({ modo }: { modo: Modo }) {
  const textos = TEXTOS[modo];
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const corpo = modo === 'cadastro' ? { nome, email, senha } : { email, senha };
      const res = await fetch(textos.rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const data = await res.json();
      if (!data.sucesso) {
        setErro(data.erro || 'Não foi possível continuar.');
        return;
      }
      // Navegação completa para o proxy já enxergar o cookie novo.
      window.location.replace(destinoPosLogin());
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setEnviando(false);
    }
  };

  const outroModo = modo === 'login'
    ? { texto: 'Ainda não tem conta?', link: 'Criar conta', href: '/cadastro' }
    : { texto: 'Já tem conta?', link: 'Entrar', href: '/login' };

  return (
    <main className="flex-1 flex items-start md:items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-[17px] font-semibold tracking-tight">FinScan</p>
        <h1 className="mt-8 text-[24px] font-semibold tracking-tight">{textos.titulo}</h1>
        <p className="mt-1 text-texto-2">{textos.subtitulo}</p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          {modo === 'cadastro' && (
            <div>
              <label htmlFor="nome" className={classeLabel}>Nome</label>
              <input id="nome" type="text" autoComplete="name" required maxLength={100}
                value={nome} onChange={(e) => setNome(e.target.value)} className={classeInput} />
            </div>
          )}

          <div>
            <label htmlFor="email" className={classeLabel}>E-mail</label>
            <input id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} className={classeInput} />
          </div>

          <div>
            <label htmlFor="senha" className={classeLabel}>Senha</label>
            <input id="senha" type="password" required
              autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
              minLength={modo === 'cadastro' ? 8 : undefined} maxLength={72}
              aria-describedby={modo === 'cadastro' ? 'dica-senha' : undefined}
              value={senha} onChange={(e) => setSenha(e.target.value)} className={classeInput} />
            {modo === 'cadastro' && <p id="dica-senha" className="text-[13px] text-texto-3 mt-1.5">Mínimo de 8 caracteres.</p>}
          </div>

          {erro && <Aviso tipo="erro">{erro}</Aviso>}

          <Botao type="submit" disabled={enviando} className="w-full min-h-12">
            {enviando ? <><Spinner /> {textos.enviando}</> : textos.botao}
          </Botao>
        </form>

        <p className="mt-6 text-[15px] text-texto-2">
          {outroModo.texto}{' '}
          <Link href={outroModo.href} className="font-semibold text-acao hover:underline underline-offset-2">{outroModo.link}</Link>
        </p>
      </div>
    </main>
  );
}
