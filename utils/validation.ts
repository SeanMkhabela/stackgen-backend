import { FastifyReply } from 'fastify';
import { isFrontend, isBackend, supportedStacks } from '../types/stack';

export interface ValidationError {
  error: string;
  message: string;
  details?: any;
}

export function validateStackCombination(frontend: string, backend: string): ValidationError | null {
  // Validate frontend
  if (!isFrontend(frontend)) {
    return {
      error: `Unsupported frontend: ${frontend}`,
      message: `The frontend "${frontend}" is not supported. Please choose from: ${supportedStacks.frontends.map(f => supportedStacks.prettyNames[f]).join(', ')}.`,
      details: { availableFrontends: supportedStacks.frontends }
    };
  }

  // Validate backend
  if (!isBackend(backend)) {
    return {
      error: `Unsupported backend: ${backend}`,
      message: `The backend "${backend}" is not supported. Please choose from: ${supportedStacks.backends.map(b => supportedStacks.prettyNames[b]).join(', ')}.`,
      details: { availableBackends: supportedStacks.backends }
    };
  }

  // Validate compatibility
  if (!supportedStacks.compatibility[frontend]?.includes(backend)) {
    const compatibleBackends = supportedStacks.compatibility[frontend].map(b => supportedStacks.prettyNames[b]).join(', ');
    return {
      error: `Incompatible stack combination: ${frontend} with ${backend}`,
      message: `${supportedStacks.prettyNames[frontend]} is not recommended to use with ${supportedStacks.prettyNames[backend]}. For ${supportedStacks.prettyNames[frontend]}, we recommend: ${compatibleBackends}.`,
      details: { compatibleOptions: supportedStacks.compatibility[frontend] }
    };
  }
  
  return null;
}

export function validatePassword(password: string): ValidationError | null {
  if (!password || password.length < 8) {
    return {
      error: 'Invalid password',
      message: 'Password must be at least 8 characters long'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      error: 'Invalid password',
      message: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      error: 'Invalid password',
      message: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/\d/.test(password)) {
    return {
      error: 'Invalid password',
      message: 'Password must contain at least one number'
    };
  }

  return null;
}

export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      error: 'Invalid email',
      message: 'Please provide a valid email address'
    };
  }
  return null;
}

export function sendErrorResponse(reply: FastifyReply, statusCode: number, payload: ValidationError) {
  reply.status(statusCode);
  return reply.send(payload);
} 