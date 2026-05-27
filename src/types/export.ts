export interface PrintableChartDataPoint {
  date: string;
  odValue: number;
  protocolNumber: string;
  runIndex: number;
}

export interface ExportMetadata {
  disease: string;
  controlType: string;
  controlLabel: string;
  year: number;
  lotNumber?: string;
  mean: number;
  sd: number;
  cv: number;
  totalRuns: number;
}

export interface PDFExportMetadata {
  disease: string;
  controlLabel: string;
  year: number;
}
