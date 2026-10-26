import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { generatePassCode } from '@/lib/qrUtils';
import {
  validateDocumentImageDataUrl,
  sanitizeVisitForClient,
  sanitizePersonForClient,
} from '@/lib/personSanitizer';

function formatCardNoForStorage(raw: string): string {
  return raw
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeCardKey(raw: string): string {
  return raw
    .trim()
    .replace(/[\s\-_.]+/g, '')
    .toUpperCase();
}

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
      cnicImageData,
      dlsImageData,
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

    // Manual Visitor Card Number validation: required, never auto-generated
    const formattedCardNo = visitorCardNo ? formatCardNoForStorage(String(visitorCardNo)) : '';
    const cardComparisonKey = visitorCardNo ? normalizeCardKey(String(visitorCardNo)) : '';

    if (!formattedCardNo || !cardComparisonKey) {
      return NextResponse.json(
        { error: 'Visitor Card Number is required. Please enter the number printed on the physical card.' },
        { status: 400 }
      );
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

    const cleanCnic = cnicNumber ? cnicNumber.trim() : null;
    const cleanDls = dlsNumber ? dlsNumber.trim() : null;
    const cleanPhone = phoneNumber ? phoneNumber.trim() : null;

    // Concurrency-safe transaction: acquire advisory lock on normalized card key,
    // verify card is not assigned to any active visitor, verify person is not blacklisted or already inside,
    // and atomically create the visit record.
    const { visit, person } = await prisma.$transaction(async (tx) => {
      // Acquire transaction-level PostgreSQL advisory lock for this specific physical card key
      const lockNamespaceKey = `gk_card_${cardComparisonKey}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockNamespaceKey}))`;

      // Check if any currently active visitor holds this physical card
      const activeVisitsWithCards = await tx.visit.findMany({
        where: {
          status: { in: ['CHECKED_IN', 'OVERSTAY'] },
          checkOutTime: null,
          visitorCardNo: { not: null },
        },
        select: {
          id: true,
          visitorCardNo: true,
          visitNumber: true,
        },
      });

      const duplicateCardVisit = activeVisitsWithCards.find(
        (v) => v.visitorCardNo && normalizeCardKey(v.visitorCardNo) === cardComparisonKey
      );

      if (duplicateCardVisit) {
        const conflictErr: any = new Error(
          'This card is already assigned. Please choose another available card.'
        );
        conflictErr.status = 409;
        conflictErr.code = 'CARD_ALREADY_ASSIGNED';
        throw conflictErr;
      }

      // Check if person exists by CNIC, DLS, or Phone
      let existingPerson = null;

      if (cleanCnic) {
        existingPerson = await tx.person.findUnique({
          where: { cnicNumber: cleanCnic },
        });
      }

      if (!existingPerson && cleanDls) {
        existingPerson = await tx.person.findUnique({
          where: { dlsNumber: cleanDls },
        });
      }

      if (!existingPerson && cleanPhone) {
        existingPerson = await tx.person.findFirst({
          where: { phoneNumber: cleanPhone },
        });
      }

      if (existingPerson && existingPerson.isBlacklisted) {
        const blacklistErr: any = new Error(
          `ACCESS DENIED: This person is blacklisted! Reason: ${existingPerson.blacklistReason || 'Security alert'}`
        );
        blacklistErr.status = 403;
        blacklistErr.blacklisted = true;
        blacklistErr.person = sanitizePersonForClient(existingPerson);
        throw blacklistErr;
      }

      // Check if person is currently already checked in (active visit)
      if (existingPerson) {
        const activeVisit = await tx.visit.findFirst({
          where: {
            personId: existingPerson.id,
            status: { in: ['CHECKED_IN', 'OVERSTAY'] },
            checkOutTime: null,
          },
        });

        if (activeVisit) {
          const alreadyInsideErr: any = new Error(
            `Warning: This person is already checked in (Visit #${activeVisit.visitNumber}). Please check them out before new entry.`
          );
          alreadyInsideErr.status = 409;
          alreadyInsideErr.activeVisitId = activeVisit.id;
          alreadyInsideErr.visitNumber = activeVisit.visitNumber;
          throw alreadyInsideErr;
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
        photoUrl: photoUrl || existingPerson?.photoUrl || null,
        company: company?.trim() || null,
        belongings: belongings?.trim() || null,
      };

      const savedPerson = existingPerson
        ? await tx.person.update({
            where: { id: existingPerson.id },
            data: personData,
          })
        : await tx.person.create({
            data: personData,
          });

      // Generate Visit Number: VIS-YYYYMMDD-XXXX
      const today = new Date();
      const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const todayVisitsCount = await tx.visit.count({
        where: {
          checkInTime: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
          },
        },
      });
      const visitNumber = `VIS-${datePrefix}-${String(todayVisitsCount + 1).padStart(4, '0')}`;
      const passCode = generatePassCode();

      const createdVisit = await tx.visit.create({
        data: {
          visitNumber,
          passCode,
          personId: savedPerson.id,
          hostName: hostName.trim(),
          department: department.trim(),
          purpose: purpose?.trim() || null,
          visitorCardNo: formattedCardNo,
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

      return { visit: createdVisit, person: savedPerson };
    });

    // Save scanned CNIC / DLS document images separately so OCR/registration and image-saving outcomes remain distinguishable
    let imageStorageStatus: 'saved' | 'failed' | 'none' = 'none';
    let imageStorageError: string | null = null;
    const hasIncomingCnicImage = typeof cnicImageData === 'string' && cnicImageData.trim().length > 0;
    const hasIncomingDlsImage = typeof dlsImageData === 'string' && dlsImageData.trim().length > 0;

    if (hasIncomingCnicImage || hasIncomingDlsImage) {
      const imageUpdateData: Record<string, string> = {};
      const validationErrors: string[] = [];

      if (hasIncomingCnicImage) {
        try {
          const cnicValidation = validateDocumentImageDataUrl(cnicImageData);
          imageUpdateData.cnicImageData = cnicValidation.normalizedDataUrl;
          imageUpdateData.cnicImageMime = cnicValidation.mime;
        } catch (err: any) {
          validationErrors.push(`CNIC image: ${err?.message || 'Invalid image'}`);
        }
      }

      if (hasIncomingDlsImage) {
        try {
          const dlsValidation = validateDocumentImageDataUrl(dlsImageData);
          imageUpdateData.dlsImageData = dlsValidation.normalizedDataUrl;
          imageUpdateData.dlsImageMime = dlsValidation.mime;
        } catch (err: any) {
          validationErrors.push(`Driving Licence image: ${err?.message || 'Invalid image'}`);
        }
      }

      if (validationErrors.length > 0) {
        imageStorageStatus = 'failed';
        imageStorageError = validationErrors.join('; ');
      }

      if (Object.keys(imageUpdateData).length > 0) {
        try {
          const updatedPersonWithImages = await prisma.person.update({
            where: { id: person.id },
            data: imageUpdateData,
          });
          visit.person = updatedPersonWithImages;
          if (validationErrors.length === 0) {
            imageStorageStatus = 'saved';
          }
        } catch (imgErr: any) {
          console.error('Failed to store identity document image for person:', person.id, imgErr?.message);
          imageStorageStatus = 'failed';
          imageStorageError = 'Failed to save scanned ID card image to database.';
        }
      }
    }

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
        imageStorageStatus,
      },
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Visitor checked in successfully',
      visit: sanitizeVisitForClient(visit),
      imageStorageStatus,
      imageStorageError,
    });
  } catch (error: any) {
    if (error?.status) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          blacklisted: error.blacklisted,
          person: error.person ? sanitizePersonForClient(error.person) : undefined,
          activeVisitId: error.activeVisitId,
          visitNumber: error.visitNumber,
        },
        { status: error.status }
      );
    }

    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete check-in' },
      { status: 500 }
    );
  }
}
