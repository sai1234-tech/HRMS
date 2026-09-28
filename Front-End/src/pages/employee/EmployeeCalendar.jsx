import React, { useState, useEffect } from "react";
import EmployeeHeader from "../../components/employee/EmployeeHeader";
import { apiRequest } from "../../services/apiClient";
import "./EmployeeCalendar.css";
import { toast } from "react-toastify";

export default function EmployeeCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const [holidayRes, leaveRes] = await Promise.all([
        apiRequest("/holidays"),
        apiRequest("/leaves/my-leaves")
      ]);
      
      if (holidayRes.success) setHolidays(holidayRes.data);
      if (leaveRes.success) setLeaves(leaveRes.data);
    } catch (error) {
      toast.error("Failed to sync calendar data");
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = (e) => {
    e?.preventDefault();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = (e) => {
    e?.preventDefault();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = (e) => {
    e?.preventDefault();
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Enterprise standard: Fixed 42-cell (6 weeks x 7 days) calendar grid to prevent height jumps
  // Only firstDayOfWeek needed for the grid; the single-pass Array.from handles all 42 cells
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)

  // Enterprise standard: Fixed 42-cell (6 weeks x 7 days) calendar grid.
  // CRITICAL: Each cell gets a STABLE index-based key (cell-0..cell-41).
  // If keys change (e.g. prev-28 → curr-1), React unmounts+remounts ALL 42 divs
  // causing a visible layout flash. Stable keys make React update in-place.
  const calendarGrid = Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(year, month, 1 - firstDayOfWeek + index);
    return {
      index,                          // stable grid position: 0..41
      dayNumber: cellDate.getDate(),
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === month,
    };
  });

  const getHolidaysForDate = (dateObj) => {
    const target = new Date(dateObj);
    target.setHours(0, 0, 0, 0);
    
    return holidays.filter(h => {
      const hDate = new Date(h.date);
      hDate.setHours(0, 0, 0, 0);
      return hDate.getTime() === target.getTime();
    });
  };

  const getLeavesForDate = (dateObj) => {
    const target = new Date(dateObj);
    target.setHours(0, 0, 0, 0);
    
    return leaves.filter(l => {
      if (l.status !== 'Approved' && l.status !== 'Pending') return false;
      const start = new Date(l.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(l.endDate);
      end.setHours(0, 0, 0, 0);
      return target >= start && target <= end;
    });
  };

  const isTodayDate = (dateObj) => {
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  };

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return (
    <>
      <EmployeeHeader />
      <main className="employee-calendar-hub">
        <section className="calendar-hero-banner">
          <div className="calendar-hero-left">
            <div className="hero-kicker-pill">
              <span className="pulsing-live-dot"></span>
              <span>Corporate Schedule</span>
            </div>
            <h1>Annual Holiday Calendar</h1>
            <p>View upcoming corporate holidays, planned time off, and company-wide closures.</p>
          </div>
        </section>

        {loading ? (
          <div className="calendar-loading">Loading Calendar...</div>
        ) : (
          <div className="calendar-workspace">
            {/* Left Side: The Interactive Fixed Grid */}
            <div className="calendar-grid-panel">
              <div className="calendar-controls">
                <div className="calendar-month-title-wrap">
                  <h2>{monthNames[month]} <span className="year-highlight">{year}</span></h2>
                </div>
                <div className="calendar-nav-btns">
                  <button type="button" onClick={prevMonth} className="nav-btn" title="Previous Month">
                    &larr; Prev
                  </button>
                  <button type="button" onClick={goToToday} className="nav-btn today-btn" title="Go to Current Month">
                    Today
                  </button>
                  <button type="button" onClick={nextMonth} className="nav-btn" title="Next Month">
                    Next &rarr;
                  </button>
                </div>
              </div>

              <div className="calendar-grid-container">
                <div className="calendar-weekdays">
                  {dayNames.map(day => (
                    <div key={day} className="weekday-header">{day}</div>
                  ))}
                </div>
                
                <div className="calendar-days">
                  {calendarGrid.map((cell) => {
                    const dailyHolidays = getHolidaysForDate(cell.date);
                    const dailyLeaves = getLeavesForDate(cell.date);
                    const isToday = isTodayDate(cell.date);
                    
                    return (
                      <div 
                        key={`cell-${cell.index}`}  // Stable key: never changes regardless of month
                        className={`calendar-day ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${dailyHolidays.length > 0 ? 'has-holiday' : ''}`}
                      >
                        <div className="day-header">
                          <span className="day-number">{cell.dayNumber}</span>
                          {dailyHolidays.length > 0 && cell.isCurrentMonth && (
                            <span className="holiday-indicator-dot" title="Holiday Scheduled"></span>
                          )}
                        </div>
                        
                        <div className="day-events">
                          {dailyHolidays.map((holiday, idx) => (
                            <div 
                              key={`h-${idx}`} 
                              className={`holiday-badge ${holiday.type.toLowerCase().replace(/\s+/g, '-')}`} 
                              title={`${holiday.title} (${holiday.type})`}
                            >
                              <span className="event-dot"></span>
                              <span className="event-title">{holiday.title}</span>
                            </div>
                          ))}
                          
                          {dailyLeaves.map((leave, idx) => (
                            <div 
                              key={`l-${idx}`} 
                              className={`holiday-badge personal-leave ${leave.status.toLowerCase()}`} 
                              title={`${leave.leaveType?.name || 'Leave'} - ${leave.status}`}
                            >
                              <span className="event-dot"></span>
                              <span className="event-title">{leave.leaveType?.name || 'PTO'} ({leave.status})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Side: Upcoming List & Legend */}
            <div className="calendar-sidebar">
              <div className="sidebar-card">
                <h3>Upcoming Holidays</h3>
                <div className="upcoming-list">
                  {upcomingHolidays.length > 0 ? upcomingHolidays.map(holiday => {
                    const d = new Date(holiday.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={holiday._id} className="upcoming-item">
                        <div className="upcoming-date">
                          <span className="month">{monthNames[d.getMonth()].substring(0, 3)}</span>
                          <span className="day">{d.getDate()}</span>
                        </div>
                        <div className="upcoming-details">
                          <h4>{holiday.title}</h4>
                          <span className="type">{holiday.type}</span>
                          <span className="countdown">
                            {diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : `In ${diffDays} days`}
                          </span>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="no-holidays">No upcoming holidays scheduled.</p>
                  )}
                </div>
              </div>
              
              <div className="legend-card">
                <h3>Calendar Legend</h3>
                <div className="legend-list">
                  <div className="legend-item">
                    <span className="legend-color public-holiday"></span>
                    <span>Public Holiday (Mandatory Off)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color optional-holiday"></span>
                    <span>Optional / Restricted Holiday</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color company-off"></span>
                    <span>Company Off / Retreat</span>
                  </div>
                  <div className="legend-item" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <span className="legend-color personal-leave"></span>
                    <span>My Approved Leaves (PTO)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color personal-leave-pending"></span>
                    <span>My Pending Leaves</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
