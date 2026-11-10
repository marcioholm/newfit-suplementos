import { Personal } from '../types';

/** Texto que o personal envia aos alunos para divulgar o cupom. */
export const referralText = (code: string) =>
  `Fala atleta! Na New Fit Suplementos você ganha desconto especial usando meu cupom oficial: *${code}* 💪 Passe lá no balcão e aproveite!`;

/** Link do portal do personal, já abrindo no espaço dele. */
export const portalUrl = (personal?: Pick<Personal, 'code'>) => {
  const url = new URL(window.location.origin + '/');
  url.searchParams.set('portal', 'personal');
  if (personal) url.searchParams.set('code', personal.code);
  return url.toString();
};

/** Compartilhamento nativo (iPhone/Android); sem suporte, copia o texto. */
export async function shareOrCopy(data: { title: string; text: string; url?: string }): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share(data);
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(data.url ? `${data.text}\n${data.url}` : data.text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
