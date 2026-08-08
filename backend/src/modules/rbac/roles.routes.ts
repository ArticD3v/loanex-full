import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { requirePermission } from '../../common/middleware/require-permission';
import { asyncHandler } from '../../common/utils/async-handler';
import { rolesController } from './roles.controller';

export const rolesRouter = Router();

rolesRouter.use(authenticate);

rolesRouter.get('/', requirePermission('roles.view'), asyncHandler(rolesController.list));
rolesRouter.get('/:roleId', requirePermission('roles.view'), asyncHandler(rolesController.get));
rolesRouter.post('/', requirePermission('roles.create'), asyncHandler(rolesController.create));
rolesRouter.patch('/:roleId', requirePermission('roles.edit'), asyncHandler(rolesController.update));
rolesRouter.delete('/:roleId', requirePermission('roles.delete'), asyncHandler(rolesController.remove));
