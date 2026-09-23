"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";

export default function ReportsPage() {
  const { data: session, isPending } = useSession();
  
  const [reportType, setReportType] = useState("follow_up");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [businessSlug, setBusinessSlug] = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [employees, setEmployees] = useState([]);
  
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetch("/api/employees")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEmployees(data);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}&businessSlug=${businessSlug}&assignedTo=${assignedTo}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      } else {
        setResults({ follow_up: [], visit: [], remark: [] });
      }
    } catch (err) {
      console.error(err);
      setResults({ follow_up: [], visit: [], remark: [] });
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending) return <div className="p-8">Loading...</div>;
  if (!session) return <div className="p-8">Unauthorized</div>;

  const role = session.user.role;
  const allBusinesses = ["nestvibe", "next_impression", "no_chinta", "study_first"];
  const displayBusinesses = role === "admin" ? allBusinesses : (session.user.assignedBusinesses || []);

  const currentData = results ? results[reportType] || [] : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary">Reports</h1>
        <p className="opacity-60 font-medium">View activity logs and lead updates within a specific date range.</p>
      </div>

      {/* Filters */}
      <div className="bg-base-100 p-4 rounded-xl border border-base-200 shadow-sm flex flex-col md:flex-row gap-4 items-end flex-wrap">
        <div className="form-control w-full md:w-auto">
          <label className="label text-xs font-bold opacity-50">Start Date</label>
          <input 
            type="date" 
            className="input input-bordered"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div className="form-control w-full md:w-auto">
          <label className="label text-xs font-bold opacity-50">End Date</label>
          <input 
            type="date" 
            className="input input-bordered"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <div className="form-control w-full md:w-auto">
          <label className="label text-xs font-bold opacity-50">Portal</label>
          <select 
            className="select select-bordered"
            value={businessSlug}
            onChange={e => setBusinessSlug(e.target.value)}
          >
            <option value="all">All Assigned Portals</option>
            {displayBusinesses.map(b => (
              <option key={b} value={b}>{b.replace("_", " ").toUpperCase()}</option>
            ))}
          </select>
        </div>
        
        {session.user.role === "admin" && (
          <div className="form-control w-full md:w-auto flex-1">
            <label className="label text-xs font-bold opacity-50">Employee</label>
            <select 
              className="select select-bordered w-full"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
            >
              <option value="all">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="w-full md:w-auto mt-4 md:mt-0">
          <button 
            className="btn btn-primary w-full md:w-auto font-bold shadow-sm"
            onClick={fetchReport}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200/50 p-1 font-bold">
        <a 
          className={`tab ${reportType === 'follow_up' ? 'tab-active text-primary' : ''}`}
          onClick={() => setReportType('follow_up')}
        >Follow Up Report</a>
        <a 
          className={`tab ${reportType === 'visit' ? 'tab-active text-primary' : ''}`}
          onClick={() => setReportType('visit')}
        >Property/Office Visit Report</a>
        <a 
          className={`tab ${reportType === 'remark' ? 'tab-active text-primary' : ''}`}
          onClick={() => setReportType('remark')}
        >Remark Report</a>
      </div>

      {/* Results */}
      <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden shadow-sm min-h-[300px]">
        {isLoading ? (
          <div className="p-8 text-center opacity-50 font-bold">Generating Report... Please wait.</div>
        ) : !results ? (
          <div className="p-8 text-center opacity-50 font-bold">Select filters and click "Generate Report" to begin.</div>
        ) : currentData.length === 0 ? (
          <div className="p-8 text-center opacity-50 font-bold">No data found for this report in the selected date range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200/50 text-base-content font-black">
                  <th>Lead Name</th>
                  <th>Phone</th>
                  <th>Portal</th>
                  <th>{reportType === 'remark' ? 'Remarks' : 'Activities'}</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((lead, i) => (
                  <tr key={i}>
                    <td className="font-bold capitalize">{lead.name || "N/A"}</td>
                    <td className="opacity-70">{lead.phone || "N/A"}</td>
                    <td>
                      <span className="badge badge-sm badge-outline font-bold capitalize">
                        {lead.businessSlug.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {reportType === 'remark' && lead.remarks && (
                        <div className="space-y-2">
                          {lead.remarks.map((rm, idx) => (
                            <div key={idx} className="text-xs bg-base-200 p-2 rounded">
                              <span className="font-bold text-primary">{rm.date} - {rm.employee}</span><br />
                              {rm.text}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {(reportType === 'follow_up' || reportType === 'visit') && lead.activities && (
                        <div className="space-y-2">
                          {lead.activities.map((act, idx) => (
                            <div key={idx} className="text-xs bg-base-200 p-2 rounded flex flex-col">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-primary capitalize">{act.type.replace("_", " ")}</span>
                                <span className="opacity-50">{new Date(act.date).toLocaleDateString()}</span>
                              </div>
                              <span className="opacity-80">By: {act.by}</span>
                              <span className="font-medium italic">"{act.details}"</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
