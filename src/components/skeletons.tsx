import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function StatCardSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 py-6">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ListRowSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center justify-between py-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="space-y-2">
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
      </div>
    </>
  );
}

export function StudentCardSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
        <Skeleton className="h-3 w-48" />
      </CardContent>
    </Card>
  );
}

export function StudentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <StudentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

export function SessionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}
