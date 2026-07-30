import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createMemberSchema,
  updateMemberSchema,
  listMembersQuerySchema,
  memberIdParamSchema,
  freezeMembershipSchema,
  renewMembershipSchema,
} from './members.validation';
import * as membersController from './members.controller';

const router = Router();

// Every route here requires authentication; write access is restricted
// to front-of-house / management roles, never Coach or Client directly.
const MANAGE_ROLES = ['OWNER', 'HEAD_COACH', 'RECEPTIONIST'] as const;
const VIEW_ROLES = ['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST', 'ACCOUNTANT'] as const;

router.use(authenticate);

router.get('/', authorize(...VIEW_ROLES), validate({ query: listMembersQuerySchema }), membersController.listMembersHandler);

router.post('/', authorize(...MANAGE_ROLES), validate({ body: createMemberSchema }), membersController.createMemberHandler);

router.get('/:id', authorize(...VIEW_ROLES), validate({ params: memberIdParamSchema }), membersController.getMemberHandler);

router.patch(
  '/:id',
  authorize(...MANAGE_ROLES),
  validate({ params: memberIdParamSchema, body: updateMemberSchema }),
  membersController.updateMemberHandler,
);

router.delete('/:id', authorize('OWNER', 'HEAD_COACH'), validate({ params: memberIdParamSchema }), membersController.deleteMemberHandler);

router.post(
  '/:id/freeze',
  authorize(...MANAGE_ROLES),
  validate({ params: memberIdParamSchema, body: freezeMembershipSchema }),
  membersController.freezeMembershipHandler,
);

router.post(
  '/:id/unfreeze',
  authorize(...MANAGE_ROLES),
  validate({ params: memberIdParamSchema }),
  membersController.unfreezeMembershipHandler,
);

router.post(
  '/:id/renew',
  authorize(...MANAGE_ROLES),
  validate({ params: memberIdParamSchema, body: renewMembershipSchema }),
  membersController.renewMembershipHandler,
);

export default router;
