import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, BarChart3, Loader2 } from 'lucide-react';
import { listReports, downloadReport } from '@/services/reportService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/stores/toastStore';

// Exportação de relatórios (secção 24 do briefing original): Excel e PDF,
// gerados a partir de dados reais de cada módulo.
export default function ReportsPage() {
  const { data: reports, isLoading } = useQuery({ queryKey: ['reports-list'], queryFn: listReports });
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(key: string, format: 'xlsx' | 'pdf') {
    setDownloading(`${key}-${format}`);
    try {
      await downloadReport(key, format);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-1">Relatórios</h1>
      <p className="text-text-secondary text-sm mb-6">
        Exportação de relatórios em Excel e PDF, com dados reais e actualizados de cada módulo.
      </p>

      {isLoading && <p className="text-text-secondary text-sm">A carregar…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports?.map((report) => (
          <Card key={report.key}>
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart3 size={18} className="text-institutional" />
              <CardTitle className="text-text-primary text-base">{report.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={downloading === `${report.key}-xlsx`}
                onClick={() => handleDownload(report.key, 'xlsx')}
              >
                {downloading === `${report.key}-xlsx`
                  ? <Loader2 size={14} className="animate-spin mr-1.5" />
                  : <FileSpreadsheet size={14} className="mr-1.5" />}
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={downloading === `${report.key}-pdf`}
                onClick={() => handleDownload(report.key, 'pdf')}
              >
                {downloading === `${report.key}-pdf`
                  ? <Loader2 size={14} className="animate-spin mr-1.5" />
                  : <FileText size={14} className="mr-1.5" />}
                PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
