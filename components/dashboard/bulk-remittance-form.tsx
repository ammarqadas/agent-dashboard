"use client"

import { useState, useEffect, useRef } from "react"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CheckCircle2, XCircle, Upload, FileSpreadsheet, Trash2, ArrowRightLeft } from "lucide-react"
import { apiClient } from "@/lib/api"
import Papa from "papaparse"
import * as XLSX from "xlsx"

interface RemittanceRow {
    amount: number
    receiverName: string
    receiverMobile: string
    status?: 'pending' | 'success' | 'failed'
    message?: string
    transactionId?: string
    expressid?: string
}

interface BulkRemittanceResponse {
    total: number
    successful: number
    failed: number
    results: Array<{
        success: boolean
        message?: string
        transactionId?: string
        expressid?: string
        [key: string]: any
    }>
}

export function BulkRemittanceForm() {
    const [file, setFile] = useState<File | null>(null)
    const [data, setData] = useState<RemittanceRow[]>([])
    const [sharedData, setSharedData] = useState({
        senderName: '',
        senderMobile: '',
        currency: '',
        distWallet: '',
        notes: ''
    })
    const [currencies, setCurrencies] = useState<any[]>([])
    const [distWallets, setDistWallets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [summary, setSummary] = useState<{ total: number, success: number, failed: number } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError("")
        setSuccess("")
        setSummary(null)

        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            parseFile(selectedFile)
        }
    }

    const parseFile = (file: File) => {
        setIsLoading(true)
        setData([])

        const reader = new FileReader()

        if (file.name.endsWith(".csv")) {
            reader.onload = (e) => {
                const text = e.target?.result as string
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const parsedData: RemittanceRow[] = results.data.map((row: any) => ({
                            amount: parseFloat(row.amount || row.Amount || row['المبلغ'] || '0'),
                            receiverName: String(row.receiverName || row.ReceiverName || row['اسم المستلم'] || row.receiver_name || row['اسم المستلم'] || ''),
                            receiverMobile: String(row.receiverMobile || row.ReceiverMobile || row['جوال المستلم'] || row.receiver_mobile || row['جوال المستلم'] || ''),
                            status: 'pending' as const
                        })).filter(row => row.receiverName && row.receiverMobile && row.amount > 0)

                        if (parsedData.length === 0) {
                            setError("لم يتم العثور على بيانات صالحة في الملف. تأكد من وجود أعمدة amount, receiverName, receiverMobile")
                        } else {
                            setData(parsedData)
                        }
                        setIsLoading(false)
                    },
                    error: (err: Error) => {
                        setError(`فشل في قراءة الملف: ${err.message}`)
                        setIsLoading(false)
                    }
                })
            }
            reader.readAsText(file)
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: "array" })
                    const sheetName = workbook.SheetNames[0]
                    const sheet = workbook.Sheets[sheetName]
                    const json = XLSX.utils.sheet_to_json(sheet)

                    const parsedData: RemittanceRow[] = json.map((row: any) => ({
                        amount: parseFloat(row.amount || row.Amount || row['المبلغ'] || '0'),
                        receiverName: String(row.receiverName || row.ReceiverName || row['اسم المستلم'] || row.receiver_name || ''),
                        receiverMobile: String(row.receiverMobile || row.ReceiverMobile || row['جوال المستلم'] || row.receiver_mobile || ''),
                        status: 'pending' as const
                    })).filter(row => row.receiverName && row.receiverMobile && row.amount > 0)

                    if (parsedData.length === 0) {
                        setError("لم يتم العثور على بيانات صالحة في الملف. تأكد من وجود أعمدة amount, receiverName, receiverMobile")
                    } else {
                        setData(parsedData)
                    }
                } catch (err: any) {
                    setError(`فشل في قراءة ملف Excel: ${err.message}`)
                } finally {
                    setIsLoading(false)
                }
            }
            reader.readAsArrayBuffer(file)
        } else {
            setError("صيغة الملف غير مدعومة. يرجى استخدام CSV أو Excel")
            setIsLoading(false)
        }
    }

    const handleSharedDataChange = (field: string, value: string) => {
        setSharedData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        if (data.length === 0) return
        if (!sharedData.senderName || !sharedData.senderMobile || !sharedData.currency || !sharedData.distWallet) {
            setError("الرجاء ملء جميع الحقول المطلوبة (اسم المرسل، جوال المرسل، العملة، تحويل عبر شبكة)")
            return
        }

        setProcessing(true)
        setError("")
        setSuccess("")
        setSummary(null)

        try {
            const remittances = data.map(row => ({
                amount: row.amount,
                receiverName: row.receiverName,
                receiverMobile: row.receiverMobile
            }))

            const response = await apiClient.agentBulkRemittance({
                senderName: sharedData.senderName,
                senderMobile: sharedData.senderMobile,
                currency: sharedData.currency,
                distWallet: sharedData.distWallet,
                remittances,
                notes: sharedData.notes || undefined
            })

            if (response.success && response.data) {
                const data = response.data as BulkRemittanceResponse
                setSuccess(response.message || "تمت المعالجة بنجاح")
                setSummary({
                    total: data.total,
                    success: data.successful,
                    failed: data.failed
                })

                // Update local data with results
                if (data.results) {
                    const resultMap = new Map(data.results.map((r: any, idx: number) => [idx, r]))
                    setData(prev => prev.map((row, idx) => {
                        const res = resultMap.get(idx)
                        return res ? { ...row, status: (res.success ? 'success' : 'failed') as 'success' | 'failed', message: res.message, transactionId: res.transactionId, expressid: res.expressid } : row
                    }))
                }

            } else {
                setError(response.message || "فشل في معالجة الحوالات الجماعية")
            }
        } catch (err: any) {
            setError(err.message || "حدث خطأ غير متوقع")
        } finally {
            setProcessing(false)
        }
    }

    const clearFile = () => {
        setFile(null)
        setData([])
        setError("")
        setSuccess("")
        setSummary(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <Card className="border bg-card/80 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                    إرسال حوالات جماعية
                </CardTitle>
                <CardDescription>
                    رفع ملف (CSV أو Excel) لإرسال عدة حوالات دفعة واحدة
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Shared Fields - Sender Details */}
                <div className="space-y-4 rounded-lg bg-muted/20 p-4 border border-dashed">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">بيانات المرسل (موحدة لجميع الحوالات)</Label>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="senderName">اسم المرسل</Label>
                            <Input
                                id="senderName"
                                placeholder="الاسم الثلاثي"
                                value={sharedData.senderName}
                                onChange={(e) => handleSharedDataChange('senderName', e.target.value)}
                                required
                                disabled={processing}
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
                                value={sharedData.senderMobile}
                                onChange={(e) => handleSharedDataChange('senderMobile', e.target.value)}
                                required
                                disabled={processing}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">العملة</Label>
                            <Select value={sharedData.currency} onValueChange={(v) => handleSharedDataChange('currency', v)} disabled={processing}>
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
                            <Select value={sharedData.distWallet} onValueChange={(v) => handleSharedDataChange('distWallet', v)} disabled={processing}>
                                <SelectTrigger className="text-right [&>span]:text-right">
                                    <SelectValue placeholder="اختر تحويل عبر شبكة" />
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
                                placeholder="ملاحظات عامة..."
                                value={sharedData.notes}
                                onChange={(e) => handleSharedDataChange('notes', e.target.value)}
                                disabled={processing}
                            />
                        </div>
                    </div>
                </div>

                {/* File Upload Area */}
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
                        }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault()
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const droppedFile = e.dataTransfer.files[0]
                            setFile(droppedFile)
                            parseFile(droppedFile)
                        }
                    }}
                >
                    <div className="flex flex-col items-center gap-3">
                        {file ? (
                            <>
                                <FileSpreadsheet className="h-10 w-10 text-primary" />
                                <div className="text-sm font-medium">{file.name}</div>
                                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                                <Button variant="ghost" size="sm" onClick={clearFile} disabled={processing} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4 ml-2" />
                                    حذف الملف
                                </Button>
                            </>
                        ) : (
                            <>
                                <Upload className="h-10 w-10 text-muted-foreground" />
                                <div className="text-sm text-muted-foreground">
                                    اسحب وأفلت الملف هنا أو <Button variant="link" className="px-1" onClick={() => fileInputRef.current?.click()}>تصفح</Button>
                                </div>
                                <div className="text-xs text-muted-foreground/70">
                                    يدعم ملفات .csv, .xlsx (الأعمدة المطلوبة: amount, receiverName, receiverMobile)
                                </div>
                            </>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                            disabled={processing}
                        />
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
                                تمت العملية
                            </AlertTitle>
                            <AlertDescription className="text-emerald-700 dark:text-emerald-300 mt-1">
                                {success}
                            </AlertDescription>
                        </div>
                    </Alert>
                )}

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-muted/30 p-3 rounded-lg text-center border">
                            <div className="text-xs text-muted-foreground">الإجمالي</div>
                            <div className="text-xl font-bold">{summary.total}</div>
                        </div>
                        <div className="bg-emerald-500/10 p-3 rounded-lg text-center border border-emerald-500/20">
                            <div className="text-xs text-emerald-600">ناجحة</div>
                            <div className="text-xl font-bold text-emerald-700">{summary.success}</div>
                        </div>
                        <div className="bg-red-500/10 p-3 rounded-lg text-center border border-red-500/20">
                            <div className="text-xs text-red-600">فاشلة</div>
                            <div className="text-xl font-bold text-red-700">{summary.failed}</div>
                        </div>
                    </div>
                )}

                {/* Data Preview Table */}
                {data.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/30 px-4 py-2 text-sm font-medium border-b flex justify-between items-center">
                            <span>معاينة البيانات ({data.length})</span>
                            {processing && <span className="text-xs animate-pulse text-primary">جاري المعالجة...</span>}
                        </div>
                        <div className="max-h-[300px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">اسم المستلم</TableHead>
                                        <TableHead className="text-right">جوال المستلم</TableHead>
                                        <TableHead className="text-right">المبلغ</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row, idx) => (
                                        <TableRow key={idx} className={row.status === 'success' ? 'bg-emerald-500/5' : row.status === 'failed' ? 'bg-red-500/5' : ''}>
                                            <TableCell className="font-medium">{row.receiverName}</TableCell>
                                            <TableCell>{row.receiverMobile}</TableCell>
                                            <TableCell>{row.amount}</TableCell>
                                            <TableCell>
                                                {row.status === 'pending' && <span className="text-muted-foreground">قيد الانتظار</span>}
                                                {row.status === 'success' && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-emerald-600 flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> نجاح
                                                        </span>
                                                        {row.expressid && (
                                                            <span className="text-xs text-muted-foreground">رقم: {row.expressid}</span>
                                                        )}
                                                    </div>
                                                )}
                                                {row.status === 'failed' && (
                                                    <span className="text-red-600 flex items-center gap-1" title={row.message}>
                                                        <XCircle className="h-3 w-3" /> فشل
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={data.length === 0 || processing || isLoading || !sharedData.senderName || !sharedData.senderMobile || !sharedData.currency || !sharedData.distWallet}
                        className="w-full md:w-auto min-w-40 bg-gradient-to-r from-primary to-emerald-600 hover:to-emerald-700"
                    >
                        {processing ? "جاري الإرسال..." : "إرسال الحوالات"}
                    </Button>
                </div>

            </CardContent>
        </Card>
    )
}
