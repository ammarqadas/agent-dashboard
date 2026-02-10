"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BulkDepositPage() {
    const router = useRouter()
    
    useEffect(() => {
        router.replace("/dashboard/deposit?tab=bulk")
    }, [router])

    return null
}
