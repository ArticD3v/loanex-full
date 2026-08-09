import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import { orderService } from '../service/order.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class OrderController {
  list = async (req: Request, res: Response) => {
    const data = await orderService.list(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'Orders fetched');
  };

  adminList = async (req: Request, res: Response) => {
    const data = await orderService.adminList();
    return sendSuccess(res, data, 'All orders fetched');
  };

  adminGetById = async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    const data = await orderService.adminGetById(orderId);
    return sendSuccess(res, data, 'Order details fetched');
  };

  getCurrent = async (req: Request, res: Response) => {
    const data = await orderService.getCurrent(requireUserId(req as AuthenticatedRequest));
    return sendSuccess(res, data, 'Current order fetched');
  };

  getById = async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    const data = await orderService.getById(
      orderId,
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Order fetched');
  };

  cancelOrder = async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    const data = await orderService.cancelOrder(
      requireUserId(req as AuthenticatedRequest),
      orderId,
    );
    return sendSuccess(res, data, 'Order cancelled');
  };

  getTracking = async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    const data = await orderService.getTracking(
      orderId,
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Order tracking fetched');
  };

  getReceipt = async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    const receipt = await orderService.getReceipt(
      orderId,
      requireUserId(req as AuthenticatedRequest),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.fileName}"`);
    res.setHeader('Content-Length', String(receipt.buffer.length));
    return res.send(receipt.buffer);
  };

  getInvoice = async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    const invoice = await orderService.getInvoice(
      orderId,
      requireUserId(req as AuthenticatedRequest),
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.fileName}"`);
    res.setHeader('Content-Length', String(invoice.buffer.length));
    return res.send(invoice.buffer);
  };

  adminUpdateStatus = async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId ?? '');
    const body = req.body as {
      status?: string;
      remarks?: string;
      location?: string;
      courierPartner?: string;
      trackingNumber?: string;
      warehouse?: string;
      deliveryAddress?: string;
    };

    const data = await orderService.adminUpdateStatus(orderId, {
      status: String(body.status ?? ''),
      remarks: body.remarks,
      location: body.location,
      courierPartner: body.courierPartner,
      trackingNumber: body.trackingNumber,
      warehouse: body.warehouse,
      deliveryAddress: body.deliveryAddress,
      updatedBy: (req as AuthenticatedRequest).user?.sub ?? 'admin',
    });

    return sendSuccess(res, data, 'Order status updated');
  };
}

export const orderController = new OrderController();
