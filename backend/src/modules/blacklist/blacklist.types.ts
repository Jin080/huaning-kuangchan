export interface BlacklistResponse {
  id: string;
  enterpriseId: string;
  enterpriseName: string;
  lotId: string | null;
  lotTitle: string | null;
  reason: string;
  operatorId: string | null;
  blacklistedAt: Date;
  releasedAt: Date | null;
  releaseReason: string | null;
  releaseOperatorId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
