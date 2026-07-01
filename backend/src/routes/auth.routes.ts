import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../server.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'jurnal-magang-super-secret-key-12345';

// POST /register
router.post('/register', async (req, res: Response) => {
  try {
    const { email, password, name, role, details } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and associated profile transactionally
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
        },
      });

      if (role === 'student') {
        const { nim, department, class: className, phone } = details || {};
        if (!nim || !department || !className) {
          throw new Error('Missing student details (nim, department, class)');
        }
        await tx.student.create({
          data: {
            userId: newUser.id,
            nim,
            department,
            class: className,
            phone,
          },
        });
      } else if (role === 'mentor') {
        const { companyName, position, phone } = details || {};
        if (!companyName) {
          throw new Error('Missing mentor details (companyName)');
        }
        await tx.companyMentor.create({
          data: {
            userId: newUser.id,
            companyName,
            position,
            phone,
          },
        });
      } else if (role === 'advisor') {
        const { nidn, phone } = details || {};
        if (!nidn) {
          throw new Error('Missing advisor details (nidn)');
        }
        await tx.academicAdvisor.create({
          data: {
            userId: newUser.id,
            nidn,
            phone,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          student: true,
          companyMentor: true,
          academicAdvisor: true,
        },
      });
    });

    if (!user) {
      res.status(500).json({ message: 'Error registering user' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.student?.id,
        mentorId: user.companyMentor?.id,
        advisorId: user.academicAdvisor?.id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.student || user.companyMentor || user.academicAdvisor,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Registration failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        companyMentor: true,
        academicAdvisor: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.student?.id,
        mentorId: user.companyMentor?.id,
        advisorId: user.academicAdvisor?.id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.student || user.companyMentor || user.academicAdvisor,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Login failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        student: true,
        companyMentor: true,
        academicAdvisor: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.student || user.companyMentor || user.academicAdvisor,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Fetch user failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function saveBase64Image(base64Data: string, destDir: string): string {
  const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid image format. Must be a base64 image.');
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const dataBuffer = Buffer.from(matches[2], 'base64');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const filename = `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const filepath = path.join(destDir, filename);

  fs.writeFileSync(filepath, dataBuffer);

  return `/uploads/${filename}`;
}

// PUT /mentor/profile - Update mentor company profile
router.put('/mentor/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'mentor') {
      res.status(403).json({ message: 'Only mentors can update company profile' });
      return;
    }

    const { companyName, position, phone, companyLogo, themeColor } = req.body;

    if (!companyName) {
      res.status(400).json({ message: 'Company name is required' });
      return;
    }

    let logoPath: string | undefined = undefined;
    if (companyLogo) {
      if (companyLogo.startsWith('data:image/')) {
        try {
          logoPath = saveBase64Image(companyLogo, UPLOADS_DIR);
        } catch (err) {
          res.status(400).json({
            message: 'Failed to upload logo',
            error: err instanceof Error ? err.message : String(err),
          });
          return;
        }
      } else if (companyLogo.startsWith('/uploads/')) {
        logoPath = companyLogo;
      }
    }

    const updatedMentor = await prisma.companyMentor.update({
      where: { userId: req.user.id },
      data: {
        companyName,
        position: position || null,
        phone: phone || null,
        themeColor: themeColor || undefined,
        ...(logoPath !== undefined ? { companyLogo: logoPath } : {}),
      },
    });

    res.json({
      message: 'Company profile updated successfully',
      profile: updatedMentor,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update company profile',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
