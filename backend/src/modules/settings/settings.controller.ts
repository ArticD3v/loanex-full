import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/api-response';
import { settingsService } from './settings.service';

export class SettingsController {
  getSettings = async (_req: Request, res: Response) => {
    return sendSuccess(res, settingsService.getCodSettings(), 'Settings fetched');
  };

  updateCodMaxAmount = async (req: Request, res: Response) => {
    const data = await settingsService.updateCodMaxAmount(Number(req.body?.codMaxAmount));
    return sendSuccess(res, data, 'COD max amount updated');
  };
}

export const settingsController = new SettingsController();
