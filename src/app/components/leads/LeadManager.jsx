"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useSession } from "@/lib/auth-client";
import Papa from "papaparse";

export default function LeadManager({ businessSlug = "nestvibe" }) {
  const { data: session } = useSession();
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isCustomTag, setIsCustomTag] = useState(false);
  const [isCustomStatus, setIsCustomStatus] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [inlineRemarkText, setInlineRemarkText] = useState({});

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // Bulk Actions
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkAssign, setBulkAssign] = useState("");

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [searchQuery, statusFilter, tagFilter, taskFilter, startDate, endDate, itemsPerPage]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/leads?businessSlug=${businessSlug}`);
        const data = await res.json();
        const filteredData = data.filter(lead => lead.leadTag === businessSlug || lead.businessSlug === businessSlug);
        setLeads(filteredData);

        const empRes = await fetch("/api/employees");
        if (empRes.ok) {
          setEmployees(await empRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [businessSlug]); // Re-run when the route/slug changes

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      leadTag: businessSlug,
      assignedTo: "",
      leadStatus: "new",
      lastConversation: "",
      interestedOn: [
        {
          propertyName: "",
          propertyLocation: "",
          link: "",
          lastPrice: "",
          clientBudget: "",
          isVisited: false,
        },
      ],
      taskScheduled: [{ taskName: "", taskDetails: "", taskDeadline: "", taskStatus: "Pending" }],
    },
  });

  // Dynamics arrays for Properties and Tasks
  const {
    fields: propFields,
    append: appendProp,
    remove: removeProp,
  } = useFieldArray({ control, name: "interestedOn" });
  const {
    fields: taskFields,
    append: appendTask,
    remove: removeTask,
  } = useFieldArray({ control, name: "taskScheduled" });

  const onSubmit = async (data) => {
    // Duplicate Check
    const cleanPhone = (phone) => phone ? phone.replace(/\D/g, '').slice(-11) : "";
    const newPhone = cleanPhone(data.phone);
    const newEmail = data.email ? data.email.toLowerCase().trim() : "";

    const duplicateLead = leads.find(lead => {
      if (editingId && lead._id === editingId) return false; // skip self in edit mode
      
      const existingPhone = cleanPhone(lead.phone);
      if (newPhone && existingPhone === newPhone) return true;
      
      const existingEmail = lead.email ? lead.email.toLowerCase().trim() : "";
      if (newEmail && existingEmail === newEmail) return true;
      
      return false;
    });

    if (duplicateLead) {
      alert(`Validation Error: A lead with this Phone Number or Email Address already exists! \n(Duplicate: ${duplicateLead.name})`);
      return;
    }

    reset(); // Clear form
    document.getElementById("add_lead_modal").close(); // Close daisyUI modal

    const currentDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const authorName = session?.user?.name || "User";
    
    // Format the remark with date and author
    const formattedRemark = data.lastConversation ? `[${currentDate}] ${authorName}: ${data.lastConversation}` : "";

    const payload = { ...data, businessSlug, leadTag: data.leadTag || businessSlug, lastConversation: formattedRemark, comments: "" };

    if (editingId) {
      // EDIT MODE
      payload.lastConversation = data.lastConversation;

      await fetch(`/api/leads/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      // CREATE MODE
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    // Quick refresh of the leads
    const refreshRes = await fetch(`/api/leads?businessSlug=${businessSlug}`);
    const newData = await refreshRes.json();
    const filteredData = newData.filter(lead => lead.leadTag === businessSlug || lead.businessSlug === businessSlug);
    setLeads(filteredData);
  };

  const canAddLead = session?.user?.role === "admin" || (session?.user?.role === "employee" && session?.user?.permissions?.canAddLead);
  const canDelete = session?.user?.role === "admin" || (session?.user?.role === "employee" && session?.user?.permissions?.canDelete);
  const canWriteComment = session?.user?.role === "admin" || (session?.user?.role === "employee" && session?.user?.permissions?.canWriteComment);

  // Apply Search & Filters
  const displayedLeads = leads.filter(lead => {
    // 1. Text Search (name, phone, email, remarks)
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (lead.name?.toLowerCase().includes(q)) || 
      (lead.phone?.toLowerCase().includes(q)) || 
      (lead.email?.toLowerCase().includes(q)) || 
      (lead.lastConversation?.toLowerCase().includes(q));
      
    // 2. Status Filter
    const matchesStatus = statusFilter === "all" || lead.leadStatus === statusFilter;
    
    // 3. Tag Filter
    const matchesTag = tagFilter === "all" || lead.leadTag === tagFilter;
    
    // 4. Task Filter
    let matchesTask = true;
    if (taskFilter !== "all") {
      if (!lead.taskScheduled || lead.taskScheduled.length === 0) {
        matchesTask = false;
      } else {
        matchesTask = lead.taskScheduled.some(t => t.taskStatus === taskFilter);
      }
    }
    
    // 5. Date Filter (Range)
    let matchesDate = true;
    if (startDate || endDate) {
      if (!lead.createdAt) {
        matchesDate = false;
      } else {
        const d = new Date(lead.createdAt);
        const leadDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        if (startDate && leadDate < startDate) matchesDate = false;
        if (endDate && leadDate > endDate) matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesTag && matchesTask && matchesDate;
  });

  const totalPages = Math.ceil(displayedLeads.length / itemsPerPage);
  const paginatedLeads = displayedLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(displayedLeads.map(l => l._id));
    } else {
      setSelectedLeads([]);
    }
  };

  const toggleSelectLead = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const applyBulkAction = async () => {
    if (selectedLeads.length === 0) return;
    
    const updates = {};
    if (bulkStatus) updates.leadStatus = bulkStatus;
    if (bulkTag) updates.leadTag = bulkTag;
    if (bulkAssign) updates.assignedTo = bulkAssign;
    
    if (Object.keys(updates).length === 0) return alert("Select at least one bulk action to apply.");

    const res = await fetch("/api/leads/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: selectedLeads, updates })
    });

    if (res.ok) {
      alert(`Successfully updated ${selectedLeads.length} leads!`);
      setSelectedLeads([]);
      setBulkStatus("");
      setBulkTag("");
      setBulkAssign("");
      
      const refreshRes = await fetch(`/api/leads?businessSlug=${businessSlug}`);
      const newData = await refreshRes.json();
      const filteredData = newData.filter(lead => lead.leadTag === businessSlug || lead.businessSlug === businessSlug);
      setLeads(filteredData);
    } else {
      alert("Failed to apply bulk actions.");
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,phone,email,address\nJohn Doe,+8801700000000,john@example.com,Dhaka\nJane Smith,+8801800000000,jane@example.com,Sylhet";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl opacity-50">Manage Leads</h2>
        {canAddLead && (
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-neutral shadow-sm"
              onClick={() => document.getElementById("import_csv_modal").showModal()}
            >
              Import CSV
            </button>
            <button
              className="btn btn-primary shadow-lg"
              onClick={() => {
                setEditingId(null);
                reset({
                  name: "", phone: "", email: "", address: "", leadTag: businessSlug, assignedTo: "", leadStatus: "new", lastConversation: "",
                  interestedOn: [{ propertyName: "", propertyLocation: "", link: "", lastPrice: "", clientBudget: "", isVisited: false }],
                  taskScheduled: [{ taskName: "", taskDetails: "", taskDeadline: "", taskStatus: "Pending" }]
                });
                document.getElementById("add_lead_modal").showModal();
              }}
            >
              + Add New Lead
            </button>
          </div>
        )}
      </div>

      {/* --- CSV IMPORT MODAL --- */}
      <dialog id="import_csv_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg mb-4 text-primary">Import Bulk Leads (CSV)</h3>
          
          <div className="alert alert-info text-xs mb-6 flex flex-col items-start gap-2">
            <p>
              CSV must include columns: <b>name, phone, email, address</b>.<br/>
              <b>name</b> and <b>phone</b> are mandatory.
            </p>
            <button 
              type="button" 
              onClick={downloadSampleCSV}
              className="btn btn-xs btn-outline bg-base-100 mt-1"
            >
              ↓ Download Sample CSV
            </button>
          </div>

          <input 
            type="file" 
            accept=".csv"
            className="file-input file-input-bordered w-full mb-4"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;

              Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                  if (results.data.length === 0) return alert("Empty CSV!");
                  
                  const currentDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                  const authorName = session?.user?.name || "System Import";

                  const cleanPhone = (phone) => phone ? phone.replace(/\D/g, '').slice(-11) : "";
                  const existingPhones = new Set(leads.map(l => cleanPhone(l.phone)).filter(Boolean));
                  const existingEmails = new Set(leads.map(l => l.email ? l.email.toLowerCase().trim() : "").filter(Boolean));
                  const uniqueInCSV = new Set();
                  
                  let skippedCount = 0;
                  const bulkPayload = [];

                  results.data.forEach(row => {
                    const rowPhone = cleanPhone(row.phone);
                    const rowEmail = row.email ? row.email.toLowerCase().trim() : "";
                    
                    if ((rowPhone && existingPhones.has(rowPhone)) || (rowEmail && existingEmails.has(rowEmail)) || 
                        (rowPhone && uniqueInCSV.has(rowPhone)) || (rowEmail && uniqueInCSV.has(rowEmail))) {
                      skippedCount++;
                      return; // skip duplicate
                    }

                    if (rowPhone) uniqueInCSV.add(rowPhone);
                    if (rowEmail) uniqueInCSV.add(rowEmail);

                    bulkPayload.push({
                      name: row.name || "Unknown",
                      phone: row.phone || "",
                      email: row.email || "",
                      address: row.address || "",
                      leadTag: businessSlug,
                      businessSlug: businessSlug,
                      assignedTo: "",
                      leadStatus: "new",
                      lastConversation: `[${currentDate}] ${authorName}: Imported via CSV`,
                      comments: "",
                      interestedOn: [{ propertyName: "", propertyLocation: "", link: "", lastPrice: "", clientBudget: "", isVisited: false }],
                      taskScheduled: []
                    });
                  });

                  if (bulkPayload.length === 0) {
                     return alert(`No leads imported. ${skippedCount} duplicates were skipped.`);
                  }

                  const res = await fetch("/api/leads", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bulkPayload),
                  });

                  if (res.ok) {
                    alert(`Successfully imported ${bulkPayload.length} leads! ${skippedCount > 0 ? `(${skippedCount} duplicates skipped)` : ""}`);
                    document.getElementById("import_csv_modal").close();
                    
                    // Quick refresh of the leads
                    const refreshRes = await fetch(`/api/leads?businessSlug=${businessSlug}`);
                    const newData = await refreshRes.json();
                    const filteredData = newData.filter(lead => lead.leadTag === businessSlug || lead.businessSlug === businessSlug);
                    setLeads(filteredData);
                  } else {
                    alert("Failed to import CSV. Ensure you have permission.");
                  }
                }
              });
            }}
          />
        </div>
      </dialog>

      {/* --- MODAL START --- */}
      <dialog id="add_lead_modal" className="modal">
        <div className="modal-box w-11/12 max-w-5xl">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg mb-4 text-primary">
            {editingId ? "Edit Lead" : "Add New Lead"}
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label text-xs font-bold">FULL NAME</label>
                <input
                  {...register("name", { required: true })}
                  className="input input-bordered w-full"
                  placeholder="John Doe"
                />
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold">PHONE</label>
                <input
                  {...register("phone", { required: true })}
                  className="input input-bordered w-full"
                  placeholder="+880..."
                />
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold">EMAIL</label>
                <input
                  {...register("email", { required: true })}
                  className="input input-bordered w-full"
                  placeholder="john@example.com"
                />
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold">ADDRESS</label>
                <input
                  {...register("address")}
                  className="input input-bordered w-full"
                  placeholder="Dhaka, Bangladesh"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Assign To</span>
                </label>
                <select
                  {...register("assignedTo")}
                  className="select select-bordered w-full"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp, i) => (
                    <option key={emp.id || emp._id || i} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="form-control">
                <label className="label text-xs font-bold">LEAD TAG</label>
                {isCustomTag ? (
                  <div className="flex gap-2">
                    <input 
                      {...register("leadTag")} 
                      className="input input-bordered w-full" 
                      placeholder="Type new tag..." 
                      autoFocus
                    />
                    <button 
                      type="button" 
                      className="btn btn-square btn-outline btn-sm h-12 w-12" 
                      onClick={() => {
                        setIsCustomTag(false);
                        setValue("leadTag", "nestvibe");
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <select 
                    {...register("leadTag", {
                      onChange: (e) => {
                        if (e.target.value === "CREATE_NEW") {
                          setIsCustomTag(true);
                          setValue("leadTag", "");
                        }
                      }
                    })} 
                    className="select select-bordered w-full"
                  >
                    <option value="nestvibe">NestVibe</option>
                    <option value="nextimpression">Next Impression</option>
                    <option value="no_chinta">No Chinta</option>
                    <option value="study_first">Study First</option>
                    <option value="CREATE_NEW" className="font-bold text-primary bg-base-200">+ Create New...</option>
                  </select>
                )}
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold">LEAD STATUS</label>
                {isCustomStatus ? (
                  <div className="flex gap-2">
                    <input 
                      {...register("leadStatus")} 
                      className="input input-bordered w-full" 
                      placeholder="Type new status..." 
                      autoFocus
                    />
                    <button 
                      type="button" 
                      className="btn btn-square btn-outline btn-sm h-12 w-12" 
                      onClick={() => {
                        setIsCustomStatus(false);
                        setValue("leadStatus", "new");
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <select 
                    {...register("leadStatus", {
                      onChange: (e) => {
                        if (e.target.value === "CREATE_NEW") {
                          setIsCustomStatus(true);
                          setValue("leadStatus", "");
                        }
                      }
                    })} 
                    className="select select-bordered w-full"
                  >
                    <option value="new">New</option>
                    <option value="called">Called</option>
                    <option value="unreachable">Unreachable</option>
                    <option value="busy">Busy</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="bad_lead">Bad Lead</option>
                    <option value="CREATE_NEW" className="font-bold text-primary bg-base-200">+ Create New...</option>
                  </select>
                )}
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold">ASSIGNED TO</label>
                <select {...register("assignedTo")} className="select select-bordered w-full">
                  <option value="">Select an employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id || emp._id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-control mt-4">
              <label className="label text-xs font-bold">REMARK</label>
              <textarea
                {...register("lastConversation")}
                className="textarea textarea-bordered w-full"
                placeholder="Remarks..."
              ></textarea>
            </div>

            <div className="divider">QUERY ABOUT / INTERESTED PROPERTIES</div>
            {propFields.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-base-200 rounded-lg relative"
              >
                <input
                  {...register(`interestedOn.${index}.propertyName`)}
                  className="input input-sm input-bordered"
                  placeholder="Service/Property Name"
                />
                <input
                  {...register(`interestedOn.${index}.propertyLocation`)}
                  className="input input-sm input-bordered"
                  placeholder="Location/Service Details"
                />
                <input
                  {...register(`interestedOn.${index}.link`)}
                  className="input input-sm input-bordered"
                  placeholder="Link"
                />
                <input
                  {...register(`interestedOn.${index}.lastPrice`)}
                  className="input input-sm input-bordered"
                  placeholder="Last Price Offered"
                />
                <input
                  {...register(`interestedOn.${index}.clientBudget`)}
                  className="input input-sm input-bordered"
                  placeholder="Client Budget"
                />
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    {...register(`interestedOn.${index}.isVisited`)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span className="label-text">Office/Property Visited?</span>
                </label>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeProp(index)}
                    className="btn btn-xs btn-error absolute -top-2 -right-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendProp({})}
              className="btn btn-xs btn-outline"
            >
              + Add Another Property
            </button>

            <div className="divider">SCHEDULE A TASK</div>

            {taskFields.map((item, index) => (
              <div key={item.id} className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-base-200 p-3 rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                  <input
                    {...register(`taskScheduled.${index}.taskName`)}
                    className="input input-sm input-bordered w-full"
                    placeholder="Task Name (e.g. Follow up Call)"
                  />
                  <input
                    type="date"
                    {...register(`taskScheduled.${index}.taskDeadline`)}
                    className="input input-sm input-bordered w-full"
                  />
                  <input
                    {...register(`taskScheduled.${index}.taskDetails`)}
                    className="input input-sm input-bordered w-full md:col-span-2"
                    placeholder="Task Details"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <select
                    {...register(`taskScheduled.${index}.taskStatus`)}
                    className="select select-sm select-bordered w-full md:w-32"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                  {index > 0 && (
                    <button type="button" onClick={() => removeTask(index)} className="btn btn-xs btn-error btn-outline">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendTask({})}
              className="btn btn-xs btn-outline mt-2"
            >
              + Add Another Task
            </button>

            <div className="modal-action">
              <button type="submit" className="btn btn-primary w-full">
                {editingId ? "Update Lead" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
      {/* --- MODAL END --- */}

      {/* --- SEARCH & FILTERS BAR --- */}
      <div className="bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm mb-6 flex flex-col gap-4 w-full">
        <div className="form-control w-full">
          <input 
            type="text" 
            placeholder="Search name, phone, email, or remarks..." 
            className="input input-sm input-bordered w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full">
          {/* Date Range */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            <input 
              type="date"
              className="input input-sm input-bordered flex-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
            <span className="text-xs opacity-50 font-bold">TO</span>
            <input 
              type="date"
              className="input input-sm input-bordered flex-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap md:flex-nowrap gap-2 w-full lg:flex-1">
            <select 
              className="select select-sm select-bordered flex-1 min-w-[130px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="called">Called</option>
              <option value="busy">Busy</option>
              <option value="unreachable">Unreachable</option>
              <option value="not_interested">Not Interested</option>
              <option value="bad_lead">Bad Lead</option>
            </select>
            <select 
              className="select select-sm select-bordered flex-1 min-w-[130px]"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="all">All Tags</option>
              <option value="nestvibe">NestVibe</option>
              <option value="nextimpression">Next Impression</option>
              <option value="no_chinta">No Chinta</option>
              <option value="study_first">Study First</option>
            </select>
            <select 
              className="select select-sm select-bordered flex-1 min-w-[130px]"
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
            >
              <option value="all">All Tasks</option>
              <option value="Pending">Task: Pending</option>
              <option value="Completed">Task: Completed</option>
              <option value="Canceled">Task: Canceled</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- LEADS DISPLAY (HORIZONTAL STRIPS) --- */}
      <div className="flex flex-col gap-4 w-full pb-32">
        {displayedLeads.length > 0 && (
          <div className="flex justify-between items-center bg-base-200 p-3 rounded-lg shadow-sm border border-base-300">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
              <input 
                type="checkbox" 
                className="checkbox checkbox-sm checkbox-primary" 
                onChange={toggleSelectAll}
                checked={displayedLeads.length > 0 && selectedLeads.length === displayedLeads.length}
              />
              Select All ({displayedLeads.length})
            </label>
            {selectedLeads.length > 0 && (
              <span className="badge badge-primary badge-outline font-bold">
                {selectedLeads.length} selected
              </span>
            )}
          </div>
        )}

        {displayedLeads.length === 0 && (
          <div className="text-center py-20 bg-base-200 rounded-xl opacity-50 italic">
            {leads.length === 0 
              ? "No leads captured yet. Start by adding a new lead above." 
              : "No leads match your search/filters."}
          </div>
        )}

        {paginatedLeads.map((lead, index) => {
          const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;
          
          return (
          <div
            key={lead._id}
            className="collapse bg-base-100 border border-base-300 shadow-sm hover:border-primary transition-colors"
          >
            <input type="checkbox" className="peer" />

            {/* THE VISIBLE ROW (Header) */}
            <div className="collapse-title p-0 min-h-0 bg-base-100 hover:bg-base-200/50 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-center p-4">
                
                {/* Column 1: Client Info (Takes up 4 cols on large screens) */}
                <div className="lg:col-span-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="relative z-20">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={(e) => toggleSelectLead(lead._id, e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <span className="font-bold text-lg opacity-30 min-w-[24px] text-right">{displayIndex}.</span>
                    <h2 className="font-black text-xl text-primary capitalize leading-tight truncate">
                      {lead.name || "Unnamed"}
                    </h2>
                    <span className="text-[10px] font-mono opacity-40 bg-base-200 px-1 rounded border border-base-300" title="Unique ID">
                      #{lead._id.slice(-6)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold opacity-50 mb-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No Date"}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="badge badge-outline badge-sm font-semibold opacity-70">
                      {lead.phone || "No Phone"}
                    </span>
                    <span className={`badge badge-sm font-bold capitalize ${
                      lead.leadTag === 'nestvibe' ? 'badge-primary' : 
                      lead.leadTag === 'nextimpression' ? 'badge-secondary' : 'badge-accent'
                    }`}>
                      {lead.leadTag || "No Tag"}
                    </span>
                  </div>
                </div>

                {/* Column 2: Interest (3 cols) */}
                <div className="lg:col-span-3 border-t md:border-t-0 md:border-l border-base-200 md:pl-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-wider mb-1">
                    Property Interest
                  </p>
                  <p className="text-sm font-bold truncate text-base-content/90">
                    {lead.interestedOn?.[0]?.propertyName || "N/A"}
                  </p>
                  <p className="text-xs opacity-60 italic truncate">
                    {lead.interestedOn?.[0]?.propertyLocation || "Unknown Location"}
                  </p>
                </div>

                {/* Column 3: Budget & Lead Status (3 cols) */}
                <div className="lg:col-span-3 border-t md:border-t-0 md:border-l border-base-200 md:pl-4 flex flex-col justify-center">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-wider mb-1">
                    Budget & Status
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-success font-black text-sm">
                      {lead.interestedOn?.[0]?.clientBudget || "0"} BDT
                    </p>
                    <span className={`badge badge-sm font-black border-none text-white ${
                      lead.leadStatus === 'called' ? 'bg-info' :
                      lead.leadStatus === 'unreachable' ? 'bg-warning' :
                      lead.leadStatus === 'not_interested' ? 'bg-error' :
                      lead.leadStatus === 'bad_lead' ? 'bg-error' : 'bg-neutral'
                    }`}>
                      {lead.leadStatus ? lead.leadStatus.replace('_', ' ').toUpperCase() : "NEW"}
                    </span>
                  </div>
                </div>

                {/* Column 4: Task Progress (2 cols) */}
                <div className="lg:col-span-2 border-t md:border-t-0 md:border-l border-base-200 md:pl-4 flex flex-col justify-center relative">
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-wider mb-1">
                    Assigned Task
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-6">
                        <span className="text-xs">{lead.assignedTo ? lead.assignedTo.charAt(0).toUpperCase() : "?"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold capitalize truncate max-w-[80px]">
                        {lead.assignedTo || "Unassigned"}
                      </span>
                      <span className={`text-[10px] font-black uppercase ${
                        lead.taskScheduled?.[0]?.taskStatus === "Completed" ? "text-success" : "text-warning"
                      }`}>
                        {lead.taskScheduled?.[0]?.taskStatus || "Pending"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Expand Indicator (Positioned absolute on desktop, relative on mobile) */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-100 transition-opacity hidden lg:block">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* THE HIDDEN DETAILS (Expands on Click) */}
            <div className="collapse-content bg-base-200/50 pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 border-t border-base-300">
                {/* Full Contact & Comments */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black opacity-50 uppercase mb-2">
                      Lead Details
                    </h3>
                    <p className="text-sm">
                      <strong>Email:</strong> {lead.email || "N/A"}
                    </p>
                    <p className="text-sm">
                      <strong>Address:</strong> {lead.address || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-black opacity-50 uppercase mb-2">
                      Remark
                    </h3>
                    <div className="p-3 bg-base-100 rounded border border-base-300 text-xs italic whitespace-pre-wrap max-h-48 overflow-y-auto mb-2">
                      {lead.lastConversation || "No remarks recorded."}
                    </div>
                    
                    {/* Inline Remark Input */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Add a new remark..."
                        className="input input-sm input-bordered flex-1"
                        value={inlineRemarkText[lead._id] || ""}
                        onChange={(e) => setInlineRemarkText({...inlineRemarkText, [lead._id]: e.target.value})}
                      />
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={async () => {
                          const text = inlineRemarkText[lead._id];
                          if (!text) return;
                          
                          const currentDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                          const authorName = session?.user?.name || "User";
                          const formattedRemark = `[${currentDate}] ${authorName}: ${text}`;
                          
                          const newConversation = lead.lastConversation 
                            ? lead.lastConversation + "\n" + formattedRemark 
                            : formattedRemark;
                          
                          // Optimistic update
                          setLeads(leads.map(l => l._id === lead._id ? { ...l, lastConversation: newConversation } : l));
                          setInlineRemarkText({...inlineRemarkText, [lead._id]: ""});

                          await fetch(`/api/leads/${lead._id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ...lead, lastConversation: newConversation }),
                          });
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full Property List */}
                <div className="lg:col-span-1">
                  <h3 className="text-xs font-black opacity-50 uppercase mb-2">
                    Services / Properties
                  </h3>
                  <div className="space-y-2">
                    {lead.interestedOn?.map((p, i) => (
                      <div
                        key={i}
                        className="bg-base-100 p-2 rounded text-xs border border-base-300 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold">{p.propertyName}</p>
                          <a
                            href={p.link}
                            className="link link-primary text-[10px] truncate block max-w-[150px]"
                          >
                            {p.link}
                          </a>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {p.clientBudget}
                          </p>
                          {p.isVisited && (
                            <span className="text-[9px] text-success font-black">
                              VISITED
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full Task List */}
                <div>
                  <h3 className="text-xs font-black opacity-50 uppercase mb-2">
                    Full Task Schedule
                  </h3>
                  <div className="space-y-2">
                    {lead.taskScheduled?.map((t, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-1 p-2 bg-base-100 rounded border border-base-300"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs">
                            {t.taskName}
                          </span>
                          <span className="badge badge-xs badge-ghost">
                            {t.taskStatus}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-60 leading-tight">
                          {t.taskDetails} {t.taskDeadline && <span className="font-bold ml-1 text-primary">| Due: {t.taskDeadline}</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    {canDelete && (
                      <button 
                        className="btn btn-error btn-xs outline"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete the lead for ${lead.name}? This action cannot be undone.`)) {
                            const res = await fetch(`/api/leads/${lead._id}`, { method: "DELETE" });
                            if (res.ok) {
                              setLeads(leads.filter(l => l._id !== lead._id));
                            } else {
                              alert("Failed to delete lead.");
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                    {canAddLead && (
                      <button 
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          setEditingId(lead._id);
                          reset(lead);
                          document.getElementById("add_lead_modal").showModal();
                        }}
                      >
                        Edit Lead
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>

      {/* --- PAGINATION --- */}
      {displayedLeads.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm mt-6 gap-4">
          <div className="text-sm opacity-70">
            Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, displayedLeads.length)}</span> of <span className="font-bold">{displayedLeads.length}</span> leads
          </div>
          <div className="flex flex-wrap justify-center gap-4 items-center">
            <select 
              className="select select-sm select-bordered"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={15}>15 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="join">
              <button 
                className="join-item btn btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                «
              </button>
              <button className="join-item btn btn-sm bg-base-200 cursor-default hover:bg-base-200">
                Page {currentPage} of {totalPages === 0 ? 1 : totalPages}
              </button>
              <button 
                className="join-item btn btn-sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STICKY BULK ACTIONS BAR --- */}
      {selectedLeads.length > 0 && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-base-100 border-t border-base-300 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="font-black text-lg">
            <span className="text-primary">{selectedLeads.length}</span> Leads Selected
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select 
              className="select select-sm select-bordered w-full sm:w-auto"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">Change Status...</option>
              <option value="new">New</option>
              <option value="called">Called</option>
              <option value="busy">Busy</option>
              <option value="unreachable">Unreachable</option>
              <option value="not_interested">Not Interested</option>
              <option value="bad_lead">Bad Lead</option>
            </select>
            
            <select 
              className="select select-sm select-bordered w-full sm:w-auto"
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
            >
              <option value="">Change Tag...</option>
              <option value="nestvibe">NestVibe</option>
              <option value="nextimpression">Next Impression</option>
              <option value="no_chinta">No Chinta</option>
              <option value="study_first">Study First</option>
            </select>
            
            <select 
              className="select select-sm select-bordered w-full sm:w-auto"
              value={bulkAssign}
              onChange={(e) => setBulkAssign(e.target.value)}
            >
              <option value="">Assign to...</option>
              {employees.map((emp, i) => (
                <option key={emp.id || emp._id || i} value={emp.name}>{emp.name}</option>
              ))}
            </select>
            
            <button className="btn btn-sm btn-primary w-full sm:w-auto" onClick={applyBulkAction}>
              Apply Actions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
