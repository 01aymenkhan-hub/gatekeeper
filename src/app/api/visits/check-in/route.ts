import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { generatePassCode } from '@/lib/qrUtils';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      fatherHusbandName,
      cnicNumber,
      dlsNumber,
      category = 'VISITOR',
      gender,
      dateOfBirth,
      dateOfIssue,
      dateOfExpiry,
      licensingAuthority,
      identification,
      presentAddress,
      permanentAddress,
      phoneNumber,
      photoUrl,
      company,
      hostName,
      department,
      purpose,
      visitorCardNo,
      vehicleNo,
      belongings,
      entryGateId,
      notes,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!hostName || !hostName.trim()) {
      return NextResponse.json({ error: 'Host person name is required' }, { status: 400 });
    }

    if (!department || !department.trim()) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    // Phone number validation: 11 digits starting with 03
    if (phoneNumber && !/^03\d{9}$/.test(phoneNumber.trim())) {
      return NextResponse.json(
        { error: 'Phone number must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)' },
        { status: 400 }
      );
    }

    // Resolve Gate: either provided or first active gate
    let resolvedGateId = entryGateId;
    if (!resolvedGateId) {
      const defaultGate = await prisma.gate.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      });
      if (defaultGate) {
        resolvedGateId = defaultGate.id;
      } else {
        // Create a default gate if none exists
        const newGate = await prisma.gate.create({
          data: {
            name: 'Main Gate - Entry & Exit',
            type: 'BOTH',
            active: true,
          },
        });
        resolvedGateId = newGate.id;
      }
    }

    // Check if person exists by CNIC, DLS, or Phone
    let person = null;
    const cleanCnic = cnicNumber ? cnicNumber.trim() : null;
    const cleanDls = dlsNumber ? dlsNumber.trim() : null;
    const cleanPhone = phoneNumber ? phoneNumber.trim() : null;

    if (cleanCnic) {
      person = await prisma.person.findUnique({
        where: { cnicNumber: cleanCnic },
      });
    }

    if (!person && cleanDls) {
      person = await prisma.person.findUnique({
        where: { dlsNumber: cleanDls },
      });
    }

    if (!person && cleanPhone) {
      person = await prisma.person.findFirst({
        where: { phoneNumber: cleanPhone },
      });
    }

    if (person && person.isBlacklisted) {
      return NextResponse.json(
        {
          error: `ACCESS DENIED: This person is blacklisted! Reason: ${person.blacklistReason || 'Security alert'}`,
          blacklisted: true,
          person,
        },
        { status: 403 }
      );
    }

    // Check if person is currently already checked in (active visit)
    if (person) {
      const activeVisit = await prisma.visit.findFirst({
        where: {
          personId: person.id,
          status: 'CHECKED_IN',
        },
      });

      if (activeVisit) {
        return NextResponse.json(
          {
            error: `Warning: This person is already checked in (Visit #${activeVisit.visitNumber}). Please check them out before new entry.`,
            activeVisitId: activeVisit.id,
            visitNumber: activeVisit.visitNumber,
          },
          { status: 409 }
        );
      }
    }

    // Upsert person
    const personData = {
      fullName: fullName.trim(),
      fatherHusbandName: fatherHusbandName?.trim() || null,
      cnicNumber: cleanCnic,
      dlsNumber: cleanDls,
      category: category as any,
      gender: gender?.trim() || null,
      dateOfBirth: dateOfBirth?.trim() || null,
      dateOfIssue: dateOfIssue?.trim() || null,
      dateOfExpiry: dateOfExpiry?.trim() || null,
      licensingAuthority: licensingAuthority?.trim() || null,
      identification: identification?.trim() || null,
      presentAddress: presentAddress?.trim() || null,
      permanentAddress: permanentAddress?.trim() || null,
      phoneNumber: cleanPhone,
      photoUrl: photoUrl || null,
      company: company?.trim() || null,
      belongings: belongings?.trim() || null,
    };

    if (person) {
      person = await prisma.person.update({
        where: { id: person.id },
        data: personData,
      });
    } else {
      person = await prisma.person.create({
        data: personData,
      });
    }

    // Generate Visit Number: VIS-YYYYMMDD-XXXX
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const todayVisitsCount = await prisma.visit.count({
      where: {
        checkInTime: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
        },
      },
    });
    const visitNumber = `VIS-${datePrefix}-${String(todayVisitsCount + 1).padStart(4, '0')}`;
    const passCode = generatePassCode();

    const visit = await prisma.visit.create({
      data: {
        visitNumber,
        passCode,
        personId: person.id,
        hostName: hostName.trim(),
        department: department.trim(),
        purpose: purpose?.trim() || null,
        visitorCardNo: visitorCardNo?.trim() || null,
        vehicleNo: vehicleNo?.trim() || null,
        belongings: belongings?.trim() || null,
        status: 'CHECKED_IN',
        entryGateId: resolvedGateId,
        checkedInById: user.id,
        notes: notes?.trim() || null,
      },
      include: {
        person: true,
        entryGate: true,
        checkedInBy: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      action: 'CHECK_IN',
      entityType: 'Visit',
      entityId: visit.id,
      details: {
        visitNumber: visit.visitNumber,
        personName: person.fullName,
        cnic: person.cnicNumber,
        host: visit.hostName,
        department: visit.department,
        cardNo: visit.visitorCardNo,
      },
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Visitor checked in successfully',
      visit,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete check-in' },
      { status: 500 }
    );
  }
}
