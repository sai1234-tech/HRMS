import React, { useState } from "react";
import { useEnterpriseOps } from "../../hooks/useEnterpriseOps";
import "./Helpdesk.css";

export default function Helpdesk() {
  const { tickets, resolveTicket } = useEnterpriseOps();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionText, setResolutionText] = useState("");

  const handleResolve = () => {
    if (!resolutionText.trim() || !selectedTicket) return;
    resolveTicket(selectedTicket.id, resolutionText);
    setSelectedTicket(null);
    setResolutionText("");
  };

  return (
    <main className="helpdesk-hub">
        <header className="helpdesk-header">
          <div>
            <h1>HR Support Helpdesk</h1>
            <p>Manage and resolve employee tickets generated via the AI Assistant.</p>
          </div>
          <div className="helpdesk-stats">
            <div className="stat-badge open">
              <span>{tickets.filter(t => t.status === "Open").length}</span> Open
            </div>
            <div className="stat-badge resolved">
              <span>{tickets.filter(t => t.status === "Resolved").length}</span> Resolved
            </div>
          </div>
        </header>

        <div className="helpdesk-layout">
          {/* Ticket List */}
          <div className="ticket-list-panel">
            {tickets.length === 0 ? (
              <div className="empty-state">No support tickets found.</div>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  className={`ticket-card ${ticket.status.toLowerCase()} ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setResolutionText(ticket.resolution || "");
                  }}
                >
                  <div className="ticket-card-header">
                    <strong>{ticket.id}</strong>
                    <span className={`status-pill ${ticket.status.toLowerCase()}`}>{ticket.status}</span>
                  </div>
                  <div className="ticket-card-emp">Employee: {ticket.empId}</div>
                  <div className="ticket-card-preview">{ticket.query}</div>
                </div>
              ))
            )}
          </div>

          {/* Ticket Detail / Resolution Panel */}
          <div className="ticket-detail-panel">
            {selectedTicket ? (
              <div className="resolution-workspace">
                <h2>Ticket {selectedTicket.id}</h2>
                <div className="detail-row">
                  <span className="label">Employee ID:</span>
                  <span className="value">{selectedTicket.empId}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className={`status-pill ${selectedTicket.status.toLowerCase()}`}>{selectedTicket.status}</span>
                </div>
                
                <div className="query-box">
                  <span className="label">Employee Query / Issue:</span>
                  <p>{selectedTicket.query}</p>
                </div>

                <div className="resolution-box">
                  <span className="label">Resolution / Response:</span>
                  {selectedTicket.status === "Resolved" ? (
                    <div className="resolved-text">{selectedTicket.resolution}</div>
                  ) : (
                    <>
                      <textarea 
                        className="resolution-input"
                        placeholder="Type the resolution to close this ticket..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                      />
                      <div className="action-row">
                        <button className="resolve-btn" onClick={handleResolve}>Mark as Resolved</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-workspace">
                <span className="empty-icon">📥</span>
                <p>Select a ticket from the left to view details or resolve it.</p>
              </div>
            )}
          </div>
        </div>
      </main>
  );
}
