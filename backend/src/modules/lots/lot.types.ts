import { AttachmentCategory, LotStatus } from '@prisma/client';

export interface LotAttachmentResponse {
  id: string;
  category: AttachmentCategory;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  isSensitive: boolean;
}

export interface LotResponse {
  id: string;
  title: string;
  imageOneUrl: string;
  imageTwoUrl: string;
  startPrice: string;
  quantity: string;
  quantityUnit: string;
  supplier: string;
  origin: string;
  deadlineAt: Date;
  deliveryMethod: string;
  productInfo: string;
  productDetail: string;
  inspectionReportUrl: string;
  email: string;
  phone: string | null;
  mineralCategory: string | null;
  grade: string | null;
  assessedPrice: string | null;
  depositRatio: string | null;
  depositAmount: string;
  bidIncrement: string;
  announcementStartAt: Date;
  announcementEndAt: Date;
  biddingStartAt: Date;
  biddingEndAt: Date;
  customerNotice: string;
  extensionEnabled: boolean;
  extensionRule: string | null;
  currentHighestPrice: string | null;
  status: string;
  statusCode: LotStatus;
  releaseRejectReason: string | null;
  releaseSubmittedAt: Date | null;
  releaseReviewedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuctionRuleResponse {
  bidIncrement: string;
  biddingStartAt: Date;
  biddingEndAt: Date;
  extensionEnabled: boolean;
  extensionRule: string | null;
}

export interface DepositInstructionResponse {
  depositRatio: string | null;
  depositAmount: string;
}

export interface LotDetailResponse extends LotResponse {
  auctionRule: AuctionRuleResponse;
  depositInstruction: DepositInstructionResponse;
  attachments: LotAttachmentResponse[];
  inspectionReports: LotAttachmentResponse[];
}
