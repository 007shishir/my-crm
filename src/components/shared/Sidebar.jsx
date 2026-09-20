"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();

  // Don't render sidebar on login page or while loading auth state
  if (isPending || !session || pathname === "/login") {
    return null;
  }

  const role = session.user.role;
  const allBusinesses = ["nestvibe", "next_impression", "no_chinta", "study_first"];
  const displayBusinesses = role === "admin" ? allBusinesses : (session.user.assignedBusinesses || []);

  return (
    <aside className="w-64 bg-base-100 border-r border-base-300 shadow-sm flex flex-col min-h-screen">
      <div className="p-6 border-b border-base-300">
        <h2 className="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Global Group CRM
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <div className={`badge badge-sm ${role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
            {role.toUpperCase()}
          </div>
          <span className="text-xs font-bold opacity-50 truncate">{session.user.name}</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link href="/" className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
          🏠 Dashboard
        </Link>

        {role === "admin" && (
          <>
            <div className="divider text-xs opacity-50 font-bold uppercase mt-6 mb-2">Admin</div>
            <Link href="/admin/users" className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
              👥 User Management
            </Link>
            <Link href="/admin/statuses" className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
              🏷️ Lead Settings
            </Link>
          </>
        )}

        {(role === "employee" || role === "admin") && (
          <>
            <div className="divider text-xs opacity-50 font-bold uppercase mt-6 mb-2">My Portals</div>
            {displayBusinesses.length > 0 ? (
              displayBusinesses.map(b => (
                <Link key={b} href={`/leads/${b}`} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
                  📁 {b.replace("_", " ")}
                </Link>
              ))
            ) : (
              <span className="text-xs opacity-50 block px-4 italic">No assigned verticals</span>
            )}
          </>
        )}

      </nav>

      <div className="p-4 border-t border-base-300 space-y-2">
        <Link href="/profile" className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
          ⚙️ Profile Settings
        </Link>
        <button 
          onClick={() => {
            // Sign out via Better Auth (implemented properly in next phase)
            window.location.href = "/login"; 
          }}
          className="btn btn-outline btn-sm w-full text-error border-error hover:bg-error hover:border-error"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
