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
import { CheckCircle2, XCircle, Upload, FileSpreadsheet, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import Papa from "papaparse"
import * as XLSX from "xlsx"

interface DepositRow {
    mobile: string
    amount: number
    notes?: string
    status?: 'pending' | 'success' | 'failed'
    message?: string
}

interface BulkDepositResponse {
    total: number
    successful: number
    failed: number
    results: Array<{
        success: boolean
        message?: string
        [key: string]: any
    }>
}

export function WalletBulkDeposit() {
    const [file, setFile] = useState<File | null>(null)
    const [data, setData] = useState<DepositRow[]>([])
    const [currency, setCurrency] = useState("")
    const [currencies, setCurrencies] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [summary, setSummary] = useState<{ total: number, success: number, failed: number } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Fetch available currencies
        const fetchCurrencies = async () => {
            try {
                const response = await apiClient.getCurrencies()
                if (response.success && response.docs) {
                    setCurrencies(response.docs)
                    // Default to first currency if available
                    if (response.docs.length > 0) {
                        setCurrency(String(response.docs[0].id))
                    }
                }
            } catch (err) {
                console.error("Failed to fetch currencies:", err)
            }
        }
        fetchCurrencies()
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
                        const parsedData: DepositRow[] = results.data.map((row: any): DepositRow => ({
                            mobile: row.mobile || row.Mobile || row['رقم الجوال'] || '',
                            amount: parseFloat(row.amount || row.Amount || row['المبلغ'] || '0'),
                            notes: row.notes || row.Notes || row['ملاحظات'] || '',
                            status: 'pending' as const
                        })).filter((row): row is DepositRow => Boolean(row.mobile) && row.amount > 0)

                        if (parsedData.length === 0) {
                            setError("لم يتم العثور على بيانات صالحة في الملف. تأكد من وجود أعمدة mobile و amount")
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

                    const parsedData: DepositRow[] = json.map((row: any): DepositRow => ({
                        mobile: String(row.mobile || row.Mobile || row['رقم الجوال'] || ''),
                        amount: parseFloat(row.amount || row.Amount || row['المبلغ'] || '0'),
                        notes: row.notes || row.Notes || row['ملاحظات'] || '',
                        status: 'pending' as const
                    })).filter((row): row is DepositRow => Boolean(row.mobile) && row.amount > 0)

                    if (parsedData.length === 0) {
                        setError("لم يتم العثور على بيانات صالحة في الملف. تأكد من وجود أعمدة mobile و amount")
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

    const handleSubmit = async () => {
        if (data.length === 0) return
        if (!currency) {
            setError("الرجاء اختيار العملة")
            return
        }

        setProcessing(true)
        setError("")
        setSuccess("")
        setSummary(null)

        try {
            // Prepare payload
            const deposits = data.map(row => ({
                mobile: row.mobile,
                amount: row.amount,
                currency,
                notes: row.notes
            }))

            const response = await apiClient.agentBulkDeposit(deposits)

            if (response.success && response.data) {
                const data = response.data as BulkDepositResponse
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
                        return res ? { ...row, status: (res.success ? 'success' : 'failed') as 'success' | 'failed', message: res.message } : row
                    }))
                }

            } else {
                setError(response.message || "فشل في معالجة الإيداع الجماعي")
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
                <CardTitle>إيداع جماعي</CardTitle>
                <CardDescription>
                    رفع ملف (CSV أو Excel) لإيداع مبالغ لعدة محافظ دفعة واحدة
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Currency Selection */}
                <div className="max-w-xs">
                    <Label htmlFor="currency" className="text-right block mb-2">العملة</Label>
                    <Select value={currency} onValueChange={setCurrency} disabled={processing}>
                        <SelectTrigger className="text-right [&>span]:text-right w-full">
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
                                    يدعم ملفات .csv, .xlsx (الأعمدة المطلوبة: mobile, amount)
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
                                        <TableHead className="text-right">رقم الجوال</TableHead>
                                        <TableHead className="text-right">المبلغ</TableHead>
                                        <TableHead className="text-right">ملاحظات</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row, idx) => (
                                        <TableRow key={idx} className={row.status === 'success' ? 'bg-emerald-500/5' : row.status === 'failed' ? 'bg-red-500/5' : ''}>
                                            <TableCell className="font-medium">{row.mobile}</TableCell>
                                            <TableCell>{row.amount}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs truncate max-w-[150px]">{row.notes || '-'}</TableCell>
                                            <TableCell>
                                                {row.status === 'pending' && <span className="text-muted-foreground">قيد الانتظار</span>}
                                                {row.status === 'success' && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> نجاح</span>}
                                                {row.status === 'failed' && <span className="text-red-600 flex items-center gap-1" title={row.message}><XCircle className="h-3 w-3" /> فشل</span>}
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
                        disabled={data.length === 0 || processing || isLoading}
                        className="w-full md:w-auto min-w-40"
                    >
                        {processing ? "جاري الاعتماد..." : "اعتماد العملية"}
                    </Button>
                </div>

            </CardContent>
        </Card>
    )
}
