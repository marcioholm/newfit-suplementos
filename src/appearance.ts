import { useEffect, useState } from 'react';

export type Appearance = 'auto' | 'light' | 'dark';
const KEY = 'newfit_appearance';

function read(): Appearance {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** Aplica a aparência no <html>: sem atributo = segue o aparelho. */
export function applyAppearance(value: Appearance) {
  const root = document.documentElement;
  if (value === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', value);

  // Cor da barra de status do navegador/app instalado acompanha a escolha
  const dark = value === 'dark' || (value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (value === 'auto') {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = dark ? '#000000' : '#F2F2F7';
}

// Aplica antes do React montar, para não piscar no tema errado
if (typeof window !== 'undefined') applyAppearance(read());

/** Preferência de aparência (Automático / Claro / Escuro), salva neste aparelho. */
export function useAppearance(): [Appearance, (v: Appearance) => void] {
  const [value, setValue] = useState<Appearance>(read);
  useEffect(() => {
    applyAppearance(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignora */
    }
  }, [value]);
  return [value, setValue];
}
