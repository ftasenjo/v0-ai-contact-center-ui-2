"use client"

import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface QueueLoadingProps {
  message?: string
}

export function QueueLoading({ message = "Looking for the next priority contact..." }: QueueLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="text-center space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "linear" }}
          className="w-16 h-16 mx-auto"
        >
          <Loader2 className="w-16 h-16 text-primary" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">{message}</h2>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    </motion.div>
  )
}
