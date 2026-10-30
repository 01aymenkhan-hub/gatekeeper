import crypto from 'crypto';
import prisma from '@/lib/prisma';

export interface CreateNotificationInput {
  recipientUserId?: string | null;
  recipientRole?: 'ADMIN' | 'OPERATOR' | 'EMPLOYEE' | null;
  type: string;
  title: string;
  message: string;
  visitId?: string | null;
  visitorId?: string | null;
  invitationId?: string | null;
  parcelId?: string | null;
  vipGuestId?: string | null;
  operatorUserId?: string | null;
  targetUrl?: string | null;
  dedupeKey?: string | null;
}

export interface AppNotificationRow {
  id: string;
  recipientUserId: string | null;
  recipientRole: string | null;
  type: string;
  title: string;
  message: string;
  visitId: string | null;
  visitorId: string | null;
  invitationId: string | null;
  parcelId: string | null;
  vipGuestId: string | null;
  operatorUserId: string | null;
  targetUrl: string | null;
  dedupeKey: string | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Safely creates an in-app notification in `app_notifications`.
 * Never throws so that a notification failure will not rollback or break a valid transaction.
 */
export async function createAppNotification(
  input: CreateNotificationInput
): Promise<boolean> {
  try {
    const id = `ntf_${crypto.randomBytes(10).toString('hex')}`;
    const dedupeKey =
      input.dedupeKey && input.dedupeKey.trim()
        ? input.dedupeKey.trim()
        : `${input.type}_${id}`;
    const visitIdValue = input.visitId ?? input.visitorId ?? null;

    await prisma.$executeRaw`
      INSERT INTO "app_notifications" (
        "id",
        "recipientUserId",
        "recipientRole",
        "type",
        "title",
        "message",
        "visitId",
        "invitationId",
        "parcelId",
        "vipGuestId",
        "operatorUserId",
        "targetUrl",
        "dedupeKey",
        "isRead",
        "createdAt"
      )
      VALUES (
        ${id},
        ${input.recipientUserId ?? null},
        ${input.recipientRole ?? null},
        ${input.type},
        ${input.title},
        ${input.message},
        ${visitIdValue},
        ${input.invitationId ?? null},
        ${input.parcelId ?? null},
        ${input.vipGuestId ?? null},
        ${input.operatorUserId ?? null},
        ${input.targetUrl ?? null},
        ${dedupeKey},
        false,
        NOW()
      )
      ON CONFLICT ("dedupeKey") DO NOTHING
    `;
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
    return false;
  }
}
