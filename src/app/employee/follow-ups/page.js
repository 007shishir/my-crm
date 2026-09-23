"use client";

import { useSession } from "@/lib/auth-client";
import LeadManager from "@/app/components/leads/LeadManager";

export default function FollowUpsPage() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="p-8">Loading...</div>;
  if (!session || session.user.role !== "employee") return <div className="p-8">Unauthorized. This page is only for employees.</div>;

  return (
    <div className="w-full">
      <LeadManager businessSlug="all" mode="follow-ups" />
    </div>
  );
}
