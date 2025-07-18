import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type InvoiceItemInput = {
    name: string;
    quantity: number;
    unitPrice: number;
    total?: number;
};

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    try {
        const id = params.id;
        const body = await req.json();
        const {
            title,
            total,
            dueDate,
            issueDate,
            status,
            quoteId,
            tva,
            note,
            comment,
            invoiceItems,
        }: {
            title: string;
            total: number;
            dueDate?: string;
            issueDate?: string;
            status: string;
            quoteId?: string;
            tva?: number;
            note?: string;
            comment?: string;
            invoiceItems: InvoiceItemInput[];
        } = body;

        // Supprime les anciens éléments de facture
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

        // Met à jour la facture
        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                title,
                total,
                dueDate: dueDate ? new Date(dueDate) : null,
                issueDate: issueDate ? new Date(issueDate) : undefined,
                status,
                quoteId,
                tva,
                note,
                comment,
                invoiceItems: {
                    create: invoiceItems.map((item: InvoiceItemInput) => ({
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total ?? item.quantity * item.unitPrice,
                    })),
                },
            },
            include: { invoiceItems: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Erreur modification facture:', error);
        return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
    }
}
