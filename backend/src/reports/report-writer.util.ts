import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { resolveAssetPath } from '../common/utils/asset-path.util';

const LOGO_PATH = resolveAssetPath('logo.png');

// Gerador tabular genérico para exportação de relatórios (secção 24 do
// briefing original: PDF e Excel). Qualquer relatório do sistema é definido
// apenas pelo seu título, colunas e linhas — a geração dos ficheiros é
// centralizada aqui, para consistência visual entre todos os relatórios.

export interface ReportColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ReportDefinition {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  generatedAt: Date;
}

export async function generateExcelReport(report: ReportDefinition): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EMIR SAÚDE SEGUROS';
  workbook.created = report.generatedAt;

  const sheet = workbook.addWorksheet(report.title.slice(0, 31));

  sheet.columns = report.columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  report.rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generatePdfReport(report: ReportDefinition): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const startY = doc.y;
    try {
      doc.image(LOGO_PATH, 40, startY, { width: 60 });
    } catch {
      // Nunca falhar a geração do relatório por falta do ficheiro do logótipo.
    }
    doc.fontSize(16).fillColor('#0F4C81').text('EMIR SAÚDE SEGUROS', 110, startY, { align: 'left' });
    doc.fontSize(12).fillColor('#000000').text(report.title, 110, doc.y, { align: 'left' });
    doc.fontSize(8).fillColor('#5F6B76').text(`Gerado em ${report.generatedAt.toLocaleString('pt-PT')}`, 110, doc.y);
    doc.y = startY + 65;
    doc.moveDown();

    const colWidth = (doc.page.width - 80) / report.columns.length;
    let y = doc.y;

    doc.fontSize(9).fillColor('#FFFFFF');
    doc.rect(40, y, doc.page.width - 80, 20).fill('#0F4C81');
    report.columns.forEach((col, i) => {
      doc.fillColor('#FFFFFF').text(col.header, 40 + i * colWidth + 4, y + 5, { width: colWidth - 8 });
    });
    y += 20;

    doc.fontSize(8).fillColor('#000000');
    for (const row of report.rows) {
      if (y > doc.page.height - 60) {
        doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
        y = 40;
      }
      report.columns.forEach((col, i) => {
        const value = row[col.key];
        doc.text(value === null || value === undefined ? '' : String(value), 40 + i * colWidth + 4, y + 4, { width: colWidth - 8 });
      });
      y += 18;
    }

    doc.end();
  });
}
