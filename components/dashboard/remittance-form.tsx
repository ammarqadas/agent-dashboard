"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, XCircle, Banknote, ArrowRightLeft } from "lucide-react"
import { apiClient } from "@/lib/api"
import { Separator } from "@/components/ui/separator"

export function RemittanceForm() {
    const [formData, setFormData] = useState({
        senderName: '',
        senderMobile: '',
        receiverName: '',
        receiverMobile: '',
        amount: '',
        currency: '',
        distWallet: '',
        notes: ''
    })

    const [currencies, setCurrencies] = useState<any[]>([])
    const [distWallets, setDistWallets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState<any>(null)

    useEffect(() => {
        const fetchCurrencies = async () => {
            try {
                const response = await apiClient.getCurrencies()
                if (response.success && response.docs) {
                    setCurrencies(response.docs)
                }
            } catch (err) {
                console.error("Failed to fetch currencies:", err)
            }
        }
        fetchCurrencies()
    }, [])

    useEffect(() => {
        const fetchDistWallets = async () => {
            try {
                const response = await apiClient.getDistWallets()
                if (response.success && response.docs) {
                    setDistWallets(response.docs)
                }
            } catch (err) {
                console.error("Failed to fetch distribution wallets:", err)
            }
        }
        fetchDistWallets()
    }, [])

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(null)
        setIsLoading(true)

        try {
            const amountNum = parseFloat(formData.amount)
            if (isNaN(amountNum) || amountNum <= 0) {
                setError("الرجاء إدخال مبلغ صحيح")
                setIsLoading(false)
                return
            }

            if (!formData.currency) {
                setError("الرجاء اختيار العملة")
                setIsLoading(false)
                return
            }

            const response = await apiClient.agentRemittance({
                senderName: formData.senderName,
                senderMobile: formData.senderMobile,
                receiverName: formData.receiverName,
                receiverMobile: formData.receiverMobile,
                amount: amountNum,
                currency: formData.currency,
                notes: formData.notes || undefined,
                distWallet: formData.distWallet || undefined,
            })

            if (response.success) {
                setSuccess(response.data)
                // Reset form
                setFormData({
                    senderName: '',
                    senderMobile: '',
                    receiverName: '',
                    receiverMobile: '',
                    amount: '',
                    currency: '',
                    distWallet: '',
                    notes: ''
                })
            } else {
                setError(response.message || "فشل في إرسال الحوالة")
            }

        } catch (err: any) {
            setError(err.message || "حدث خطأ غير متوقع")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="border bg-card/80 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                    إرسال حوالة
                </CardTitle>
                <CardDescription>
                    إرسال حوالة مالية من خلال حساب الوكيل
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Sender Details */}
                    <div className="space-y-4 rounded-lg bg-muted/20 p-4 border border-dashed">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">بيانات المرسل</Label>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="senderName">اسم المرسل</Label>
                                <Input
                                    id="senderName"
                                    placeholder="الاسم الثلاثي"
                                    value={formData.senderName}
                                    onChange={(e) => handleChange('senderName', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senderMobile">جوال المرسل</Label>
                                <Input
                                    id="senderMobile"
                                    type="tel"
                                    dir="ltr"
                                    className="text-right"
                                    placeholder="7xxxxxxxx"
                                    value={formData.senderMobile}
                                    onChange={(e) => handleChange('senderMobile', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Receiver Details */}
                    <div className="space-y-4 rounded-lg bg-muted/20 p-4 border border-dashed">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">بيانات المستلم</Label>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="receiverName">اسم المستلم</Label>
                                <Input
                                    id="receiverName"
                                    placeholder="الاسم الثلاثي"
                                    value={formData.receiverName}
                                    onChange={(e) => handleChange('receiverName', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receiverMobile">جوال المستلم</Label>
                                <Input
                                    id="receiverMobile"
                                    type="tel"
                                    dir="ltr"
                                    className="text-right"
                                    placeholder="7xxxxxxxx"
                                    value={formData.receiverMobile}
                                    onChange={(e) => handleChange('receiverMobile', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Amount Details */}
                    <div className="space-y-4 p-2">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">المبلغ</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    dir="ltr"
                                    className="text-right text-lg font-bold"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => handleChange('amount', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">العملة</Label>
                                <Select value={formData.currency} onValueChange={(v) => handleChange('currency', v)} required>
                                    <SelectTrigger className="text-right [&>span]:text-right">
                                        <SelectValue placeholder="اختر العملة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((curr) => (
                                            <SelectItem key={curr.id} value={String(curr.id)} className="text-right">
                                                {curr.code} - {curr.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="distWallet">تحويل عبر شبكة</Label>
                                <Select value={formData.distWallet} onValueChange={(v) => handleChange('distWallet', v)}>
                                    <SelectTrigger className="text-right [&>span]:text-right">
                                        <SelectValue placeholder="اختر الشبكة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {distWallets.map((wallet) => (
                                            <SelectItem key={wallet.id} value={String(wallet.id)} className="text-right">
                                                {wallet.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                                <Input
                                    id="notes"
                                    placeholder="غرض التحويل..."
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <div>
                                <AlertTitle>خطأ</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </div>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <div>
                                <AlertTitle className="text-emerald-800 dark:text-emerald-200 font-bold">
                                    تم إرسال الحوالة بنجاح!
                                </AlertTitle>
                                <AlertDescription className="text-emerald-700 dark:text-emerald-300 mt-2 space-y-1 text-sm">
                                    <div className="flex justify-between border-b border-emerald-500/20 pb-1">
                                        <span>رقم العملية:</span>
                                        <span className="font-mono font-bold">{success.transactionId}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-emerald-500/20 pb-1">
                                        <span>رقم الحوالة:</span>
                                        <span className="font-mono font-bold">{success.expressid}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>المبلغ:</span>
                                        <span className="font-bold">{success.amount} {success.currency}</span>
                                    </div>
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto min-w-40 bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700">
                            {isLoading ? "جاري الإرسال..." : "إرسال الحوالة"}
                        </Button>
                    </div>

                </form>
            </CardContent>
        </Card>
    )
}
