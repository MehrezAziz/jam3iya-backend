import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { z } from 'zod';

export const listBillsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  series: z.string().max(40).optional(),
  status: z.enum(['issued', 'cancelled']).optional(),
});
export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>;

export const issueDonationReceiptSchema = z.object({
  donationId: z.string().uuid(),
  series: z.string().max(40).optional().default('RECEIPT'),
  isTaxReceipt: z.boolean().optional().default(true),
  recipientName: z.string().min(1).max(200),
  recipientFiscalId: z.string().max(80).optional(),
});
export type IssueDonationReceiptDto = z.infer<typeof issueDonationReceiptSchema>;

@Injectable()
export class BillService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListBillsQuery) {
    const where: Prisma.BillWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.series ? { series: query.series } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          number: true,
          series: true,
          yearIssued: true,
          issuedAt: true,
          totalMinor: true,
          currency: true,
          status: true,
          isTaxReceipt: true,
          recipientType: true,
          recipientSnapshot: true,
          linkedDonationId: true,
        },
      }),
    ]);
    return {
      total,
      items: items.map((b) => ({
        ...b,
        totalMinor: Number(b.totalMinor),
        recipientSnapshot: b.recipientSnapshot as Record<string, unknown>,
      })),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getById(organizationId: string, billId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, organizationId, deletedAt: null },
      select: {
        id: true,
        number: true,
        series: true,
        yearIssued: true,
        issuedAt: true,
        totalMinor: true,
        currency: true,
        status: true,
        isTaxReceipt: true,
        recipientType: true,
        recipientSnapshot: true,
        linkedDonationId: true,
        organization: {
          select: { legalName: true, fiscalId: true, address: true, phone: true, logoFileId: true },
        },
        linkedDonation: {
          select: {
            id: true,
            kind: true,
            isAnonymous: true,
            spendCategory: true,
            receivedAt: true,
            donorNameSnapshot: true,
            campaign: { select: { name: true } },
          },
        },
      },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    return {
      ...bill,
      totalMinor: Number(bill.totalMinor),
      recipientSnapshot: bill.recipientSnapshot as Record<string, unknown>,
      linkedDonation: bill.linkedDonation
        ? {
            ...bill.linkedDonation,
            campaignName: bill.linkedDonation.campaign?.name ?? null,
          }
        : null,
    };
  }

  async issueDonationReceipt(organizationId: string, issuedById: string | null, dto: IssueDonationReceiptDto) {
    const donation = await this.prisma.donation.findFirst({
      where: { id: dto.donationId, organizationId, deletedAt: null, kind: 'cash' },
    });
    if (!donation) throw new NotFoundException('Cash donation not found');

    const existing = await this.prisma.bill.findFirst({
      where: { organizationId, linkedDonationId: donation.id, deletedAt: null, status: 'issued' },
    });
    if (existing) {
      return { id: existing.id, number: existing.number, alreadyExists: true };
    }

    const year = new Date().getFullYear();
    const series = dto.series ?? 'RECEIPT';

    return this.prisma.$transaction(async (tx) => {
      const counter = await tx.billNumberCounter.upsert({
        where: {
          organizationId_series_year: { organizationId, series, year },
        },
        create: { organizationId, series, year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const seq = counter.lastValue;
      const number = `${series}-${year}-${String(seq).padStart(7, '0')}`;

      const org = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { legalName: true, fiscalId: true },
      });

      const bill = await tx.bill.create({
        data: {
          organizationId,
          number,
          series,
          yearIssued: year,
          recipientType: 'donor',
          recipientId: donation.donorId,
          recipientSnapshot: {
            name: dto.recipientName,
            fiscalId: dto.recipientFiscalId ?? donation.donorFiscalIdSnapshot ?? null,
          },
          issuedById: issuedById ?? undefined,
          totalMinor: donation.amountMinor,
          currency: donation.currency,
          status: 'issued',
          isTaxReceipt: dto.isTaxReceipt ?? true,
          organizationFiscalIdSnapshot: org?.fiscalId ?? null,
          linkedDonationId: donation.id,
          lines: {
            create: {
              position: 0,
              label: 'Donation',
              quantity: 1,
              unitPriceMinor: donation.amountMinor,
              amountMinor: donation.amountMinor,
            },
          },
        },
        select: { id: true, number: true, issuedAt: true, totalMinor: true, currency: true },
      });

      return {
        ...bill,
        totalMinor: Number(bill.totalMinor),
        alreadyExists: false,
      };
    });
  }
}
