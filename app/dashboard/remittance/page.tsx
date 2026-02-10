import { RemittanceForm } from "@/components/dashboard/remittance-form"
import { BulkRemittanceForm } from "@/components/dashboard/bulk-remittance-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RemittancePage() {
    return (
        <div className="container mx-auto max-w-4xl space-y-8 p-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إرسال حوالة</h1>
                    <p className="text-muted-foreground mt-1">
                        خدمة إرسال الحوالات المالية الفورية
                    </p>
                </div>
            </div>

            <Tabs defaultValue="single" className="w-full">
                <div className="border-b border-border/50 mb-6">
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-transparent p-0 gap-1">
                        <TabsTrigger 
                            value="single"
                            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 rounded-none rounded-t-lg"
                        >
                            حوالة واحدة
                        </TabsTrigger>
                        <TabsTrigger 
                            value="bulk"
                            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 rounded-none rounded-t-lg"
                        >
                            استيراد جماعي
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="single" className="mt-0 animate-in fade-in duration-200">
                    <RemittanceForm />
                </TabsContent>
                <TabsContent value="bulk" className="mt-0 animate-in fade-in duration-200">
                    <BulkRemittanceForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
