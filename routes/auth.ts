import { FastifyInstance } from 'fastify';
import { signupHandler, signinHandler } from '../controllers/authController';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', signupHandler);
  app.post('/auth/signin', signinHandler);
}
