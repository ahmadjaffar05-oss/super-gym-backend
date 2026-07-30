import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as membersService from './members.service';

export const createMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  const member = await membersService.createMember(req.body);
  res.status(201).json({ success: true, data: { member } });
});

export const listMembersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await membersService.listMembers(req.query as never);
  res.status(200).json({ success: true, data: result });
});

export const getMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  const member = await membersService.getMemberById(req.params.id);
  res.status(200).json({ success: true, data: { member } });
});

export const updateMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  const member = await membersService.updateMember(req.params.id, req.body);
  res.status(200).json({ success: true, data: { member } });
});

export const deleteMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  await membersService.deleteMember(req.params.id);
  res.status(204).send();
});

export const freezeMembershipHandler = asyncHandler(async (req: Request, res: Response) => {
  const membership = await membersService.freezeMembership(req.params.id, req.body);
  res.status(200).json({ success: true, data: { membership } });
});

export const unfreezeMembershipHandler = asyncHandler(async (req: Request, res: Response) => {
  const membership = await membersService.unfreezeMembership(req.params.id);
  res.status(200).json({ success: true, data: { membership } });
});

export const renewMembershipHandler = asyncHandler(async (req: Request, res: Response) => {
  const membership = await membersService.renewMembership(req.params.id, req.body);
  res.status(201).json({ success: true, data: { membership } });
});
