import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

/**
 * Configures OpenAPI/Swagger documentation for the API
 */
export async function setupSwagger(app: FastifyInstance) {
  // Register the Swagger generator plugin
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'StackGen API',
        description: 'StackGen backend API documentation',
        version: '1.0.0',
        contact: {
          name: 'StackGen Support',
          url: 'https://stackgen.dev/support',
          email: 'support@stackgen.dev',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
        {
          url: 'https://api.stackgen.dev',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  // Register the Swagger UI plugin
  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: header => header,
  });

  // Log info about Swagger documentation
  app.log.info('Swagger documentation enabled');

  // Add a redirect from /docs to /documentation for convenience
  app.get('/docs', { schema: { hide: true } }, (req, reply) => {
    reply.redirect('/documentation');
  });
}
