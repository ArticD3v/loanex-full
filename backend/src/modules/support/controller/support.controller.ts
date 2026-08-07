import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import type { CreateSupportTicketBody, TicketIdParam } from '../dto/support.dto';
import { supportService } from '../service/support.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class SupportController {
  create = async (req: Request, res: Response) => {
    const data = await supportService.create(
      requireUserId(req as AuthenticatedRequest),
      req.body as CreateSupportTicketBody,
    );
    return sendSuccess(res, data, 'Support ticket created', 201);
  };

  list = async (req: Request, res: Response) => {
    const data = await supportService.list(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'Support tickets fetched');
  };

  getById = async (req: Request, res: Response) => {
    const { ticketId } = req.validatedParams as TicketIdParam;
    const data = await supportService.getById(
      ticketId,
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Support ticket fetched');
  };
}

export const supportController = new SupportController();
