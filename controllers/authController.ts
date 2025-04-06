import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import { signToken } from '../utils/jwt';

export async function signupHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = request.body as { email: string; password: string };

    // Basic validation
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    return reply.status(200).send({ 
      message: 'User created successfully ✅'
    });
  } catch (error) {
    console.error('Error in signup:', error);
    return reply.status(500).send({ error: 'Server error' });
  }
}

export async function signinHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = request.body as { email: string; password: string };

    // Basic validation
    if (!email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    if (!password) {
      return reply.status(400).send({ error: 'Missing password' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return reply.status(401).send({ error: 'Invalid password' });
    }

    // Generate token
    const token = signToken({ id: user._id, email: user.email });

    return reply.send({ 
      message: 'Signed in successfully ✅', 
      token
    });
  } catch (error) {
    console.error('Error in signin:', error);
    return reply.status(500).send({ error: 'Server error' });
  }
}
