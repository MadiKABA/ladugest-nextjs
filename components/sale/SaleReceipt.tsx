'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useProductStore } from '@/stores/product-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useAuthStore } from '@/stores/auth-store';
import { useSaleStore } from '@/stores/sale-store';
import { toast } from 'react-toastify';
import ProductSearchSelect from '@/components/product/SelectSearchProduit';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface SaleItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface Product {
    id: string;
    name: string;
    price: number;
    priceHalf?: number;
    priceWholesale?: number;
    codeBar?: string;
}

export default function CreateSalePage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const companyId = user?.company?.id ?? '';
    const userId = user?.id ?? '';

    const { products, fetchProducts } = useProductStore();
    const { customers, fetchCustomers } = useCustomerStore();
    const { createSale } = useSaleStore();

    const codeBarInputRef = useRef<HTMLInputElement>(null);
    const [scannedCode, setScannedCode] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [customerId, setCustomerId] = useState('');
    const [paymentType, setPaymentType] = useState<'CASH' | 'MOBILE_MONEY' | 'CARD'>('CASH');
    const [saleMode, setSaleMode] = useState<'DETAIL' | 'DEMI_GROS' | 'GROS'>('DETAIL');

    useEffect(() => {
        if (companyId) {
            fetchProducts(companyId);
            fetchCustomers(companyId);
        }
    }, [companyId, fetchProducts, fetchCustomers]);

    useEffect(() => {
        codeBarInputRef.current?.focus();
    }, []);

    const handleScanCodeBar = () => {
        const found = products.find(p => p.codeBar === scannedCode.trim());
        if (!found) {
            toast.error('Produit non trouvé.');
        } else {
            handleAddProduct(found);
        }
        setScannedCode('');
        codeBarInputRef.current?.focus();
    };

    const handleAddProduct = (product: Product) => {
        const exists = items.find(i => i.productId === product.id);
        const price =
            saleMode === 'GROS'
                ? product.priceWholesale ?? product.price
                : saleMode === 'DEMI_GROS'
                    ? product.priceHalf ?? product.price
                    : product.price;

        if (exists) {
            setItems(prev =>
                prev.map(i =>
                    i.productId === product.id
                        ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
                        : i
                )
            );
        } else {
            setItems(prev => [
                ...prev,
                {
                    productId: product.id,
                    name: product.name,
                    quantity: 1,
                    unitPrice: price,
                    total: price,
                },
            ]);
        }
    };

    const handleRemoveProduct = (id: string) => {
        setItems(prev => prev.filter(i => i.productId !== id));
    };

    const handleQuantityChange = (id: string, qty: number) => {
        setItems(prev =>
            prev.map(i =>
                i.productId === id ? { ...i, quantity: qty, total: qty * i.unitPrice } : i
            )
        );
    };

    const total = items.reduce((acc, i) => acc + i.total, 0);

    const handleSubmit = async () => {
        try {
            await createSale({
                companyId,
                userId,
                customerId: customerId || undefined,
                paymentType,
                saleMode,
                status: 'CONFIRMED',
                total,
                saleItems: items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    total: i.total,
                })),
                payments: [
                    {
                        amount: total,
                        montantRecu: total,
                        monnaieRendue: 0,
                        method: paymentType,
                    },
                ],
            });

            toast.success('Vente enregistrée');
            router.push('/admin/sales');
        } catch (err) {
            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error('Erreur de création');
            }
        }
    };

    const clientName = customerId
        ? customers.find(c => c.id === customerId)?.name
        : 'Client passager';

    return (
        <div className="p-6 space-y-6 bg-white rounded shadow grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
                <h1 className="text-xl font-semibold">Nouvelle vente</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label>Client</Label>
                        <select
                            className="w-full border px-3 py-2 rounded"
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                        >
                            <option value="">Client passager</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label>Mode de vente</Label>
                        <select
                            className="w-full border px-3 py-2 rounded"
                            value={saleMode}
                            onChange={(e) => setSaleMode(e.target.value as typeof saleMode)}
                        >
                            <option value="DETAIL">Détail</option>
                            <option value="DEMI_GROS">Demi-gros</option>
                            <option value="GROS">Gros</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label>Moyen de paiement</Label>
                        <select
                            className="w-full border px-3 py-2 rounded"
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.target.value as typeof paymentType)}
                        >
                            <option value="CASH">Espèces</option>
                            <option value="MOBILE_MONEY">Mobile Money</option>
                            <option value="CARD">Carte</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label>Scanner un produit</Label>
                        <Input
                            ref={codeBarInputRef}
                            value={scannedCode}
                            onChange={(e) => setScannedCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScanCodeBar()}
                            placeholder="Code-barres"
                            autoFocus
                        />
                    </div>

                    <div>
                        <Label>Ou sélectionner un produit</Label>
                        <ProductSearchSelect
                            products={products}
                            onSelect={(id) => {
                                const found = products.find(p => p.id === id);
                                if (found) {
                                    handleAddProduct(found);
                                    codeBarInputRef.current?.focus();
                                }
                            }}
                        />
                    </div>
                </div>

                {items.length > 0 && (
                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="text-left p-2">Produit</th>
                                    <th className="text-right p-2">Qté</th>
                                    <th className="text-right p-2">PU</th>
                                    <th className="text-right p-2">Total</th>
                                    <th className="text-center p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.productId}>
                                        <td className="p-2">{item.name}</td>
                                        <td className="p-2 text-right">
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleQuantityChange(item.productId, Number(e.target.value))}
                                                className="w-20 text-right"
                                            />
                                        </td>
                                        <td className="p-2 text-right">{item.unitPrice.toFixed(2)}</td>
                                        <td className="p-2 text-right">{item.total.toFixed(2)}</td>
                                        <td className="p-2 text-center">
                                            <Button size="icon" variant="ghost" onClick={() => handleRemoveProduct(item.productId)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-right mt-2 font-bold">Total: {total.toFixed(2)} €</p>
                    </div>
                )}

                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit}>
                    Enregistrer
                </Button>
            </div>

            {/* Reçu */}
            <div className="border rounded shadow p-4 text-sm">
                <h2 className="text-center font-bold text-lg">{user?.company?.name}</h2>
                <p className="text-center italic text-xs mb-2">{user?.company?.address}</p>
                <hr className="my-2" />
                <p><strong>Date :</strong> {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                <p><strong>Client :</strong> {clientName}</p>
                <p><strong>Caissier :</strong> {user?.name}</p>
                <hr className="my-2" />
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-dashed">
                            <th className="text-left">Produit</th>
                            <th className="text-right">Qté</th>
                            <th className="text-right">PU</th>
                            <th className="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.productId}>
                                <td>{item.name}</td>
                                <td className="text-right">{item.quantity}</td>
                                <td className="text-right">{item.unitPrice.toFixed(2)}</td>
                                <td className="text-right">{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <hr className="my-2" />
                <p className="text-right font-semibold">Total: {total.toFixed(2)} €</p>
                <p className="text-center mt-4 text-xs italic">Merci pour votre achat !</p>
            </div>
        </div>
    );
}
