import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { visitId, identifier, exitGateId, notes } = body;

    let targetVisit = null;

    if (visitId) {
      targetVisit = await prisma.visit.findUnique({
        where: { id: visitId },
        include: { person: true, entryGate: true },
      });
    } else if (identifier) {
      const clean = identifier.trim();
      const norm = clean.replace(/[\s\-_./,\\]+/g, '').toLowerCase();
      const digitsOnly = clean.replace(/\D/g, '');
      let cnicVariants: string[] = [];
      if (digitsOnly.length >= 13) {
        cnicVariants.push(`${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 12)}-${digitsOnly.slice(12, 13)}`);
      } else if (digitsOnly.length >= 5) {
        cnicVariants.push(`${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`);
      }

      // Search active visit by visitNumber, visitorCardNo, CNIC, DLS, or phone
      targetVisit = await prisma.visit.findFirst({
        where: {
          status: 'CHECKED_IN',
          OR: [
            { visitNumber: { equals: clean, mode: 'insensitive' } },
            { visitorCardNo: { equals: clean, mode: 'insensitive' } },
            { person: { cnicNumber: { equals: clean, mode: 'insensitive' } } },
            { person: { dlsNumber: { equals: clean, mode: 'insensitive' } } },
            { person: { phoneNumber: clean } },
            ...(norm ? [
              { visitNumber: { contains: norm, mode: 'insensitive' as const } },
              { visitorCardNo: { contains: norm, mode: 'insensitive' as const } },
            ] : []),
            ...cnicVariants.map((v) => ({ person: { cnicNumber: { contains: v, mode: 'insensitive' as const } } })),
            ...(digitsOnly.length >= 5 ? [
              { person: { cnicNumber: { contains: digitsOnly, mode: 'insensitive' as const } } },
              { person: { phoneNumber: { contains: digitsOnly, mode: 'insensitive' as const } } },
            ] : []),
          ],
        },
        include: { person: true, entryGate: true },
      });
    }

    if (!targetVisit) {
      return NextResponse.json(
        { error: 'No active visit found with the provided details' },
        { status: 404 }
      );
    }

    if (targetVisit.status === 'CHECKED_OUT') {
      return NextResponse.json(
        { error: `This visit was already checked out at ${new Date(targetVisit.checkOutTime!).toLocaleString()}` },
        { status: 400 }
      );
    }

    // Resolve exit gate
    let resolvedExitGateId = exitGateId;
    if (!resolvedExitGateId) {
      resolvedExitGateId = targetVisit.entryGateId;
    }

    const updatedVisit = await prisma.$transaction(async (tx) => {
      const freshVisit = await tx.visit.findUnique({
        where: { id: targetVisit.id },
      });

      if (!freshVisit || freshVisit.status === 'CHECKED_OUT') {
        const alreadyOutErr: any = new Error(
          `This visit was already checked out${freshVisit?.checkOutTime ? ` at ${new Date(freshVisit.checkOutTime).toLocaleString()}` : ''}`
        );
        alreadyOutErr.status = 400;
        throw alreadyOutErr;
      }

      return tx.visit.update({
        where: { id: targetVisit.id },
        data: {
          status: 'CHECKED_OUT',
          checkOutTime: new Date(),
          exitGateId: resolvedExitGateId,
          checkedOutById: user.id,
          notes: notes
            ? targetVisit.notes
              ? `${targetVisit.notes}\nCheckout: ${notes}`
              : `Checkout: ${notes}`
            : targetVisit.notes,
        },
        include: {
          person: true,
          entryGate: true,
          exitGate: true,
          checkedInBy: { select: { id: true, name: true } },
          checkedOutBy: { select: { id: true, name: true } },
        },
      });
    });

    await logAudit({
      action: 'CHECK_OUT',
      entityType: 'Visit',
      entityId: updatedVisit.id,
      details: {
        visitNumber: updatedVisit.visitNumber,
        personName: updatedVisit.person.fullName,
        cnic: updatedVisit.person.cnicNumber,
        cardNo: updatedVisit.visitorCardNo,
        durationMinutes: Math.round(
          (new Date(updatedVisit.checkOutTime!).getTime() - new Date(updatedVisit.checkInTime).getTime()) / 60000
        ),
      },
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `${updatedVisit.person.fullName} checked out successfully`,
      visit: updatedVisit,
    });
  } catch (error: any) {
    if (error?.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Check-out error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete check out' },
      { status: 500 }
    );
  }
}
