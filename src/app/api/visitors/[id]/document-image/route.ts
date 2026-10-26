import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_DECODED_BYTES = 2.5 * 1024 * 1024; // 2.5 MB max stored image size

function parseValidatedDataUrl(raw: string): {
  mime: string;
  buffer: Buffer;
  normalizedDataUrl: string;
} {
  const trimmed = raw.trim();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(trimmed);
  if (!match) {
    throw new Error('Invalid image format. Expected a base64-encoded image data URL.');
  }

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error('Unsupported document image type. Allowed types: JPEG, PNG, WebP.');
  }

  const base64Clean = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Empty document image payload.');
  }

  if (buffer.byteLength > MAX_DECODED_BYTES) {
    throw new Error('Document image exceeds the maximum allowed size (2.5 MB).');
  }

  const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
  return {
    mime: normalizedMime,
    buffer,
    normalizedDataUrl: `data:${normalizedMime};base64,${base64Clean}`,
  };
}

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

    const person = await prisma.person.findUnique({
      where: { id },
      select: {
        id: true,
        cnicImageData: true,
        cnicImageMime: true,
        dlsImageData: true,
        dlsImageMime: true,
      },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const rawImage = docType === 'cnic' ? person.cnicImageData : person.dlsImageData;
    const storedMime = docType === 'cnic' ? person.cnicImageMime : person.dlsImageMime;

    if (!rawImage) {
      return NextResponse.json({ error: 'Document image not available' }, { status: 404 });
    }

    const parsed = parseValidatedDataUrl(rawImage);
    const contentType = storedMime || parsed.mime || 'image/jpeg';

    return new NextResponse(new Uint8Array(parsed.buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
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
    const { cnicImageData, dlsImageData } = body;

    if (!cnicImageData && !dlsImageData) {
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

    const updateData: {
      cnicImageData?: string;
      cnicImageMime?: string;
      dlsImageData?: string;
      dlsImageMime?: string;
    } = {};

    const updatedTypes: string[] = [];

    if (typeof cnicImageData === 'string' && cnicImageData.trim()) {
      const parsedCnic = parseValidatedDataUrl(cnicImageData);
      updateData.cnicImageData = parsedCnic.normalizedDataUrl;
      updateData.cnicImageMime = parsedCnic.mime;
      updatedTypes.push('CNIC');
    }

    if (typeof dlsImageData === 'string' && dlsImageData.trim()) {
      const parsedDls = parseValidatedDataUrl(dlsImageData);
      updateData.dlsImageData = parsedDls.normalizedDataUrl;
      updateData.dlsImageMime = parsedDls.mime;
      updatedTypes.push('DLS');
    }

    await prisma.person.update({
      where: { id },
      data: updateData,
    });

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

    return NextResponse.json({
      success: true,
      hasCnicImage: Boolean(updateData.cnicImageData),
      hasDlsImage: Boolean(updateData.dlsImageData),
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Failed to save identity document image';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
