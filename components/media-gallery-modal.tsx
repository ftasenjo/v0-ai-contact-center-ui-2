"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaGalleryModalProps {
  open: boolean
  onClose: () => void
}

export function MediaGalleryModal({ open, onClose }: MediaGalleryModalProps) {
  const mediaItems = [
    {
      id: 1,
      type: "image",
      url: "/broken-router-with-red-lights.jpg",
      description: "Customer's router - connection issues",
      timestamp: "Dec 22, 2024 - 10:45 AM",
    },
    {
      id: 2,
      type: "image",
      url: "/billing-invoice-statement-document.jpg",
      description: "Invoice screenshot - billing inquiry",
      timestamp: "Dec 18, 2024 - 2:30 PM",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Media Gallery</DialogTitle>
          <DialogDescription>Customer submitted images and documents</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {mediaItems.map((item) => (
            <div key={item.id} className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                <img src={item.url || "/placeholder.svg"} alt={item.description} className="w-full h-auto" />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <p className="font-medium text-foreground">{item.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{item.timestamp}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
