import { Router, Response } from 'express';
import { prisma } from '../server.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Middleware to protect all routes here
router.use(authenticateToken);

// Helper to get active placement for student
async function getActivePlacement(studentId?: string) {
  if (!studentId) return null;
  return prisma.internshipPlacement.findFirst({
    where: {
      studentId,
      status: 'active',
    },
    include: {
      student: { include: { user: true } },
      companyMentor: { include: { user: true } },
      academicAdvisor: { include: { user: true } },
    },
  });
}

// Helper to get today's date range (midnight to midnight)
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /status - Get check-in/out status for today
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'student') {
      res.status(403).json({ message: 'Only students can check attendance status' });
      return;
    }

    const placement = await getActivePlacement(req.user.studentId);
    if (!placement) {
      res.status(400).json({ message: 'No active internship placement found' });
      return;
    }

    const { start, end } = getTodayRange();
    const attendance = await prisma.attendance.findFirst({
      where: {
        placementId: placement.id,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    res.json({
      placement,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get status',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /check-in - Perform daily check-in
router.post('/check-in', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'student') {
      res.status(403).json({ message: 'Only students can check-in' });
      return;
    }

    const { status, notes } = req.body; // status: "HADIR", "SAKIT", "IZIN"
    const attendanceStatus = status || 'HADIR';

    const placement = await getActivePlacement(req.user.studentId);
    if (!placement) {
      res.status(400).json({ message: 'No active internship placement found' });
      return;
    }

    const { start, end } = getTodayRange();
    // Check if check-in already done today
    const existing = await prisma.attendance.findFirst({
      where: {
        placementId: placement.id,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existing) {
      res.status(400).json({ message: 'Already checked in today' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.create({
      data: {
        placementId: placement.id,
        date: today,
        checkIn: attendanceStatus === 'HADIR' ? new Date() : null,
        status: attendanceStatus,
        notes: notes || null,
      },
    });

    res.status(201).json({
      message: 'Check-in successful',
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Check-in failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /check-out - Perform daily check-out
router.post('/check-out', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'student') {
      res.status(403).json({ message: 'Only students can check-out' });
      return;
    }

    const placement = await getActivePlacement(req.user.studentId);
    if (!placement) {
      res.status(400).json({ message: 'No active internship placement found' });
      return;
    }

    const { start, end } = getTodayRange();
    const attendance = await prisma.attendance.findFirst({
      where: {
        placementId: placement.id,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (!attendance) {
      res.status(400).json({ message: 'You must check-in first today' });
      return;
    }

    if (attendance.checkOut) {
      res.status(400).json({ message: 'Already checked out today' });
      return;
    }

    if (attendance.status !== 'HADIR') {
      res.status(400).json({ message: 'Check-out is only required for "HADIR" status' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: new Date(),
      },
    });

    res.json({
      message: 'Check-out successful',
      attendance: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Check-out failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /history - Get attendance history
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'student') {
      res.status(403).json({ message: 'Only students can view attendance history' });
      return;
    }

    const placement = await getActivePlacement(req.user.studentId);
    if (!placement) {
      res.status(400).json({ message: 'No active internship placement found' });
      return;
    }

    const history = await prisma.attendance.findMany({
      where: {
        placementId: placement.id,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get history',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /mentor - Get all attendance history of students assigned to this mentor
router.get('/mentor', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'mentor') {
      res.status(403).json({ message: 'Only mentors can view student attendance' });
      return;
    }

    const mentorId = req.user.mentorId;
    if (!mentorId) {
      res.status(400).json({ message: 'Mentor profile ID not found' });
      return;
    }

    const placements = await prisma.internshipPlacement.findMany({
      where: { companyMentorId: mentorId },
      select: { id: true, student: { include: { user: true } } }
    });

    const placementIds = placements.map(p => p.id);

    const attendance = await prisma.attendance.findMany({
      where: { placementId: { in: placementIds } },
      orderBy: { date: 'desc' }
    });

    // Map placement student info to each attendance record
    const attendanceWithStudent = attendance.map(a => {
      const placement = placements.find(p => p.id === a.placementId);
      return {
        ...a,
        studentName: placement?.student?.user?.name || 'Siswa',
        nim: placement?.student?.nim || '-',
        department: placement?.student?.department || '-',
        class: placement?.student?.class || '-'
      };
    });

    res.json({ attendance: attendanceWithStudent });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve student attendance history',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
