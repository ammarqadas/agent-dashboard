"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BulkDepositPage() {
    const router = useRouter()
    
    useEffect(() => {
        router.replace("/dashboard/deposit?tab=bulk")
    }, [router])

    return <div className="flex items-center justify-center min-h-[200px]"><p className="text-muted-foreground">جاري إعادة التوجيه...</p></div>
}
