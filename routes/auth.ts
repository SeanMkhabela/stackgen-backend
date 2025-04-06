import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { signupHandler, signinHandler } from '../controllers/authController';

export default async function authRoutes(app: FastifyInstance, options: FastifyPluginOptions) {
  app.post(
    '/auth/signup',
    {
      schema: {
        description: 'Create a new user account',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Successful response',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              userId: { type: 'string' },
              token: { type: 'string' },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    signupHandler
  );

  app.post(
    '/auth/signin',
    {
      schema: {
        description: 'Sign in to an existing account',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              userId: { type: 'string' },
              token: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    signinHandler
  );
}
