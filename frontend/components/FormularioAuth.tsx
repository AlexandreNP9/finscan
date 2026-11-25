"use client";

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { destinoPosLogin } from '../lib/cliente';

type Modo = 'login' | 'cadastro';

const TEXTOS: Record<Modo, { titulo: string; subtitulo: string; botao: string; enviando: string; rota: string }> = {
  login: {
    titulo: 'Entrar',
    subtitulo: 'Acesse sua conta para ver suas finanças.',
    botao: 'Entrar',
    enviando: 'Entrando...',
    rota: '/api/auth/login',
  },
  cadastro: {
    titulo: 'Criar conta',
    subtitulo: 'Cadastre-se para registrar suas notas fiscais.',
    botao: 'Criar conta',
    enviando: 'Criando conta...',
    rota: '/api/auth/cadastro',
  },
};

const classeInput =
  'w-full border border-[#e2e5ea] rounded-lg bg-[#f9fafb] text-[#111827] text-sm px-3 py-2.5 outline-none focus:border-[#1d4ed8] focus:bg-white transition-all';
const classeLabel = 'block text-[10px] font-semibold text-[#6b7280] mb-2 tracking-widest uppercase';

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
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <p className="text-[26px] font-bold text-[#111827]">FinScan</p>
          <p className="text-[13px] text-[#6b7280] mt-1">{textos.subtitulo}</p>
        </div>

        <form onSubmit={enviar} className="bg-white rounded-2xl border border-[#e8eaed] shadow-sm p-6 space-y-4">
          <h1 className="text-[18px] font-bold text-[#111827]">{textos.titulo}</h1>

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
              value={senha} onChange={(e) => setSenha(e.target.value)} className={classeInput} />
            {modo === 'cadastro' && <p className="text-[11px] text-[#9ca3af] mt-1">Mínimo de 8 caracteres.</p>}
          </div>

          {erro && (
            <p role="alert" className="text-[12px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button type="submit" disabled={enviando}
            className="w-full bg-[#111827] text-white text-[14px] font-bold rounded-lg py-3 hover:bg-black disabled:opacity-50 transition-all">
            {enviando ? textos.enviando : textos.botao}
          </button>
        </form>

        <p className="text-center text-[13px] text-[#6b7280] mt-4">
          {outroModo.texto}{' '}
          <Link href={outroModo.href} className="font-semibold text-[#1d4ed8] hover:underline">{outroModo.link}</Link>
        </p>
      </div>
    </div>
  );
}
