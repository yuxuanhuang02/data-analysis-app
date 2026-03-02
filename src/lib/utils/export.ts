import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
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

        const imgData = await toPng(element, {
            backgroundColor: '#0d1117',
            pixelRatio: 2
        });
        const width = element.offsetWidth * 2;
        const height = element.offsetHeight * 2;

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [width, height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`analysis_report_${Date.now()}.pdf`);
    }
};
