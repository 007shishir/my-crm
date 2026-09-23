"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Don't render sidebar on login page or while loading auth state
  if (isPending || !session || pathname === "/login") {
    return null;
  }

  const role = session.user.role;
  const allBusinesses = ["nestvibe", "next_impression", "no_chinta", "study_first"];
  const displayBusinesses = role === "admin" ? allBusinesses : (session.user.assignedBusinesses || []);

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button 
          className="btn btn-circle btn-primary shadow-xl" 
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`w-64 bg-base-100 border-r border-base-300 shadow-sm flex flex-col h-screen fixed lg:sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
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
          <Link href="/" onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
            🏠 Dashboard
          </Link>
          <Link href="/reports" onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
            📊 Reports
          </Link>

          {role === "employee" && (
            <>
              <Link href="/employee/follow-ups" onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
                📅 Leads to Follow Up
              </Link>
              <Link href="/employee/tasks" onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
                ✅ Tasks To Complete
              </Link>
            </>
          )}


          {role === "admin" && (
            <>
              <div className="divider text-xs opacity-50 font-bold uppercase mt-6 mb-2">Admin</div>
              <Link href="/admin/users" onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
                👥 User Management
              </Link>
              <Link href="/admin/statuses" onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
                🏷️ Lead Settings
              </Link>
            </>
          )}

          {(role === "employee" || role === "admin") && (
            <>
              <div className="divider text-xs opacity-50 font-bold uppercase mt-6 mb-2">My Portals</div>
              {displayBusinesses.length > 0 ? (
                displayBusinesses.map(b => (
                  <Link key={b} href={`/leads/${b}`} onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
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
          <Link href="/profile" onClick={closeSidebar} className="block px-4 py-3 rounded-xl hover:bg-base-200 text-sm font-bold opacity-80 hover:opacity-100 transition-all">
            ⚙️ Profile Settings
          </Link>
          <button 
            onClick={() => {
              window.location.href = "/login"; 
            }}
            className="btn btn-outline btn-sm w-full text-error border-error hover:bg-error hover:border-error"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
