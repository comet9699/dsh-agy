import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
/** Accept auxiliary purposes across both validated Harness request type versions. */
export type ForwardingOptions = Omit<GenerateOptions, 'purpose'> & { purpose?: string };
