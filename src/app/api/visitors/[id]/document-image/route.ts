import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { validateDocumentImageDataUrl, getPersonImageFlagsMap } from '@/lib/personSanitizer';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both ADMIN and OPERATOR roles are authorized checkpoint staff
    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const docType = (searchParams.get('type') || 'cnic').toLowerCase();

    if (docType !== 'cnic' && docType !== 'dls') {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        cnicImageData: string | null;
        cnicImageMime: string | null;
        dlsImageData: string | null;
        dlsImageMime: string | null;
      }>
    >`
      SELECT
        "id",
        "cnicImageData",
        "cnicImageMime",
        "dlsImageData",
        "dlsImageMime"
      FROM "persons"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const person = rows[0];
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const rawImage = docType === 'cnic' ? person.cnicImageData : person.dlsImageData;
    const storedMime = docType === 'cnic' ? person.cnicImageMime : person.dlsImageMime;

    if (!rawImage) {
      return NextResponse.json({ error: 'Document image not available' }, { status: 404 });
    }

    const parsed = validateDocumentImageDataUrl(rawImage);
    const contentType = storedMime || parsed.mime || 'image/jpeg';

    return new NextResponse(new Uint8Array(parsed.buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Error loading identity document image:', err);
    return NextResponse.json(
      { error: 'Unable to load identity document image' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Support both { cnicImageData, dlsImageData } and { type: 'cnic' | 'dls', imageDataUrl }
    let incomingCnic: string | undefined = body.cnicImageData;
    let incomingDls: string | undefined = body.dlsImageData;

    if (typeof body.imageDataUrl === 'string' && body.imageDataUrl.trim()) {
      const normalizedType = String(body.type || 'cnic').toLowerCase();
      if (normalizedType === 'dls') {
        incomingDls = body.imageDataUrl;
      } else {
        incomingCnic = body.imageDataUrl;
      }
    }

    if (!incomingCnic && !incomingDls) {
      return NextResponse.json(
        { error: 'At least one identity document image is required' },
        { status: 400 }
      );
    }

    const existingPerson = await prisma.person.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });

    if (!existingPerson) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    let validCnicData: string | null = null;
    let validCnicMime: string | null = null;
    let validDlsData: string | null = null;
    let validDlsMime: string | null = null;
    const updatedTypes: string[] = [];

    if (typeof incomingCnic === 'string' && incomingCnic.trim()) {
      const parsedCnic = validateDocumentImageDataUrl(incomingCnic);
      validCnicData = parsedCnic.normalizedDataUrl;
      validCnicMime = parsedCnic.mime;
      updatedTypes.push('CNIC');
    }

    if (typeof incomingDls === 'string' && incomingDls.trim()) {
      const parsedDls = validateDocumentImageDataUrl(incomingDls);
      validDlsData = parsedDls.normalizedDataUrl;
      validDlsMime = parsedDls.mime;
      updatedTypes.push('DLS');
    }

    if (validCnicData && validDlsData) {
      await prisma.$executeRaw`
        UPDATE "persons"
        SET "cnicImageData" = ${validCnicData},
            "cnicImageMime" = ${validCnicMime},
            "dlsImageData" = ${validDlsData},
            "dlsImageMime" = ${validDlsMime},
            "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
    } else if (validCnicData) {
      await prisma.$executeRaw`
        UPDATE "persons"
        SET "cnicImageData" = ${validCnicData},
            "cnicImageMime" = ${validCnicMime},
            "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
    } else if (validDlsData) {
      await prisma.$executeRaw`
        UPDATE "persons"
        SET "dlsImageData" = ${validDlsData},
            "dlsImageMime" = ${validDlsMime},
            "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
    }

    await logAudit({
      action: 'SAVE_DOCUMENT_IMAGE',
      entityType: 'Person',
      entityId: id,
      details: {
        personName: existingPerson.fullName,
        documentTypes: updatedTypes,
      },
      performedById: user.id,
    });

    const flagsMap = await getPersonImageFlagsMap([id]);
    const flags = flagsMap.get(id) || {
      hasCnicImage: Boolean(validCnicData),
      hasDlsImage: Boolean(validDlsData),
    };

    return NextResponse.json({
      success: true,
      hasCnicImage: flags.hasCnicImage,
      hasDlsImage: flags.hasDlsImage,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Failed to save identity document image';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
