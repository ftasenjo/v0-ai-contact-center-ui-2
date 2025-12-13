import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-[600px] w-full" />
    </div>
  )
}
