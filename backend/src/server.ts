import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5005;

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://intern.nwsn.cc',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Support base64 uploads

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import Routes (using ESM .js extension)
import authRouter from './routes/auth.routes.js';
import attendanceRouter from './routes/attendance.routes.js';
import journalRouter from './routes/journal.routes.js';

// Register Routes
app.use('/api/auth', authRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/journals', journalRouter);

// Basic health check route
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      message: 'Server and Database are healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Server is running but database connection failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Auto-seeder function
async function seedDatabase() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('Database already has users. Skipping seeder.');
      return;
    }

    console.log('🌱 Database is empty. Seeding initial test data...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create Student
    const studentUser = await prisma.user.create({
      data: {
        email: 'student@example.com',
        password: hashedPassword,
        name: 'Budi Santoso',
        role: 'student',
        student: {
          create: {
            nim: '12345678',
            phone: '081234567890',
            department: 'Teknik Informatika',
            class: 'TI-4A',
          }
        }
      },
      include: { student: true }
    });

    // 2. Create Company Mentor
    const mentorUser = await prisma.user.create({
      data: {
        email: 'mentor@example.com',
        password: hashedPassword,
        name: 'Pak Eko (PT Inovasi Teknologi)',
        role: 'mentor',
        companyMentor: {
          create: {
            companyName: 'PT Inovasi Teknologi',
            position: 'Senior Software Engineer',
            phone: '089876543210',
          }
        }
      },
      include: { companyMentor: true }
    });

    // 3. Create Academic Advisor
    const advisorUser = await prisma.user.create({
      data: {
        email: 'advisor@example.com',
        password: hashedPassword,
        name: 'Dr. Rian Hidayat',
        role: 'advisor',
        academicAdvisor: {
          create: {
            nidn: '987654321',
            phone: '081122334455',
          }
        }
      },
      include: { academicAdvisor: true }
    });

    // 4. Create Active Placement mapping them together
    if (studentUser.student && mentorUser.companyMentor && advisorUser.academicAdvisor) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // 3 months duration

      await prisma.internshipPlacement.create({
        data: {
          studentId: studentUser.student.id,
          companyMentorId: mentorUser.companyMentor.id,
          academicAdvisorId: advisorUser.academicAdvisor.id,
          startDate,
          endDate,
          status: 'active',
        }
      });
      console.log('✅ Initial seed data created successfully:');
      console.log('   - Student: student@example.com / password123');
      console.log('   - Mentor : mentor@example.com / password123');
      console.log('   - Advisor: advisor@example.com / password123');
    }
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
  }
}

// Start the server
app.listen(port, async () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  await seedDatabase();
});
