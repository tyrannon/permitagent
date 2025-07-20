import { Router } from 'express';
import { authService } from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().optional(),
  organizationId: Joi.string().optional(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    // Attempt login
    const result = await authService.login(value);
    
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Invalid credentials' || error.message === 'Account is disabled') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    // Attempt registration
    const result = await authService.register(value);
    
    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    // Validate input
    const { error, value } = refreshSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    // Attempt refresh
    const result = await authService.refreshToken(value.refreshToken);
    
    res.json(result);
  } catch (error: any) {
    if (error.message.includes('token') || error.message === 'Session expired') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await authService.logout(req.user.id, req.user.sessionId);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout all devices endpoint
router.post('/logout-all', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await authService.logoutAllDevices(req.user.id);
    
    res.json({ message: 'Logged out from all devices' });
  } catch (error: any) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user endpoint
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get full user details
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        title: true,
        emailVerified: true,
        lastLogin: true,
        preferences: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;