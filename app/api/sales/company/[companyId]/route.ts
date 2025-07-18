import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest, props: { params: Promise<{ companyId: string }> }) {
    const params = await props.params;
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const clientId = searchParams.get('clientId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: Prisma.SaleWhereInput = {
            companyId: params.companyId,
        };

        if (clientId) {
            where.customerId = clientId;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const date = new Date(endDate);
                date.setDate(date.getDate() + 1); // inclure toute la journée
                where.createdAt.lte = date;
            }
        }

        const sales = await prisma.sale.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                customer: true,
                user: true,
                payments: true,
                saleItems: true,
            },
        });

        return NextResponse.json(sales);
    } catch (error) {
        console.error('[GET SALES]', error);
        return NextResponse.json(
            { message: 'Erreur lors de la récupération des ventes' },
            { status: 500 }
        );
    }
}
