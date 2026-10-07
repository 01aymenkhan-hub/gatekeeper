import { PrismaClient, Role, GateType, PersonCategory, VisitStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Gate Keeper Database Seed ---');

  // 1. Create Default Gates
  const mainGate = await prisma.gate.upsert({
    where: { name: 'Main Gate - Entry & Exit' },
    update: {},
    create: {
      name: 'Main Gate - Entry & Exit',
      description: 'Primary checkpoint for all visitors and vehicles',
      type: GateType.BOTH,
      active: true,
    },
  });

  const gate1 = await prisma.gate.upsert({
    where: { name: 'Visitor Gate 1' },
    update: {},
    create: {
      name: 'Visitor Gate 1',
      description: 'Pedestrian visitor entrance',
      type: GateType.ENTRY,
      active: true,
    },
  });

  const cargoGate = await prisma.gate.upsert({
    where: { name: 'Cargo & Logistics Gate' },
    update: {},
    create: {
      name: 'Cargo & Logistics Gate',
      description: 'Heavy vehicle and cargo delivery entrance/exit',
      type: GateType.BOTH,
      active: true,
    },
  });

  const exitGate = await prisma.gate.upsert({
    where: { name: 'North Exit Gate' },
    update: {},
    create: {
      name: 'North Exit Gate',
      description: 'Designated one-way exit gate',
      type: GateType.EXIT,
      active: true,
    },
  });

  console.log('✓ Gates created');

  // 2. Create Default Admin and Operator Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gatekeeper.com' },
    update: {},
    create: {
      name: 'Chief Security Officer',
      email: 'admin@gatekeeper.com',
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  const operatorPassHash = await bcrypt.hash('guard123', 10);
  const operatorUser = await prisma.user.upsert({
    where: { email: 'guard1@gatekeeper.com' },
    update: {},
    create: {
      name: 'Guard Tariq Mehmood',
      email: 'guard1@gatekeeper.com',
      passwordHash: operatorPassHash,
      role: Role.OPERATOR,
      active: true,
      gateAccess: {
        create: [
          { gateId: mainGate.id },
          { gateId: gate1.id },
        ],
      },
    },
  });

  console.log('✓ Admin & Operator users created');

  // 3. Create System Settings
  const settingsList = [
    { key: 'default_visitor_badge_prefix', value: 'GK-', description: 'Prefix for generated badge cards' },
    { key: 'auto_checkout_hours', value: '12', description: 'Hours before visit is flagged as overstay' },
    { key: 'require_visitor_photo', value: 'true', description: 'Whether visitor photo is mandatory' },
    { key: 'company_name', value: 'Industrial Zone Gate Facility', description: 'Facility organization name' },
  ];

  for (const s of settingsList) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✓ System settings initialized');

  // 4. Create Sample Person Profiles & Visits
  const samplePerson1 = await prisma.person.upsert({
    where: { cnicNumber: '42201-1234567-1' },
    update: {},
    create: {
      fullName: 'Muhammad Asif Khan',
      fatherHusbandName: 'Abdul Rehman Khan',
      cnicNumber: '42201-1234567-1',
      category: PersonCategory.VISITOR,
      gender: 'M',
      dateOfBirth: '14.08.1988',
      dateOfIssue: '01.01.2020',
      dateOfExpiry: '01.01.2030',
      phoneNumber: '03001234567',
      presentAddress: 'House 123, Sector 4, Karachi',
      isVip: false,
    },
  });

  const samplePerson2 = await prisma.person.upsert({
    where: { cnicNumber: '42101-9876543-2' },
    update: {},
    create: {
      fullName: 'Tariq Electronics Supplier',
      fatherHusbandName: 'Ghulam Rasool',
      cnicNumber: '42101-9876543-2',
      category: PersonCategory.VENDOR,
      company: 'Tariq Electricals Ltd',
      phoneNumber: '03129876543',
      isVip: false,
    },
  });

  const samplePerson3 = await prisma.person.upsert({
    where: { dlsNumber: 'DL-KHI-2024-884' },
    update: {},
    create: {
      fullName: 'Bilal Ahmed Logistics',
      fatherHusbandName: 'Ahmed Din',
      dlsNumber: 'DL-KHI-2024-884',
      category: PersonCategory.DELIVERY,
      licensingAuthority: 'DL Branch Karachi',
      company: 'Swift Express Cargo',
      phoneNumber: '03335551234',
      isVip: false,
    },
  });

  const samplePerson4 = await prisma.person.upsert({
    where: { cnicNumber: '35201-4455667-3' },
    update: {},
    create: {
      fullName: 'Dr. Zulfiqar Ali',
      fatherHusbandName: 'Ali Muhammad',
      cnicNumber: '35201-4455667-3',
      category: PersonCategory.SPECIAL_GUEST,
      company: 'Ministry of Industries',
      phoneNumber: '03451122334',
      isVip: true,
    },
  });

  // Create visits
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  await prisma.visit.upsert({
    where: { visitNumber: `VIS-${dateStr}-0001` },
    update: {},
    create: {
      visitNumber: `VIS-${dateStr}-0001`,
      personId: samplePerson1.id,
      hostName: 'Engr. Kamran Siddiqui',
      department: 'Operations',
      purpose: 'Technical consultation',
      visitorCardNo: 'GK-101',
      status: VisitStatus.CHECKED_IN,
      checkInTime: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
      entryGateId: mainGate.id,
      checkedInById: adminUser.id,
    },
  });

  await prisma.visit.upsert({
    where: { visitNumber: `VIS-${dateStr}-0002` },
    update: {},
    create: {
      visitNumber: `VIS-${dateStr}-0002`,
      personId: samplePerson2.id,
      hostName: 'Salman Farooq (Purchasing)',
      department: 'Procurement',
      purpose: 'Electrical parts dropoff',
      visitorCardNo: 'GK-102',
      status: VisitStatus.CHECKED_IN,
      checkInTime: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
      entryGateId: cargoGate.id,
      checkedInById: adminUser.id,
    },
  });

  await prisma.visit.upsert({
    where: { visitNumber: `VIS-${dateStr}-0003` },
    update: {},
    create: {
      visitNumber: `VIS-${dateStr}-0003`,
      personId: samplePerson3.id,
      hostName: 'Warehouse Incharge',
      department: 'Supply Chain',
      purpose: 'Raw material container 40ft',
      vehicleNo: 'TL-8920',
      visitorCardNo: 'GK-103',
      status: VisitStatus.CHECKED_OUT,
      checkInTime: new Date(Date.now() - 240 * 60 * 1000),
      checkOutTime: new Date(Date.now() - 60 * 60 * 1000),
      entryGateId: cargoGate.id,
      exitGateId: exitGate.id,
      checkedInById: adminUser.id,
      checkedOutById: operatorUser.id,
    },
  });

  await prisma.visit.upsert({
    where: { visitNumber: `VIS-${dateStr}-0004` },
    update: {},
    create: {
      visitNumber: `VIS-${dateStr}-0004`,
      personId: samplePerson4.id,
      hostName: 'Managing Director',
      department: 'Executive Office',
      purpose: 'Annual safety review',
      visitorCardNo: 'VIP-01',
      status: VisitStatus.CHECKED_IN,
      checkInTime: new Date(Date.now() - 30 * 60 * 1000),
      entryGateId: mainGate.id,
      checkedInById: adminUser.id,
    },
  });

  console.log('✓ Sample visits and active visitor occupancy seeded');
  console.log('--- Gate Keeper Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
