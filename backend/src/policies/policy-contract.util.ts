import PDFDocument from 'pdfkit';
import { resolveAssetPath } from '../common/utils/asset-path.util';

const LOGO_PATH = resolveAssetPath('logo.png');

// Gera o documento do contrato de apólice em PDF (secção 7 do briefing
// original), incluindo o hash da assinatura digital quando já assinada —
// permitindo a qualquer pessoa conferir a integridade do documento.
export function generatePolicyContractPdf(policy: {
  policyNumber: string;
  plan: { name: string; monthlyValue: unknown };
  company?: { legalName: string } | null;
  members: { insuredMember: { fullName: string; internalNumber: string } }[];
  startDate: Date;
  endDate: Date;
  value: unknown;
  paymentMode: string;
  signatureHash?: string | null;
  signedAt?: Date | null;
  signedByName?: string | null;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.image(LOGO_PATH, doc.page.width / 2 - 40, doc.y, { width: 80 });
      doc.moveDown(5.5);
    } catch {
      // Nunca falhar a geração do contrato por falta do ficheiro do logótipo.
    }

    doc.fontSize(18).fillColor('#0F4C81').text('EMIR SAÚDE SEGUROS', { align: 'center' });
    doc.fontSize(11).fillColor('#5F6B76').text('EMIR PHARMA JULIETA LDA', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).fillColor('#000000').text(`Contrato de Apólice ${policy.policyNumber}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).fillColor('#000000');
    doc.text(`Plano: ${policy.plan.name}`);
    doc.text(`Titular: ${policy.company?.legalName || 'Apólice individual'}`);
    doc.text(`Início de cobertura: ${policy.startDate.toLocaleDateString('pt-PT')}`);
    doc.text(`Vencimento: ${policy.endDate.toLocaleDateString('pt-PT')}`);
    doc.text(`Valor: ${Number(policy.value).toLocaleString()} Kz — Modalidade: ${policy.paymentMode}`);
    doc.moveDown();

    doc.fontSize(11).text('Beneficiários:', { underline: true });
    if (policy.members.length === 0) {
      doc.fontSize(10).text('Nenhum beneficiário associado.');
    } else {
      policy.members.forEach((m) => {
        doc.fontSize(10).text(`• ${m.insuredMember.fullName} (${m.insuredMember.internalNumber})`);
      });
    }
    doc.moveDown(1.5);

    if (policy.signatureHash) {
      doc.fontSize(11).fillColor('#4CAF50').text('✓ Documento assinado digitalmente', { underline: true });
      doc.fontSize(9).fillColor('#5F6B76');
      doc.text(`Assinado por: ${policy.signedByName}`);
      doc.text(`Data: ${policy.signedAt?.toLocaleString('pt-PT')}`);
      doc.text(`Hash SHA-256: ${policy.signatureHash}`);
      doc.fontSize(8).fillColor('#5F6B76').text(
        'A integridade deste documento pode ser confirmada a qualquer momento comparando este hash com o registado no sistema.',
        { width: 480 },
      );
    } else {
      doc.fontSize(10).fillColor('#D64545').text('Este documento ainda não foi assinado digitalmente.');
    }

    doc.end();
  });
}
