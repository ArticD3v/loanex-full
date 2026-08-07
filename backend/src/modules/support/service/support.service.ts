import { NotFoundError } from '../../../common/errors/app-error';
import type { CreateSupportTicketBody } from '../dto/support.dto';
import { supportRepository } from '../repository/support.repository';

function mapTicket(ticket: {
  id: string;
  ticketNumber: string;
  issueType: string;
  subject: string;
  description: string;
  attachment: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    issueType: ticket.issueType,
    subject: ticket.subject,
    description: ticket.description,
    attachment: ticket.attachment,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export class SupportService {
  async create(userId: string, input: CreateSupportTicketBody) {
    const ticket = await supportRepository.create({
      userId,
      issueType: input.issueType,
      subject: input.subject,
      description: input.description,
      attachment: input.attachment,
    });

    return mapTicket(ticket);
  }

  async list(userId: string) {
    const tickets = await supportRepository.listForUser(userId);
    const items = tickets.map(mapTicket);
    return { items, totalItems: items.length };
  }

  async getById(ticketId: string, userId: string) {
    const ticket = await supportRepository.findByIdForUser(ticketId, userId);
    if (!ticket) {
      throw new NotFoundError('Support ticket not found.');
    }

    return mapTicket(ticket);
  }
}

export const supportService = new SupportService();
