import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../server.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Protect all journal routes
router.use(authenticateToken);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Helper to save base64 image to uploads directory
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

  const filename = `journal-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const filepath = path.join(destDir, filename);

  fs.writeFileSync(filepath, dataBuffer);

  return `/uploads/${filename}`;
}

// GET / - View journal entries history
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'student') {
      res.status(403).json({ message: 'Only students can view journal history' });
      return;
    }

    const placement = await prisma.internshipPlacement.findFirst({
      where: {
        studentId: req.user.studentId,
        status: 'active',
      },
    });

    if (!placement) {
      res.status(400).json({ message: 'No active internship placement found' });
      return;
    }

    const journals = await prisma.journalEntry.findMany({
      where: {
        placementId: placement.id,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json(journals);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get journal history',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST / - Create a new journal entry
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'student') {
      res.status(403).json({ message: 'Only students can create journal entries' });
      return;
    }

    const { date, taskDescription, learningOutcomes, hoursWorked, attachment } = req.body;

    if (!date || !taskDescription || !learningOutcomes || hoursWorked === undefined) {
      res.status(400).json({ message: 'Missing required journal fields' });
      return;
    }

    const placement = await prisma.internshipPlacement.findFirst({
      where: {
        studentId: req.user.studentId,
        status: 'active',
      },
    });

    if (!placement) {
      res.status(400).json({ message: 'No active internship placement found' });
      return;
    }

    let attachmentPath: string | null = null;
    if (attachment) {
      try {
        attachmentPath = saveBase64Image(attachment, UPLOADS_DIR);
      } catch (err) {
        res.status(400).json({
          message: 'Failed to upload attachment',
          error: err instanceof Error ? err.message : String(err),
        });
        return;
      }
    }

    const journal = await prisma.journalEntry.create({
      data: {
        placementId: placement.id,
        date: new Date(date),
        taskDescription,
        learningOutcomes,
        hoursWorked: parseFloat(hoursWorked),
        attachmentPath,
        status: 'pending',
      },
    });

    res.status(201).json({
      message: 'Journal entry created successfully',
      journal,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create journal entry',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /mentor - Get all journals of students assigned to this mentor
router.get('/mentor', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'mentor') {
      res.status(403).json({ message: 'Only mentors can view student journals' });
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

    const journals = await prisma.journalEntry.findMany({
      where: { placementId: { in: placementIds } },
      orderBy: { date: 'desc' }
    });

    // Map placement student info to each journal
    const journalsWithStudent = journals.map(j => {
      const placement = placements.find(p => p.id === j.placementId);
      return {
        ...j,
        studentName: placement?.student?.user?.name || 'Siswa',
        nim: placement?.student?.nim || '-',
        department: placement?.student?.department || '-',
        class: placement?.student?.class || '-'
      };
    });

    res.json({ journals: journalsWithStudent });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve student journals',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// PUT /:id/status - Approve or reject a journal entry with feedback
router.put('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'mentor') {
      res.status(403).json({ message: 'Only mentors can review journals' });
      return;
    }

    const { status, mentorFeedback } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }

    // Verify journal exists and belongs to a placement assigned to this mentor
    const journal = (await prisma.journalEntry.findUnique({
      where: { id: req.params.id as string },
      include: {
        placement: true
      }
    })) as any;

    if (!journal) {
      res.status(404).json({ message: 'Journal entry not found' });
      return;
    }

    if (journal.placement.companyMentorId !== req.user.mentorId) {
      res.status(403).json({ message: 'You are not authorized to review this student\'s journal' });
      return;
    }

    const updatedJournal = await prisma.journalEntry.update({
      where: { id: req.params.id as string },
      data: {
        status,
        mentorFeedback: mentorFeedback || null
      }
    });

    res.json({
      message: `Journal entry has been ${status}`,
      journal: updatedJournal
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update journal status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
