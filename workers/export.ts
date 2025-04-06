import { QueueName, addJob } from '../utils/queue';
import { registerProcessor } from '../utils/workers';
import { captureException } from '../utils/sentry';

// Job name constants
export enum ExportJobType {
  EXPORT_PROJECT = 'export_project',
  GENERATE_REPORT = 'generate_report',
}

// Type for project export job data
export interface ExportProjectJobData {
  projectId: string;
  userId: string;
  format: 'zip' | 'tar' | 'github';
  includeTests?: boolean;
}

// Type for report generation job data
export interface GenerateReportJobData {
  projectId: string;
  userId: string;
  reportType: 'summary' | 'detailed';
  fromDate?: string;
  toDate?: string;
}

/**
 * Process a project export job
 */
async function processExportProjectJob(data: ExportProjectJobData): Promise<{ url: string }> {
  try {
    console.log(
      `Processing project export for user ${data.userId}, project ${data.projectId} in ${data.format} format`
    );

    // Simulate CPU-intensive work
    await simulateCpuIntensiveTask();

    // This would be your actual implementation to generate a ZIP file or push to GitHub
    const exportUrl = `https://example.com/exports/${data.projectId}.${data.format}`;

    return { url: exportUrl };
  } catch (error) {
    captureException(error as Error, {
      context: 'Export project job processing',
      userId: data.userId,
      projectId: data.projectId,
    });
    throw error;
  }
}

/**
 * Process a report generation job
 */
async function processGenerateReportJob(
  data: GenerateReportJobData
): Promise<{ reportId: string }> {
  try {
    console.log(
      `Processing report generation for user ${data.userId}, project ${data.projectId}, type ${data.reportType}`
    );

    // Simulate CPU-intensive work
    await simulateCpuIntensiveTask();

    // This would be your actual implementation to generate a report
    const reportId = `report-${Date.now()}-${data.projectId}`;

    return { reportId };
  } catch (error) {
    captureException(error as Error, {
      context: 'Generate report job processing',
      userId: data.userId,
      projectId: data.projectId,
    });
    throw error;
  }
}

/**
 * Helper function to simulate CPU-intensive work
 */
async function simulateCpuIntensiveTask(): Promise<void> {
  return new Promise(resolve => {
    const startTime = Date.now();

    // Simulate work for 2 seconds
    while (Date.now() - startTime < 2000) {
      // CPU-intensive calculation
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i);
      }
    }

    resolve();
  });
}

/**
 * Queue a project export job
 */
export async function queueExportProject(data: ExportProjectJobData) {
  return addJob(QueueName.EXPORT, ExportJobType.EXPORT_PROJECT, data);
}

/**
 * Queue a report generation job
 */
export async function queueGenerateReport(data: GenerateReportJobData) {
  return addJob(QueueName.EXPORT, ExportJobType.GENERATE_REPORT, data);
}

/**
 * Register all export job processors
 */
export function registerExportProcessors() {
  registerProcessor(QueueName.EXPORT, ExportJobType.EXPORT_PROJECT, processExportProjectJob);

  registerProcessor(QueueName.EXPORT, ExportJobType.GENERATE_REPORT, processGenerateReportJob);
}
