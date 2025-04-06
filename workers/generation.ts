import { QueueName, addJob } from '../utils/queue';
import { registerProcessor } from '../utils/workers';
import { captureException } from '../utils/sentry';

// Job name constants
export enum GenerationJobType {
  GENERATE_CODE = 'generate_code',
  OPTIMIZE_CODE = 'optimize_code',
}

// Type for code generation job data
export interface GenerateCodeJobData {
  prompt: string;
  language: string;
  userId: string;
  maxTokens?: number;
}

// Type for code optimization job data
export interface OptimizeCodeJobData {
  code: string;
  language: string;
  userId: string;
}

/**
 * Process a code generation job
 */
async function processGenerateCodeJob(data: GenerateCodeJobData): Promise<{ code: string }> {
  try {
    console.log(`Processing code generation for user ${data.userId} in ${data.language}`);

    // Simulate CPU-intensive work
    await simulateCpuIntensiveTask();

    // This would be your actual implementation
    const generatedCode =
      `// Generated code in ${data.language} based on: ${data.prompt}\n` +
      `function example() {\n  console.log("Hello World");\n}\n`;

    return { code: generatedCode };
  } catch (error) {
    captureException(error as Error, {
      context: 'Generate code job processing',
      userId: data.userId,
    });
    throw error;
  }
}

/**
 * Process a code optimization job
 */
async function processOptimizeCodeJob(
  data: OptimizeCodeJobData
): Promise<{ optimizedCode: string }> {
  try {
    console.log(`Processing code optimization for user ${data.userId} in ${data.language}`);

    // Simulate CPU-intensive work
    await simulateCpuIntensiveTask();

    // This would be your actual implementation
    const optimizedCode = `// Optimized version\n${data.code}`;

    return { optimizedCode };
  } catch (error) {
    captureException(error as Error, {
      context: 'Optimize code job processing',
      userId: data.userId,
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
 * Queue a code generation job
 */
export async function queueGenerateCode(data: GenerateCodeJobData) {
  return addJob(QueueName.GENERATION, GenerationJobType.GENERATE_CODE, data);
}

/**
 * Queue a code optimization job
 */
export async function queueOptimizeCode(data: OptimizeCodeJobData) {
  return addJob(QueueName.GENERATION, GenerationJobType.OPTIMIZE_CODE, data);
}

/**
 * Register all generation job processors
 */
export function registerGenerationProcessors() {
  registerProcessor(QueueName.GENERATION, GenerationJobType.GENERATE_CODE, processGenerateCodeJob);

  registerProcessor(QueueName.GENERATION, GenerationJobType.OPTIMIZE_CODE, processOptimizeCodeJob);
}
