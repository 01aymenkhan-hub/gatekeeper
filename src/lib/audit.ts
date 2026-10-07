import prisma from './prisma';

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any> | string;
  performedById?: string;
  ipAddress?: string;
}) {
  try {
    const detailsStr =
      typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : params.details || null;

    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: detailsStr,
        performedById: params.performedById || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
