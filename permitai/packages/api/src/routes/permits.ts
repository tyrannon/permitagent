import { Router } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createPermitSchema = Joi.object({
  permitTypeId: Joi.string().required(),
  projectId: Joi.string().required(),
  applicantName: Joi.string().required(),
  applicantEmail: Joi.string().email().required(),
  applicantPhone: Joi.string().required(),
  organizationId: Joi.string().optional(),
  formData: Joi.object().required(),
  customFields: Joi.object().optional(),
});

// Get all permits (with filtering)
router.get('/', authenticate, requirePermission('permits.read'), async (req: AuthRequest, res) => {
  try {
    const { status, projectId, organizationId, page = 1, limit = 20 } = req.query;
    
    const where: any = {};
    
    // Apply filters
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (organizationId) where.organizationId = organizationId;
    
    // If user is applicant, only show their permits
    if (req.user?.role === 'applicant') {
      where.createdById = req.user.id;
    }
    
    // If user is department-specific, filter by department permits
    if (req.user?.departmentId && req.user.role !== 'admin') {
      where.permitType = {
        departmentId: req.user.departmentId,
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [permits, total] = await Promise.all([
      prisma.permit.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          permitType: true,
          project: true,
          organization: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.permit.count({ where }),
    ]);

    res.json({
      permits,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get permits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single permit
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const permit = await prisma.permit.findUnique({
      where: { id: req.params.id },
      include: {
        permitType: true,
        project: {
          include: {
            organization: true,
          },
        },
        organization: true,
        documents: true,
        workflowEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        fees: {
          include: {
            payments: true,
          },
        },
        inspections: {
          orderBy: { scheduledDate: 'asc' },
        },
        comments: {
          where: {
            isInternal: req.user?.role === 'applicant' ? false : undefined,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        conditions: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    // Check access
    if (req.user?.role === 'applicant' && permit.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(permit);
  } catch (error: any) {
    console.error('Get permit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create permit
router.post('/', authenticate, requirePermission('permits.create'), async (req: AuthRequest, res) => {
  try {
    // Validate input
    const { error, value } = createPermitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details 
      });
    }

    // Generate permit number
    const permitCount = await prisma.permit.count();
    const permitNumber = `PERM-${new Date().getFullYear()}-${String(permitCount + 1).padStart(4, '0')}`;

    // Create permit
    const permit = await prisma.permit.create({
      data: {
        ...value,
        permitNumber,
        status: 'DRAFT',
        createdById: req.user!.id,
      },
      include: {
        permitType: true,
        project: true,
        organization: true,
      },
    });

    // Create initial workflow event
    await prisma.workflowEvent.create({
      data: {
        permitId: permit.id,
        action: 'CREATED',
        toStatus: 'DRAFT',
        comment: 'Permit application created',
        userId: req.user!.id,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'Permit',
        entityId: permit.id,
        metadata: {
          permitNumber,
          permitType: permit.permitTypeId,
        },
      },
    });

    res.status(201).json(permit);
  } catch (error: any) {
    console.error('Create permit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit permit for review
router.post('/:id/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const permit = await prisma.permit.findUnique({
      where: { id: req.params.id },
      include: { documents: true },
    });

    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    // Check ownership
    if (req.user?.role === 'applicant' && permit.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already submitted
    if (permit.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Permit already submitted' });
    }

    // Check required documents
    if (permit.documents.length === 0) {
      return res.status(400).json({ error: 'At least one document is required' });
    }

    // Update permit status
    const updatedPermit = await prisma.permit.update({
      where: { id: req.params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Create workflow event
    await prisma.workflowEvent.create({
      data: {
        permitId: permit.id,
        action: 'SUBMITTED',
        fromStatus: 'DRAFT',
        toStatus: 'SUBMITTED',
        comment: 'Permit submitted for review',
        userId: req.user!.id,
      },
    });

    // Create notification for reviewers
    const reviewers = await prisma.user.findMany({
      where: {
        role: {
          name: 'reviewer',
        },
        departmentId: permit.permitTypeId,
      },
    });

    await Promise.all(
      reviewers.map(reviewer =>
        prisma.notification.create({
          data: {
            userId: reviewer.id,
            type: 'PERMIT_SUBMITTED',
            channel: 'IN_APP',
            subject: 'New Permit Application',
            body: `Permit ${permit.permitNumber} has been submitted for review.`,
            metadata: {
              permitId: permit.id,
              permitNumber: permit.permitNumber,
            },
          },
        })
      )
    );

    res.json(updatedPermit);
  } catch (error: any) {
    console.error('Submit permit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;