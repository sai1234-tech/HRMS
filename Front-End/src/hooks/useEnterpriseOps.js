import { useState, useCallback, useEffect } from "react";

const INITIAL_EMPLOYEES = [
  { id: "EMP-101", name: "Aisha Sharma", role: "Frontend Developer", status: "Allocated", project: "Project Titan", shift: "Morning", rating: 4 },
  { id: "EMP-102", name: "Rohan Das", role: "Backend Developer", status: "Bench", project: null, shift: "Morning", rating: 3 },
  { id: "EMP-103", name: "Sneha Patel", role: "UX Designer", status: "Allocated", project: "Project Phoenix", shift: "Evening", rating: 5 },
  { id: "EMP-104", name: "Karan Singh", role: "DevOps Engineer", status: "Bench", project: null, shift: "Night", rating: 4 },
];

const INITIAL_OKRS = [
  { id: 1, objective: "Reduce application load time by 30%", result: "Pending Review", score: 0 },
  { id: 2, objective: "Ship Recruitment Module", result: "Completed", score: 5 },
];

const DEFAULT_TICKETS = [
  { id: "TICK-89036", empId: "EMP-102", query: "My computer monitor is broken and I cannot code.", status: "Open", resolution: "" },
  { id: "TICK-44211", empId: "EMP-104", query: "Can you clarify the remote work policy for this Friday?", status: "Resolved", resolution: "Yes, you can work remotely this Friday." }
];

const getStoredTickets = () => {
  const stored = localStorage.getItem("hrms_simulated_tickets");
  return stored ? JSON.parse(stored) : DEFAULT_TICKETS;
};

let INITIAL_TICKETS = getStoredTickets();

export const useEnterpriseOps = () => {
  const [pulseAnswered, setPulseAnswered] = useState(false);
  const [pulseScore, setPulseScore] = useState(null);
  
  const [resourcePool, setResourcePool] = useState(INITIAL_EMPLOYEES);
  const [okrs, setOkrs] = useState(INITIAL_OKRS);
  const [tickets, setTickets] = useState(INITIAL_TICKETS);

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem("hrms_simulated_tickets");
      if (stored) {
        INITIAL_TICKETS = JSON.parse(stored);
        setTickets(INITIAL_TICKETS);
      }
    };
    
    // Listen for changes from other tabs
    window.addEventListener("storage", handleStorage);
    
    // Also listen for a custom event from the same tab
    window.addEventListener("hrms_tickets_updated", handleStorage);
    
    // Sync on mount
    handleStorage();
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("hrms_tickets_updated", handleStorage);
    };
  }, []);

  // --- 1. Pulse Tracker ---
  const submitPulse = useCallback((score) => {
    setPulseScore(score);
    setPulseAnswered(true);
  }, []);

  // --- 2. Bench & Allocation ---
  const allocateResource = useCallback((empId, projectName) => {
    setResourcePool(prev => prev.map(emp => 
      emp.id === empId ? { ...emp, status: "Allocated", project: projectName } : emp
    ));
  }, []);

  const moveToBench = useCallback((empId) => {
    setResourcePool(prev => prev.map(emp => 
      emp.id === empId ? { ...emp, status: "Bench", project: null } : emp
    ));
  }, []);

  // --- 3. Shift Rostering ---
  const updateShift = useCallback((empId, newShift) => {
    setResourcePool(prev => prev.map(emp => 
      emp.id === empId ? { ...emp, shift: newShift } : emp
    ));
  }, []);

  // --- 4. OKRs ---
  const addOkr = useCallback((objective) => {
    setOkrs(prev => [...prev, { id: Date.now(), objective, result: "Pending Review", score: 0 }]);
  }, []);

  const rateOkr = useCallback((okrId, score) => {
    setOkrs(prev => prev.map(o => 
      o.id === okrId ? { ...o, result: "Reviewed", score } : o
    ));
  }, []);

  return {
    pulseAnswered,
    pulseScore,
    submitPulse,
    
    resourcePool,
    allocateResource,
    moveToBench,
    
    updateShift,
    
    okrs,
    addOkr,
    rateOkr,
    
    tickets,
    addTicket: useCallback((empId, query) => {
      const newTicket = { id: `TICK-${Math.floor(Math.random() * 90000) + 10000}`, empId, query, status: "Open", resolution: "" };
      INITIAL_TICKETS.unshift(newTicket);
      localStorage.setItem("hrms_simulated_tickets", JSON.stringify(INITIAL_TICKETS));
      window.dispatchEvent(new Event("hrms_tickets_updated"));
      setTickets([...INITIAL_TICKETS]);
      return newTicket.id;
    }, []),
    resolveTicket: useCallback((ticketId, resolution) => {
      const idx = INITIAL_TICKETS.findIndex(t => t.id === ticketId);
      if (idx > -1) {
        INITIAL_TICKETS[idx].status = "Resolved";
        INITIAL_TICKETS[idx].resolution = resolution;
      }
      localStorage.setItem("hrms_simulated_tickets", JSON.stringify(INITIAL_TICKETS));
      window.dispatchEvent(new Event("hrms_tickets_updated"));
      setTickets([...INITIAL_TICKETS]);
    }, [])
  };
};
