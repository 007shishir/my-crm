"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";

export default function EmployeeReportsPage() {
  const { data: session } = useSession();
  
  const [portals] = useState(["nestvibe", "next_impression", "no_chinta", "study_first"]);
  const [selectedPortal, setSelectedPortal] = useState("");
  
  const [allUsers, setAllUsers] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllUsers(data);
      });
  }, []);

  useEffect(() => {
    if (selectedPortal) {
      const emps = allUsers.filter(u => 
        u.role === "employee" && 
        (u.assignedBusinesses || []).includes(selectedPortal)
      );
      setFilteredEmployees(emps);
    } else {
      setFilteredEmployees([]);
    }
    setSelectedEmployee("");
    setReportData(null);
  }, [selectedPortal, allUsers]);

  const generateReport = async () => {
    if (!selectedPortal || !selectedEmployee || !startDate || !endDate) {
      alert("Please select all fields.");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/employee-reports?portal=${selectedPortal}&employee=${encodeURIComponent(selectedEmployee)}`);
      const leads = await res.json();
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      let assignedLeads = [];
      let followUpLeadsMap = new Map();
      let remarkLeadsMap = new Map();
      let taskLeadsMap = new Map();
      
      leads.forEach(lead => {
        // 1. Assigned Leads
        if (lead.assignedTo === selectedEmployee && lead.createdAt) {
          const created = new Date(lead.createdAt);
          if (created >= start && created <= end) {
            assignedLeads.push(lead);
          }
        }
        
        // 2 & 3. Follow Ups / Remarks Added
        if (lead.lastConversation) {
          const lines = lead.lastConversation.split('\n');
          let addedRemark = false;
          let latestRelevantRemark = "";
          
          lines.forEach(line => {
            if (line.includes(selectedEmployee + ":")) {
              const match = line.match(/\[(.*?)\]/);
              if (match && match[1]) {
                const remarkDate = new Date(match[1]);
                if (remarkDate >= start && remarkDate <= end) {
                  addedRemark = true;
                  latestRelevantRemark = line; // capture the specific remark
                }
              }
            }
          });
          
          if (addedRemark) {
            const leadWithRemark = { ...lead, extractedRemark: latestRelevantRemark };
            followUpLeadsMap.set(lead._id, leadWithRemark);
            remarkLeadsMap.set(lead._id, leadWithRemark);
          }
        }
        
        // 4. Tasks Created
        if (lead.assignedTo === selectedEmployee && lead.taskScheduled && lead.taskScheduled.length > 0) {
           let hasTask = false;
           lead.taskScheduled.forEach(t => {
             if (t.taskDeadline) {
               const td = new Date(t.taskDeadline);
               if (td >= start && td <= end) {
                 hasTask = true;
               }
             }
           });
           if (hasTask) taskLeadsMap.set(lead._id, lead);
        }
      });
      
      setReportData({
        assignedLeads,
        followUpLeads: Array.from(followUpLeadsMap.values()),
        remarkLeads: Array.from(remarkLeadsMap.values()),
        taskLeads: Array.from(taskLeadsMap.values())
      });
      
    } catch (e) {
      console.error(e);
      alert("Error generating report.");
    }
    setIsLoading(false);
  };

  const renderLeadList = (title, leads) => (
    <div className="mt-6 bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm">
      <h3 className="font-black text-lg mb-4 text-primary">{title} ({leads.length})</h3>
      {leads.length === 0 ? (
        <p className="text-sm opacity-50 italic">No leads found in this category.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="bg-base-200 text-base-content/70">
                <th>Name</th>
                <th>Phone</th>
                {title === "Remarks Added" || title === "Followed Up Leads" ? <th>Remark</th> : <th>Email</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l._id} className="hover:bg-base-200/50 transition-colors">
                  <td className="font-bold">{l.name}</td>
                  <td className="opacity-80">{l.phone || "-"}</td>
                  {title === "Remarks Added" || title === "Followed Up Leads" ? (
                    <td className="opacity-80 text-xs italic max-w-xs truncate" title={l.extractedRemark}>{l.extractedRemark || "-"}</td>
                  ) : (
                    <td className="opacity-80">{l.email || "-"}</td>
                  )}
                  <td>
                    <span className="badge badge-sm badge-outline capitalize">{l.leadStatus?.replace("_", " ") || "new"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (!session || session.user.role !== "admin") return null;

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
      <h2 className="text-2xl font-black mb-8">Employee Reports</h2>
      
      <div className="bg-base-100 p-6 rounded-2xl border border-base-300 shadow-sm flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="form-control">
            <label className="label text-xs font-bold opacity-70 uppercase">Select Portal</label>
            <select 
              className="select select-bordered select-sm w-full"
              value={selectedPortal}
              onChange={e => setSelectedPortal(e.target.value)}
            >
              <option value="">Choose...</option>
              {portals.map(p => <option key={p} value={p}>{p.replace('_', ' ').toUpperCase()}</option>)}
            </select>
          </div>
          
          <div className="form-control">
            <label className="label text-xs font-bold opacity-70 uppercase">Select Employee</label>
            <select 
              className="select select-bordered select-sm w-full"
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              disabled={!selectedPortal}
            >
              <option value="">Choose...</option>
              {filteredEmployees.map(emp => <option key={emp._id || emp.id} value={emp.name}>{emp.name}</option>)}
            </select>
          </div>

          <div className="form-control">
            <label className="label text-xs font-bold opacity-70 uppercase">Start Date</label>
            <input 
              type="date"
              className="input input-sm input-bordered w-full"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label text-xs font-bold opacity-70 uppercase">End Date</label>
            <input 
              type="date"
              className="input input-sm input-bordered w-full"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
        
        <button 
          className="btn btn-primary self-start shadow-lg"
          onClick={generateReport}
          disabled={isLoading || !selectedPortal || !selectedEmployee || !startDate || !endDate}
        >
          {isLoading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {reportData && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-black mb-6">
            Report for <span className="text-primary">{selectedEmployee}</span> 
            <span className="opacity-50 text-sm ml-2 font-normal">({startDate} to {endDate})</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stat bg-base-100 rounded-2xl border border-base-300 shadow-sm">
              <div className="stat-title text-xs font-bold uppercase opacity-60">Leads Assigned</div>
              <div className="stat-value text-primary">{reportData.assignedLeads.length}</div>
            </div>
            <div className="stat bg-base-100 rounded-2xl border border-base-300 shadow-sm">
              <div className="stat-title text-xs font-bold uppercase opacity-60">Leads Followed Up</div>
              <div className="stat-value text-secondary">{reportData.followUpLeads.length}</div>
            </div>
            <div className="stat bg-base-100 rounded-2xl border border-base-300 shadow-sm">
              <div className="stat-title text-xs font-bold uppercase opacity-60">Remarks Added</div>
              <div className="stat-value text-accent">{reportData.remarkLeads.length}</div>
            </div>
            <div className="stat bg-base-100 rounded-2xl border border-base-300 shadow-sm">
              <div className="stat-title text-xs font-bold uppercase opacity-60">Tasks Created</div>
              <div className="stat-value text-info">{reportData.taskLeads.length}</div>
            </div>
          </div>

          <div className="space-y-6">
            {renderLeadList("Assigned Leads", reportData.assignedLeads)}
            {renderLeadList("Followed Up Leads", reportData.followUpLeads)}
            {renderLeadList("Remarks Added", reportData.remarkLeads)}
            {renderLeadList("Tasks Created", reportData.taskLeads)}
          </div>
        </div>
      )}
    </div>
  );
}
