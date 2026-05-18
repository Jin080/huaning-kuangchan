import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AttachmentCategory,
  Enterprise,
  EnterpriseCertificationStatus,
  Prisma,
} from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EnterpriseCertificationDto } from './dto/enterprise-certification.dto';
import { EnterpriseCertificationResponse } from './enterprise-certification.types';

const STATUS_LABELS: Record<EnterpriseCertificationStatus, string> = {
  [EnterpriseCertificationStatus.NOT_SUBMITTED]: '未提交',
  [EnterpriseCertificationStatus.PENDING]: '待审核',
  [EnterpriseCertificationStatus.APPROVED]: '审核通过',
  [EnterpriseCertificationStatus.REJECTED]: '审核驳回',
};

@Injectable()
export class EnterprisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog?: OperationLogService,
  ) {}

  async submitCertification(
    userId: string,
    dto: EnterpriseCertificationDto,
  ): Promise<EnterpriseCertificationResponse> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      return this.updateCertification(existing.id, userId, dto);
    }

    const enterprise = await this.prisma.enterprise.create({
      data: {
        ...this.toEnterpriseData(dto),
        certificationStatus: EnterpriseCertificationStatus.PENDING,
        certificationSubmittedAt: new Date(),
        certificationReviewerId: null,
        certificationReviewedAt: null,
        certificationRejectReason: null,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { enterpriseId: enterprise.id },
    });
    await this.createCertificationAttachments(enterprise.id, userId, dto);
    await this.record(userId, '提交企业认证', enterprise.id);

    return this.toResponse(enterprise);
  }

  async getMyCertification(
    userId: string,
  ): Promise<EnterpriseCertificationResponse | { status: string; statusCode: string }> {
    const enterprise = await this.findByUserId(userId);

    if (!enterprise) {
      return {
        status: STATUS_LABELS[EnterpriseCertificationStatus.NOT_SUBMITTED],
        statusCode: EnterpriseCertificationStatus.NOT_SUBMITTED,
      };
    }

    return this.toResponse(enterprise);
  }

  async resubmitMyCertification(
    userId: string,
    dto: EnterpriseCertificationDto,
  ): Promise<EnterpriseCertificationResponse> {
    const enterprise = await this.findByUserId(userId);

    if (!enterprise) {
      return this.submitCertification(userId, dto);
    }

    return this.updateCertification(enterprise.id, userId, dto);
  }

  async listForReview(): Promise<EnterpriseCertificationResponse[]> {
    const enterprises = await this.prisma.enterprise.findMany({
      where: {
        certificationStatus: {
          in: [
            EnterpriseCertificationStatus.PENDING,
            EnterpriseCertificationStatus.APPROVED,
            EnterpriseCertificationStatus.REJECTED,
          ],
        },
      },
      orderBy: [{ certificationSubmittedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return enterprises.map((enterprise) => this.toResponse(enterprise));
  }

  async approveCertification(
    enterpriseId: string,
    reviewerId: string,
  ): Promise<EnterpriseCertificationResponse> {
    await this.ensureEnterpriseExists(enterpriseId);

    const enterprise = await this.prisma.enterprise.update({
      where: { id: enterpriseId },
      data: {
        certificationStatus: EnterpriseCertificationStatus.APPROVED,
        certificationReviewerId: reviewerId,
        certificationReviewedAt: new Date(),
        certificationRejectReason: null,
      },
    });

    await this.record(reviewerId, '企业认证审核通过', enterprise.id);

    return this.toResponse(enterprise);
  }

  async rejectCertification(
    enterpriseId: string,
    reviewerId: string,
    rejectReason: string,
  ): Promise<EnterpriseCertificationResponse> {
    await this.ensureEnterpriseExists(enterpriseId);

    const enterprise = await this.prisma.enterprise.update({
      where: { id: enterpriseId },
      data: {
        certificationStatus: EnterpriseCertificationStatus.REJECTED,
        certificationReviewerId: reviewerId,
        certificationReviewedAt: new Date(),
        certificationRejectReason: rejectReason,
      },
    });

    await this.record(reviewerId, '企业认证审核驳回', enterprise.id);

    return this.toResponse(enterprise);
  }

  private async updateCertification(
    enterpriseId: string,
    userId: string,
    dto: EnterpriseCertificationDto,
  ): Promise<EnterpriseCertificationResponse> {
    const enterprise = await this.prisma.enterprise.update({
      where: { id: enterpriseId },
      data: {
        ...this.toEnterpriseData(dto),
        certificationStatus: EnterpriseCertificationStatus.PENDING,
        certificationSubmittedAt: new Date(),
        certificationReviewerId: null,
        certificationReviewedAt: null,
        certificationRejectReason: null,
      },
    });

    await this.createCertificationAttachments(enterprise.id, userId, dto);
    await this.record(userId, '重新提交企业认证', enterprise.id);

    return this.toResponse(enterprise);
  }

  private async findByUserId(userId: string): Promise<Enterprise | null> {
    return this.prisma.enterprise.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
    });
  }

  private async ensureEnterpriseExists(enterpriseId: string): Promise<void> {
    const enterprise = await this.prisma.enterprise.findUnique({
      where: { id: enterpriseId },
    });

    if (!enterprise) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '企业认证不存在',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async createCertificationAttachments(
    enterpriseId: string,
    userId: string,
    dto: EnterpriseCertificationDto,
  ): Promise<void> {
    const attachments: Prisma.AttachmentCreateManyInput[] = [];

    if (dto.qualificationFileUrl) {
      attachments.push({
        category: AttachmentCategory.ENTERPRISE_QUALIFICATION,
        fileName: '企业资质',
        fileUrl: dto.qualificationFileUrl,
        isSensitive: true,
        enterpriseId,
        uploadedById: userId,
      });
    }

    if (dto.businessLicenseFileUrl) {
      attachments.push({
        category: AttachmentCategory.BUSINESS_LICENSE,
        fileName: '营业执照',
        fileUrl: dto.businessLicenseFileUrl,
        isSensitive: true,
        enterpriseId,
        uploadedById: userId,
      });
    }

    if (attachments.length > 0) {
      await this.prisma.attachment.createMany({ data: attachments });
    }
  }

  private toEnterpriseData(
    dto: EnterpriseCertificationDto,
  ): Prisma.EnterpriseUncheckedCreateInput {
    return {
      name: dto.name,
      contactPerson: dto.contactPerson,
      contactPhone: dto.contactPhone,
      mainCategory: dto.mainCategory,
      legalRepresentative: dto.legalRepresentative,
      legalRepresentativeIdNo: dto.legalRepresentativeIdNo,
      email: dto.email,
      userCategory: dto.userCategory,
      userType: dto.userType,
      registeredCapital: dto.registeredCapital
        ? new Prisma.Decimal(dto.registeredCapital)
        : null,
      region: dto.region,
      address: dto.address,
      unifiedSocialCreditCode: dto.unifiedSocialCreditCode,
      companyProfile: dto.companyProfile,
      businessScope: dto.businessScope,
      paymentBankAccount: dto.paymentBankAccount,
      paymentAccountName: dto.paymentAccountName,
      paymentBankName: dto.paymentBankName,
      paymentBankLineNo: dto.paymentBankLineNo,
      paymentIsBankOfChina: dto.paymentIsBankOfChina,
      receivingBankAccount: dto.receivingBankAccount,
      receivingAccountName: dto.receivingAccountName,
      receivingBankName: dto.receivingBankName,
      receivingBankLineNo: dto.receivingBankLineNo,
      receivingIsBankOfChina: dto.receivingIsBankOfChina,
      agreementAccepted: dto.agreementAccepted,
    };
  }

  private toResponse(enterprise: Enterprise): EnterpriseCertificationResponse {
    return {
      id: enterprise.id,
      name: enterprise.name,
      contactPerson: enterprise.contactPerson,
      contactPhone: enterprise.contactPhone,
      mainCategory: enterprise.mainCategory,
      legalRepresentative: enterprise.legalRepresentative,
      legalRepresentativeIdNo: enterprise.legalRepresentativeIdNo,
      email: enterprise.email,
      userCategory: enterprise.userCategory,
      userType: enterprise.userType,
      registeredCapital: enterprise.registeredCapital?.toString() ?? null,
      region: enterprise.region,
      address: enterprise.address,
      unifiedSocialCreditCode: enterprise.unifiedSocialCreditCode,
      companyProfile: enterprise.companyProfile,
      businessScope: enterprise.businessScope,
      paymentBankAccount: enterprise.paymentBankAccount,
      paymentAccountName: enterprise.paymentAccountName,
      paymentBankName: enterprise.paymentBankName,
      paymentBankLineNo: enterprise.paymentBankLineNo,
      paymentIsBankOfChina: enterprise.paymentIsBankOfChina,
      receivingBankAccount: enterprise.receivingBankAccount,
      receivingAccountName: enterprise.receivingAccountName,
      receivingBankName: enterprise.receivingBankName,
      receivingBankLineNo: enterprise.receivingBankLineNo,
      receivingIsBankOfChina: enterprise.receivingIsBankOfChina,
      agreementAccepted: enterprise.agreementAccepted,
      status: STATUS_LABELS[enterprise.certificationStatus],
      statusCode: enterprise.certificationStatus,
      submittedAt: enterprise.certificationSubmittedAt,
      reviewedAt: enterprise.certificationReviewedAt,
      reviewerId: enterprise.certificationReviewerId,
      rejectReason: enterprise.certificationRejectReason,
    };
  }

  private async record(
    actorId: string | undefined,
    action: string,
    targetId: string,
  ): Promise<void> {
    await this.operationLog?.record({
      actorId,
      action,
      target: `enterprise:${targetId}`,
    });
  }
}
