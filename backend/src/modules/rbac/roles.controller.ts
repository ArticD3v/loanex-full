import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/api-response';
import { rolesService } from './roles.service';

export class RolesController {
  list = async (_req: Request, res: Response) => {
    const roles = rolesService.listRoles().map((role) =>
      rolesService.getRole(role.id),
    );
    return sendSuccess(res, roles, 'Roles fetched');
  };

  get = async (req: Request, res: Response) => {
    const role = rolesService.getRole(String(req.params.roleId));
    return sendSuccess(res, role, 'Role fetched');
  };

  create = async (req: Request, res: Response) => {
    const role = await rolesService.createRole(req.body ?? {});
    return sendSuccess(res, role, 'Role created', 201);
  };

  update = async (req: Request, res: Response) => {
    const role = await rolesService.updateRole(String(req.params.roleId), req.body ?? {});
    return sendSuccess(res, role, 'Role updated');
  };

  remove = async (req: Request, res: Response) => {
    const result = await rolesService.deleteRole(String(req.params.roleId));
    return sendSuccess(res, result, 'Role deleted');
  };
}

export const rolesController = new RolesController();
