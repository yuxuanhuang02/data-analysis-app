import * as Comlink from 'comlink';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TableParser } from '../parsers/table-parser';

const tableParser = new TableParser();

const workerApi = {
  async getHeaders(fileBuffer: ArrayBuffer, fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      const text = await new Blob([fileBuffer.slice(0, 50000)]).text();
      const pr = Papa.parse(text, { header: true, preview: 1 });
      return Object.keys(pr.data[0] || {});
    } else if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(fileBuffer, { type: 'array', sheetRows: 1 });
      return Object.keys(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])[0] || {});
    }
    throw new Error(`Cannot get headers for .${ext}`);
  },

  async parseTable(fileBuffer: ArrayBuffer, fileName: string, timeColumnOverride?: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      const signature = ext === 'csv' ? 'CSV' : 'EXCEL';
      let result, mapping;

      if (ext === 'csv') {
        const text = await new Blob([fileBuffer.slice(0, 50000)]).text();
        const pr = Papa.parse(text, { header: true, preview: 1 });
        mapping = tableParser.discoverMapping(Object.keys(pr.data[0] || {}), timeColumnOverride);
        result = await tableParser.parseCsv(fileBuffer, mapping);
      } else {
        const wb = XLSX.read(fileBuffer, { type: 'array', sheetRows: 1 });
        const headers = Object.keys(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])[0] || {});
        mapping = tableParser.discoverMapping(headers, timeColumnOverride);
        result = await tableParser.parseExcel(fileBuffer, mapping);
      }

      return {
        header: { signature, fileSize: fileBuffer.byteLength, mapping },
        multiSignals: result.signals,
        objectPreview: []
      };
    }

    throw new Error(`Unsupported file type: .${ext}`);
  }
};

Comlink.expose(workerApi);
