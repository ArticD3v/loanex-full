import type { SupportIssueType } from '../../../types/database.types';
import { jsonDb } from '../../../config/json-db';

function generateTicketNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 4; i += 1) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `LX-SUP-${Date.now().toString(36).toUpperCase()}${random}`;
}

export class SupportRepository {
  listForUser(userId: string) {
    const records = jsonDb.findMany('supportTicket', { userId });
    records.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return records;
  }

  findByIdForUser(ticketId: string, userId: string) {
    return jsonDb.findOne('supportTicket', { id: ticketId, userId });
  }

  create(input: {
    userId: string;
    issueType: SupportIssueType;
    subject: string;
    description: string;
    attachment?: string;
  }) {
    return jsonDb.insert('supportTicket', {
      userId: input.userId,
      ticketNumber: generateTicketNumber(),
      issueType: input.issueType,
      subject: input.subject,
      description: input.description,
      attachment: input.attachment ?? null,
    });
  }
}

export const supportRepository = new SupportRepository();
