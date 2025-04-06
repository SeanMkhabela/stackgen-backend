import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { signToken } from '../utils/jwt';

export async function signupHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as { email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) {
    reply.status(409);
    return reply.send({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword });
  await user.save();

  return reply.send({ message: 'User created successfully ✅' });
}

export async function signinHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as { email: string; password: string };

  const user = await User.findOne({ email });
  if (!user) {
    reply.status(404);
    return reply.send({ error: 'User not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    reply.status(401);
    return reply.send({ error: 'Invalid password' });
  }

  const token = signToken({ id: user._id, email: user.email });

  return reply.send({ message: 'Signed in successfully ✅', token });
}
