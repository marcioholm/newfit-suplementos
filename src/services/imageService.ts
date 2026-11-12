/**
 * Utilitários de imagem para as fotos dos personais.
 *
 * As fotos ficam salvas no localStorage do navegador (limite ~5 MB por site),
 * por isso toda foto é recortada em quadrado e comprimida antes de salvar.
 */

export const AVATAR_SIZE_PX = 256;
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB (fotos de celular)
// Limite seguro de caracteres base64 para caber sempre no Google Sheets (< 50 mil) e no n8n (< 45 mil)
const MAX_BASE64_LENGTH = 38000;

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
 * Recorta a imagem no centro em formato quadrado, reduz e comprime em JPEG.
 * Ajusta resolução/qualidade para garantir que a foto nunca ultrapasse
 * o limite do Google Sheets (< 50 mil caracteres) nem do n8n (< 45 mil caracteres).
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
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não permite processar imagens.');

  // Tenta tamanhos e qualidades decrescentes até ficar abaixo de MAX_BASE64_LENGTH (~28 KB JPEG)
  const steps = [
    { size: 256, quality: 0.8 },
    { size: 240, quality: 0.74 },
    { size: 200, quality: 0.72 },
    { size: 180, quality: 0.65 },
    { size: 150, quality: 0.6 }
  ];

  let bestDataUrl = '';
  for (const step of steps) {
    canvas.width = step.size;
    canvas.height = step.size;
    ctx.fillStyle = '#16171B';
    ctx.fillRect(0, 0, step.size, step.size);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, step.size, step.size);

    bestDataUrl = canvas.toDataURL('image/jpeg', step.quality);
    if (bestDataUrl.length <= MAX_BASE64_LENGTH) {
      return bestDataUrl;
    }
  }

  return bestDataUrl;
}

const initialsCache = new Map<string, string>();

/**
 * Avatar com as iniciais do nome, gerado localmente (sem serviço externo).
 */
export function initialsAvatar(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  const raw = (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
  // Só letras/números: evita quebrar o SVG com caracteres como < ou &
  const initials = raw.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase() || '?';

  const cached = initialsCache.get(initials);
  if (cached) return cached;

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

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  initialsCache.set(initials, dataUri);
  return dataUri;
}

/** Foto do personal ou, na falta dela, as iniciais. */
export function avatarSrc(personal: { name: string; avatarUrl?: string }): string {
  return personal.avatarUrl || initialsAvatar(personal.name);
}
