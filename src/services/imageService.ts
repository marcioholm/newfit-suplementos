/**
 * Utilitários de imagem para as fotos dos personais.
 *
 * As fotos ficam salvas no localStorage do navegador (limite ~5 MB por site),
 * por isso toda foto é recortada em quadrado e comprimida antes de salvar.
 */

export const AVATAR_SIZE_PX = 320;
const AVATAR_JPEG_QUALITY = 0.82;
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB (fotos de celular)

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler esta imagem. Use uma foto JPG ou PNG.'));
    };
    img.src = url;
  });
}

/**
 * Recorta a imagem no centro em formato quadrado, reduz para AVATAR_SIZE_PX
 * e devolve um data URL JPEG (~15–35 KB).
 */
export async function resizeImageToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Imagem muito grande (máx. 15 MB).');
  }

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new Error('Imagem inválida.');

  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE_PX;
  canvas.height = AVATAR_SIZE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não permite processar imagens.');

  // Fundo escuro caso a imagem tenha transparência (PNG)
  ctx.fillStyle = '#16171B';
  ctx.fillRect(0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);

  return canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY);
}

/**
 * Avatar com as iniciais do nome, gerado localmente (sem serviço externo).
 */
export function initialsAvatar(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  const raw = (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
  // Só letras/números: evita quebrar o SVG com caracteres como < ou &
  const initials = raw.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase() || '?';

  // Estilo do app Contatos: círculo cinza em degradê com iniciais brancas (bom no claro e no escuro)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#A5A9B3"/><stop offset="1" stop-color="#858994"/></linearGradient></defs>` +
    `<rect width="100" height="100" fill="url(#g)"/>` +
    `<text x="50" y="50" dy=".35em" text-anchor="middle" ` +
    `font-family="-apple-system,BlinkMacSystemFont,'SF Pro Rounded',system-ui,Helvetica,Arial,sans-serif" ` +
    `font-size="40" font-weight="600" fill="#FFFFFF">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Foto do personal ou, na falta dela, as iniciais. */
export function avatarSrc(personal: { name: string; avatarUrl?: string }): string {
  return personal.avatarUrl || initialsAvatar(personal.name);
}
