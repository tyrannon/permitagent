import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create roles
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'admin',
        description: 'System Administrator',
        permissions: ['*'],
        isSystem: true,
      },
    }),
    prisma.role.create({
      data: {
        name: 'reviewer',
        description: 'Permit Reviewer',
        permissions: [
          'permits.read',
          'permits.update',
          'permits.review',
          'comments.create',
          'documents.read',
        ],
        isSystem: true,
      },
    }),
    prisma.role.create({
      data: {
        name: 'inspector',
        description: 'Field Inspector',
        permissions: [
          'permits.read',
          'inspections.read',
          'inspections.update',
          'documents.upload',
        ],
        isSystem: true,
      },
    }),
    prisma.role.create({
      data: {
        name: 'applicant',
        description: 'Permit Applicant',
        permissions: [
          'permits.create',
          'permits.read.own',
          'documents.upload.own',
          'payments.create.own',
        ],
        isSystem: true,
      },
    }),
  ]);

  console.log(`✅ Created ${roles.length} roles`);

  // Create departments
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        name: 'Building Department',
        code: 'BUILD',
        description: 'Handles building permits and inspections',
        email: 'building@permitai.gov',
        phone: '555-0100',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Planning Department',
        code: 'PLAN',
        description: 'Handles zoning and land use permits',
        email: 'planning@permitai.gov',
        phone: '555-0101',
      },
    }),
    prisma.department.create({
      data: {
        name: 'Fire Department',
        code: 'FIRE',
        description: 'Fire safety reviews and permits',
        email: 'fire@permitai.gov',
        phone: '555-0102',
      },
    }),
  ]);

  console.log(`✅ Created ${departments.length} departments`);

  // Create permit types
  const permitTypes = await Promise.all([
    prisma.permitType.create({
      data: {
        name: 'Residential Building Permit',
        code: 'RES-BUILD',
        category: 'Building',
        description: 'New construction or major renovation of residential property',
        departmentId: departments[0].id,
        estimatedDays: 30,
        expeditedDays: 10,
        workflowTemplate: {
          steps: [
            { name: 'Application', status: 'SUBMITTED' },
            { name: 'Plan Review', status: 'UNDER_REVIEW' },
            { name: 'Approval', status: 'APPROVED' },
            { name: 'Permit Issuance', status: 'ISSUED' },
            { name: 'Inspections', status: 'INSPECTIONS' },
            { name: 'Final Approval', status: 'CLOSED' },
          ],
        },
        requiredFields: {
          projectAddress: 'string',
          projectDescription: 'text',
          squareFootage: 'number',
          estimatedCost: 'currency',
          contractorLicense: 'string',
        },
        dynamicFields: {},
        feeSchedule: {
          base: 150,
          perSquareFoot: 0.15,
          minFee: 300,
          maxFee: 10000,
        },
        reviewChecklist: [
          'Zoning compliance',
          'Setback requirements',
          'Building code compliance',
          'Structural calculations',
          'Energy efficiency',
        ],
      },
    }),
    prisma.permitType.create({
      data: {
        name: 'Commercial Building Permit',
        code: 'COM-BUILD',
        category: 'Building',
        description: 'New construction or renovation of commercial property',
        departmentId: departments[0].id,
        estimatedDays: 45,
        expeditedDays: 15,
        workflowTemplate: {
          steps: [
            { name: 'Application', status: 'SUBMITTED' },
            { name: 'Plan Review', status: 'UNDER_REVIEW' },
            { name: 'Fire Review', status: 'UNDER_REVIEW' },
            { name: 'Approval', status: 'APPROVED' },
            { name: 'Permit Issuance', status: 'ISSUED' },
            { name: 'Inspections', status: 'INSPECTIONS' },
            { name: 'Final Approval', status: 'CLOSED' },
          ],
        },
        requiredFields: {
          projectAddress: 'string',
          projectDescription: 'text',
          squareFootage: 'number',
          estimatedCost: 'currency',
          contractorLicense: 'string',
          businessLicense: 'string',
          occupancyType: 'select',
        },
        dynamicFields: {},
        feeSchedule: {
          base: 500,
          perSquareFoot: 0.25,
          minFee: 1000,
          maxFee: 50000,
        },
        reviewChecklist: [
          'Zoning compliance',
          'ADA compliance',
          'Fire code compliance',
          'Building code compliance',
          'Parking requirements',
          'Environmental impact',
        ],
      },
    }),
    prisma.permitType.create({
      data: {
        name: 'Special Event Permit',
        code: 'SPECIAL-EVENT',
        category: 'Planning',
        description: 'Temporary events in public spaces',
        departmentId: departments[1].id,
        estimatedDays: 14,
        expeditedDays: 3,
        workflowTemplate: {
          steps: [
            { name: 'Application', status: 'SUBMITTED' },
            { name: 'Review', status: 'UNDER_REVIEW' },
            { name: 'Approval', status: 'APPROVED' },
            { name: 'Permit Issuance', status: 'ISSUED' },
          ],
        },
        requiredFields: {
          eventName: 'string',
          eventDate: 'date',
          eventLocation: 'string',
          expectedAttendance: 'number',
          eventDescription: 'text',
          insuranceCertificate: 'file',
        },
        dynamicFields: {
          alcoholServed: 'boolean',
          foodVendors: 'boolean',
          amplifiedSound: 'boolean',
        },
        feeSchedule: {
          base: 100,
          perAttendee: 0.5,
          minFee: 100,
          maxFee: 5000,
        },
        reviewChecklist: [
          'Insurance verification',
          'Security plan',
          'Traffic control',
          'Noise ordinance compliance',
        ],
      },
    }),
  ]);

  console.log(`✅ Created ${permitTypes.length} permit types`);

  // Create users
  const hashedPassword = await hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@permitai.gov',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roleId: roles[0].id,
        departmentId: departments[0].id,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'reviewer@permitai.gov',
        passwordHash: hashedPassword,
        firstName: 'Jane',
        lastName: 'Reviewer',
        roleId: roles[1].id,
        departmentId: departments[0].id,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'inspector@permitai.gov',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Inspector',
        roleId: roles[2].id,
        departmentId: departments[0].id,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'applicant@example.com',
        passwordHash: hashedPassword,
        firstName: 'Bob',
        lastName: 'Builder',
        roleId: roles[3].id,
        emailVerified: true,
        phone: '555-1234',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create an organization
  const organization = await prisma.organization.create({
    data: {
      name: 'ABC Construction Inc.',
      type: 'CONTRACTOR',
      licenseNumber: 'CONT-12345',
      licenseExpiry: new Date('2025-12-31'),
      insuranceNumber: 'INS-98765',
      insuranceExpiry: new Date('2025-06-30'),
      email: 'info@abcconstruction.com',
      phone: '555-5678',
      address: '123 Builder St',
      city: 'Construction City',
      state: 'CA',
      zipCode: '90210',
    },
  });

  console.log('✅ Created organization');

  // Create a project
  const project = await prisma.project.create({
    data: {
      projectNumber: 'PRJ-2024-001',
      name: 'New Residential Development',
      description: 'Single family home construction',
      address: '456 Main Street',
      city: 'Permit City',
      state: 'CA',
      zipCode: '90211',
      parcelNumber: 'APN-123-456-789',
      totalValuation: 500000,
      organizationId: organization.id,
    },
  });

  console.log('✅ Created project');

  // Create a sample permit
  const permit = await prisma.permit.create({
    data: {
      permitNumber: 'PERM-2024-0001',
      status: 'DRAFT',
      permitTypeId: permitTypes[0].id,
      projectId: project.id,
      organizationId: organization.id,
      applicantName: 'Bob Builder',
      applicantEmail: 'applicant@example.com',
      applicantPhone: '555-1234',
      createdById: users[3].id,
      formData: {
        projectDescription: 'New single family home construction',
        squareFootage: 2500,
        estimatedCost: 500000,
        contractorLicense: 'CONT-12345',
      },
    },
  });

  console.log('✅ Created sample permit');

  // Create system settings
  await prisma.systemSetting.createMany({
    data: [
      {
        key: 'system.name',
        value: 'PermitAI Development',
        description: 'System display name',
        isPublic: true,
      },
      {
        key: 'system.timezone',
        value: 'America/Los_Angeles',
        description: 'System timezone',
        isPublic: true,
      },
      {
        key: 'permit.number.format',
        value: 'PERM-{YYYY}-{0000}',
        description: 'Permit number format',
        isPublic: false,
      },
    ],
  });

  console.log('✅ Created system settings');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Admin: admin@permitai.gov / password123');
  console.log('   Reviewer: reviewer@permitai.gov / password123');
  console.log('   Inspector: inspector@permitai.gov / password123');
  console.log('   Applicant: applicant@example.com / password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });