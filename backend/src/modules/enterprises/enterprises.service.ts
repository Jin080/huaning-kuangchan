import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AttachmentCategory,
  Enterprise,
  EnterpriseCertificationStatus,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
  Prisma,
  RoleCode,
} from '@prisma/client';

import { PasswordService } from '../../auth/password.service';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EnterpriseCertificationDto,
  EnterpriseRegisterDto,
} from './dto/enterprise-certification.dto';
import {
  EnterpriseCertificationMaterialResponse,
  EnterpriseCertificationResponse,
} from './enterprise-certification.types';

const STATUS_LABELS: Record<EnterpriseCertificationStatus, string> = {
  [EnterpriseCertificationStatus.NOT_SUBMITTED]: '未提交',
  [EnterpriseCertificationStatus.PENDING]: '待审核',
  [EnterpriseCertificationStatus.APPROVED]: '审核通过',
  [EnterpriseCertificationStatus.REJECTED]: '审核驳回',
};
const CERTIFICATION_MATERIAL_LABELS: Partial<Record<AttachmentCategory, string>> = {
  [AttachmentCategory.BUSINESS_LICENSE]: '营业执照',
  [AttachmentCategory.ENTERPRISE_QUALIFICATION]: '企业资质',
  [AttachmentCategory.ENTERPRISE_AUTHORIZATION]: '授权材料',
};
const CERTIFICATION_MATERIAL_CATEGORIES = [
  AttachmentCategory.BUSINESS_LICENSE,
  AttachmentCategory.ENTERPRISE_QUALIFICATION,
  AttachmentCategory.ENTERPRISE_AUTHORIZATION,
];

@Injectable()
export class EnterprisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog?: OperationLogService,
    private readonly passwordService?: PasswordService,
  ) {}

  async registerEnterprise(
    dto: EnterpriseRegisterDto,
  ): Promise<EnterpriseCertificationResponse> {
    if (dto.password !== dto.confirmPassword) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '确认密码与密码不一致',
        HttpStatus.BAD_REQUEST,
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { code: RoleCode.ENTERPRISE },
    });

    if (!role) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '企业角色不存在',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { enterprise, materials, userId } = await this.prisma.$transaction(
      async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { username: dto.username },
      });

      if (existingUser) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          '用户名已存在',
          HttpStatus.CONFLICT,
        );
      }

      const existingEnterprise = await tx.enterprise.findUnique({
        where: { unifiedSocialCreditCode: dto.unifiedSocialCreditCode },
      });

      if (existingEnterprise) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          '统一社会信用代码已存在',
          HttpStatus.CONFLICT,
        );
      }

      const passwordHash = await this.passwordService?.hash(dto.password);

      if (!passwordHash) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          '密码服务不可用',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const enterprise = await tx.enterprise.create({
        data: {
          ...this.toEnterpriseData(dto),
          certificationStatus: EnterpriseCertificationStatus.PENDING,
          certificationSubmittedAt: new Date(),
          certificationReviewerId: null,
          certificationReviewedAt: null,
          certificationRejectReason: null,
        },
      });

      const user = await tx.user.create({
        data: {
          username: dto.username,
          passwordHash,
          roleId: role.id,
          enterpriseId: enterprise.id,
        },
      });

      await this.createCertificationAttachments(tx, enterprise.id, user.id, dto);

      return {
        enterprise,
        materials: await this.findCertificationMaterials(enterprise.id, tx),
        userId: user.id,
      };
    });

    await this.record(userId, '企业公开注册提交认证', enterprise.id).catch(() => undefined);

    return this.toResponse(enterprise, materials);
  }

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
    await this.createCertificationAttachments(this.prisma, enterprise.id, userId, dto);
    await this.record(userId, '提交企业认证', enterprise.id);

    return this.toResponse(enterprise, await this.findCertificationMaterials(enterprise.id));
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

    return this.toResponse(enterprise, await this.findCertificationMaterials(enterprise.id));
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

    const materialsByEnterpriseId = await this.findCertificationMaterialsByEnterpriseIds(
      enterprises.map((enterprise) => enterprise.id),
    );

    return enterprises.map((enterprise) =>
      this.toResponse(enterprise, materialsByEnterpriseId.get(enterprise.id) ?? []),
    );
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

    return this.toResponse(enterprise, await this.findCertificationMaterials(enterprise.id));
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
    await this.prisma.notification.create({
      data: {
        type: NotificationType.LOSE,
        channel: NotificationChannel.IN_APP,
        receiverEnterpriseId: enterprise.id,
        lotTitle: '企业认证审核驳回',
        content: `企业认证审核驳回，驳回原因：${rejectReason}`,
        sendStatus: NotificationSendStatus.PENDING,
      },
    });

    return this.toResponse(enterprise, await this.findCertificationMaterials(enterprise.id));
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

    await this.createCertificationAttachments(this.prisma, enterprise.id, userId, dto);
    await this.record(userId, '重新提交企业认证', enterprise.id);

    return this.toResponse(enterprise, await this.findCertificationMaterials(enterprise.id));
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
    prisma: Pick<Prisma.TransactionClient, 'attachment'> | Pick<PrismaService, 'attachment'>,
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

    if (dto.authorizationMaterialUrl) {
      attachments.push({
        category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
        fileName: '授权材料',
        fileUrl: dto.authorizationMaterialUrl,
        isSensitive: true,
        enterpriseId,
        uploadedById: userId,
      });
    }

    if (attachments.length > 0) {
      await prisma.attachment.createMany({ data: attachments });
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

  private async findCertificationMaterials(
    enterpriseId: string,
    prisma: Pick<Prisma.TransactionClient, 'attachment'> | Pick<PrismaService, 'attachment'> = this.prisma,
  ): Promise<EnterpriseCertificationMaterialResponse[]> {
    const materialsByEnterpriseId = await this.findCertificationMaterialsByEnterpriseIds([
      enterpriseId,
    ], prisma);

    return materialsByEnterpriseId.get(enterpriseId) ?? [];
  }

  private async findCertificationMaterialsByEnterpriseIds(
    enterpriseIds: string[],
    prisma: Pick<Prisma.TransactionClient, 'attachment'> | Pick<PrismaService, 'attachment'> = this.prisma,
  ): Promise<Map<string, EnterpriseCertificationMaterialResponse[]>> {
    const result = new Map<string, EnterpriseCertificationMaterialResponse[]>();

    if (enterpriseIds.length === 0) {
      return result;
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        enterpriseId: { in: enterpriseIds },
        category: { in: CERTIFICATION_MATERIAL_CATEGORIES },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        enterpriseId: true,
        category: true,
        fileName: true,
        fileUrl: true,
      },
    });

    attachments.forEach((attachment) => {
      if (!attachment.enterpriseId) {
        return;
      }

      const materials = result.get(attachment.enterpriseId) ?? [];
      materials.push({
        id: attachment.id,
        category: attachment.category,
        label: CERTIFICATION_MATERIAL_LABELS[attachment.category] ?? '企业材料',
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
      });
      result.set(attachment.enterpriseId, materials);
    });

    return result;
  }

  private toResponse(
    enterprise: Enterprise,
    materials: EnterpriseCertificationMaterialResponse[],
  ): EnterpriseCertificationResponse {
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
      materials,
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
