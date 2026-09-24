"use client";

import Image from "next/image";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = useSession();

  const allBusinesses = [
    { slug: "nestvibe", name: "NestVibe", desc: "Real Estate CRM", color: "bg-primary text-primary-content" },
    { slug: "next_impression", name: "Next Impression", desc: "Marketing CRM", color: "bg-secondary text-secondary-content" },
    { slug: "no_chinta", name: "No Chinta", desc: "Healthcare CRM", color: "bg-accent text-accent-content" },
    { slug: "study_first", name: "Study First", desc: "Visa Counseling CRM", color: "bg-neutral text-neutral-content" },
  ];

  let businesses = allBusinesses;
  
  if (session?.user?.role === "employee" && session?.user?.assignedBusinesses?.length > 0) {
    businesses = allBusinesses.filter(biz => session.user.assignedBusinesses.includes(biz.slug));
  } else if (session?.user?.role === "employee") {
    businesses = [];
  } else if (session?.user?.role === "guest") {
    businesses = [];
  }

  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex flex-col flex-1 container max-w-6xl items-center mx-auto bg-base-100 font-sans min-h-screen py-20 px-8">
      
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Global Group CRM
        </h1>
        <p className="text-lg opacity-60 font-medium">
          Select a business vertical to manage its leads and operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {businesses.map((biz) => (
          <a 
            key={biz.slug} 
            href={`/leads/${biz.slug}`}
            className="group relative overflow-hidden rounded-3xl border border-base-200 bg-base-100 p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 flex flex-col justify-between min-h-[200px]"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-150 ${biz.color}`}></div>
            
            <div>
              <h2 className="text-3xl font-black mb-2">{biz.name}</h2>
              <p className="opacity-60 font-medium">{biz.desc}</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm font-bold opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-primary mt-8">
              ENTER PORTAL 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </a>
        ))}
      </div>

    </div>
  );
}
