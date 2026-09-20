import LeadManager from "../../components/leads/LeadManager";

export default async function BusinessLeadPage({ params }) {
  const { businessSlug } = await params;

  // Map slugs to pretty titles
  const titles = {
    nestvibe: "NestVibe (Real Estate)",
    next_impression: "Next Impression (Marketing)",
    no_chinta: "No Chinta (Healthcare)",
    study_first: "Study First (Visa Counseling)",
  };

  const pageTitle = titles[businessSlug] || "Business Leads";

  return (
    <div className="flex flex-col flex-1 container max-w-7xl items-center mx-auto bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <div className="w-full p-8 pb-0 flex gap-4 items-center">
        <a href="/" className="btn btn-sm btn-outline">← Back</a>
        <h1 className="text-2xl font-black text-primary">{pageTitle}</h1>
      </div>
      <LeadManager businessSlug={businessSlug} />
    </div>
  );
}
