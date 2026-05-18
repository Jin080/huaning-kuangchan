import { Inject, Injectable } from '@nestjs/common';
import { Contract, ContractStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { PortalDashboardResponse } from './portal.types';

type CompletedContractWithPrice = Pick<Contract, 'id' | 'completedAt'> & {
  auctionResult: {
    finalPrice: Prisma.Decimal;
  };
};

type PrismaServiceLike = {
  contract: {
    findMany(
      args: Prisma.ContractFindManyArgs,
    ): Promise<CompletedContractWithPrice[]>;
  };
};

@Injectable()
export class PortalService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
  ) {}

  async getDashboard(now = new Date()): Promise<PortalDashboardResponse> {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);

    const [currentYearCompleted, totalCompleted] = await Promise.all([
      this.prisma.contract.findMany({
        where: {
          status: ContractStatus.COMPLETED,
          completedAt: {
            gte: yearStart,
            lt: nextYearStart,
          },
        },
        include: { auctionResult: true },
      }),
      this.prisma.contract.findMany({
        where: { status: ContractStatus.COMPLETED },
        include: { auctionResult: true },
      }),
    ]);

    return {
      currentYearCompletedCount: currentYearCompleted.length,
      currentYearCompletedAmount: this.sumFinalPrice(currentYearCompleted),
      totalCompletedCount: totalCompleted.length,
      totalCompletedAmount: this.sumFinalPrice(totalCompleted),
    };
  }

  private sumFinalPrice(contracts: CompletedContractWithPrice[]): string {
    return contracts
      .reduce(
        (sum, contract) => sum.plus(contract.auctionResult.finalPrice),
        new Prisma.Decimal(0),
      )
      .toString();
  }
}
