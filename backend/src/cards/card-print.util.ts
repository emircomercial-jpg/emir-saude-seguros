import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { resolveAssetPath } from '../common/utils/asset-path.util';

const LOGO_PATH = resolveAssetPath('logo-mark.png');

// Dimensões de um cartão físico padrão (formato ISO/IEC 7810 ID-1, o mesmo
// de um cartão bancário): 85.6mm × 53.98mm, convertido para pontos
// (1mm ≈ 2.8346pt). Gera-se sempre em orientação horizontal.
const CARD_WIDTH = 242.6;
const CARD_HEIGHT = 153.0;

// Gera o Cartão de Seguro em PDF, pronto a imprimir (tamanho real de
// cartão) — inclui o QR Code para validação rápida no atendimento.
export async function generateCardPdf(card: {
  cardNumber: string;
  qrCodeToken: string;
  expiryDate: Date;
  insuredMember: { fullName: string; internalNumber: string };
}): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(card.qrCodeToken, { margin: 0, width: 200 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: [CARD_WIDTH, CARD_HEIGHT] });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Fundo institucional azul, com uma faixa em degradê simples (PDFKit
    // não suporta gradientes CSS, por isso simula-se com dois rectângulos).
    doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).fill('#0F4C81');
    doc.rect(0, CARD_HEIGHT - 14, CARD_WIDTH, 14).fill('#5BB6E6');

    try {
      doc.image(LOGO_PATH, 10, 8, { width: 28 });
    } catch {
      // Nunca falhar a geração do cartão por falta do ficheiro do logótipo.
    }

    doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold')
      .text('EMIR SAÚDE SEGUROS', 44, 12, { width: CARD_WIDTH - 54 });
    doc.fontSize(6).font('Helvetica').fillColor('#D7E6F2')
      .text('Cartão de Seguro de Saúde', 44, 24, { width: CARD_WIDTH - 54 });

    doc.fontSize(6).fillColor('#B9D3E8').text('TITULAR', 12, 46);
    doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold')
      .text(card.insuredMember.fullName.toUpperCase(), 12, 55, { width: 150 });

    doc.fontSize(6).fillColor('#B9D3E8').text('Nº INTERNO', 12, 78);
    doc.fontSize(8).fillColor('#FFFFFF').font('Helvetica').text(card.insuredMember.internalNumber, 12, 86);

    doc.fontSize(6).fillColor('#B9D3E8').text('Nº DO CARTÃO', 12, 102);
    doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold').text(card.cardNumber, 12, 110);

    doc.fontSize(6).fillColor('#B9D3E8').text('VÁLIDO ATÉ', 12, 126);
    doc.fontSize(8).fillColor('#FFFFFF').font('Helvetica').text(card.expiryDate.toLocaleDateString('pt-PT'), 12, 134);

    // QR Code para validação rápida — o mesmo token usado em
    // GET /cards/validate?qrToken=...
    doc.image(qrBuffer, CARD_WIDTH - 62, 46, { width: 50, height: 50 });
    doc.fontSize(5).fillColor('#B9D3E8').text('Validar em atendimento', CARD_WIDTH - 70, 98, { width: 65, align: 'center' });

    doc.end();
  });
}
