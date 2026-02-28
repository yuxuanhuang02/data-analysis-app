import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { SignalPoint } from '../vctm/engine';

export const ExportService = {
    /**
     * Export signal data to an Excel file.
     */
    async exportToExcel(signalId: string, samples: SignalPoint[]): Promise<void> {
        const ws = XLSX.utils.json_to_sheet(samples);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SignalData");
        XLSX.writeFile(wb, `${signalId}_export_${Date.now()}.xlsx`);
    },

    /**
     * Generate a PDF report of the active dashboard.
     */
    async generatePdfReport(elementId: string): Promise<void> {
        const element = document.getElementById(elementId);
        if (!element) return;

        const canvas = await html2canvas(element, {
            backgroundColor: '#0d1117',
            scale: 2
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`analysis_report_${Date.now()}.pdf`);
    }
};
