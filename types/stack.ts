// Stack type definitions
export type Frontend = 'react' | 'nextjs' | 'vue' | 'angular' | 'svelte';
export type Backend = 'express' | 'fastify' | 'nest' | 'django' | 'laravel';
export type StackName = `${Frontend}-${Backend}`;

// Stack configuration
export const supportedStacks = {
  // Boilerplates that actually exist on disk and are fully implemented
  implemented: [
    'react-express',
  ] as StackName[],
  
  // Boilerplates that should be shown in the UI as available options
  uiVisible: [
    'react-express',
    'react-fastify',
    'vue-express',
    'nextjs-express',
    'angular-express'
  ] as StackName[],
  
  // Frontend options
  frontends: ['react', 'nextjs', 'vue', 'angular', 'svelte'] as Frontend[],
  
  // Backend options
  backends: ['express', 'fastify', 'nest', 'django', 'laravel'] as Backend[],
  
  // Compatibility matrix
  compatibility: {
    react: ['express', 'fastify', 'nest'] as Backend[],
    nextjs: ['express', 'nest'] as Backend[],
    vue: ['express', 'fastify', 'nest'] as Backend[],
    angular: ['express', 'nest'] as Backend[],
    svelte: ['express', 'fastify'] as Backend[]
  },
  
  // User-friendly names
  prettyNames: {
    react: 'React',
    nextjs: 'Next.js',
    vue: 'Vue.js',
    angular: 'Angular',
    svelte: 'Svelte',
    express: 'Express.js',
    fastify: 'Fastify',
    nest: 'NestJS',
    django: 'Django',
    laravel: 'Laravel'
  }
} as const;

// Type guards
export function isFrontend(value: string): value is Frontend {
  return supportedStacks.frontends.includes(value as Frontend);
}

export function isBackend(value: string): value is Backend {
  return supportedStacks.backends.includes(value as Backend);
} 