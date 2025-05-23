import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { ArrowRight, ChevronsUp, Search, Filter, Clock, AlertCircle, CheckCircle, Calendar, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import ChatbotPopup from '../components/ChatBot';
import { axiosInstance } from '../utils/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';

const IncidentTrackingSystem = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIncident, setExpandedIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [slaData, setSlaData] = useState({});
  const [slaTimers, setSlaTimers] = useState({});

  const navigate = useNavigate();

  // Sample history data

  // Sample articles data


  
 

  // State for active tab
  const [activeTab, setActiveTab] = useState('History');
  const [activeMainTab, setActiveMainTab] = useState('List of Incidents');

  // Function to fetch SLA data for a specific ticket
  const fetchSlaData = async (ticketId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axiosInstance.get(`/ticket/sla-timers/${ticketId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching SLA data for ticket ${ticketId}:`, error);
      return null;
    }
  };

  // Function to calculate time remaining until SLA breach
  const calculateTimeRemaining = (dueDate) => {
    if (!dueDate) return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;

    if (diffMs <= 0) return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, breached: true };

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds, totalSeconds, breached: false };
  };

  // Function to format time remaining
  const formatTimeRemaining = (timeObj) => {
    if (timeObj.breached) return 'SLA Breached';
    return `${timeObj.hours}h ${timeObj.minutes}m ${timeObj.seconds}s`;
  };

  // Update SLA timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimers = {};

      Object.keys(slaData).forEach(ticketId => {
        const data = slaData[ticketId];
        if (data && data.sla_timer && data.sla_timer.sla_due_date) {
          updatedTimers[ticketId] = calculateTimeRemaining(data.sla_timer.sla_due_date);
        }
      });

      setSlaTimers(updatedTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [slaData]);

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const response = await axiosInstance.get('ticket/all/?limit=100&offset=0', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('Incidents:', response.data.results);
        // Add some sample data for visualization if needed
        const enhancedData = response.data.results.all_tickets.map(incident => ({
          ...incident,
          priority: incident.priority || ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
          assignee: incident.assignee || ['John Doe', 'Jane Smith', 'Alex Wilson'][Math.floor(Math.random() * 3)],
          department: incident.department || ['IT', 'HR', 'Finance', 'Operations'][Math.floor(Math.random() * 4)],
        }));

        setIncidents(enhancedData);

        // Fetch SLA data for each incident
        const slaPromises = enhancedData.map(incident => fetchSlaData(incident.ticket_id));
        const slaResults = await Promise.all(slaPromises);

        const newSlaData = {};

        

        slaResults.forEach((data, index) => {
          if (data) {
            newSlaData[enhancedData[index].ticket_id] = {'sla_timer':data};
          }
        });
        
      
        setSlaData(newSlaData);
        console.log('SLA Data:', newSlaData);
        // Calculate time remaining for each SLA
      } catch (error) {
        console.error('Error fetching incidents:', error);
      
        const sampleIncidents = [
          { ticket_id: 'INC-20240520-001', summary: 'Server outage in production environment', status: 'Open', date: 'May 20, 2024', sla: '4 hours', resolvedIn: 'Pending', priority: 'High', assignee: 'John Doe', department: 'IT' },
          { ticket_id: 'INC-20240519-002', summary: 'Login page not working for external users', status: 'Work In Progress', date: 'May 19, 2024', sla: '8 hours', resolvedIn: 'Pending', priority: 'Medium', assignee: 'Jane Smith', department: 'IT' },
          { ticket_id: 'INC-20240518-003', summary: 'Data sync issues between systems', status: 'Work In Progress', date: 'May 18, 2024', sla: '24 hours', resolvedIn: 'Pending', priority: 'Medium', assignee: 'Alex Wilson', department: 'IT' },
          { ticket_id: 'INC-20240517-004', summary: 'Email notification system failure', status: 'Resolved', date: 'May 17, 2024', sla: '4 hours', resolvedIn: '3h 45m', timeForResolution: '3h 45m', priority: 'High', assignee: 'John Doe', department: 'IT' },
          { ticket_id: 'INC-20240516-005', summary: 'Dashboard displaying incorrect metrics', status: 'Resolved', date: 'May 16, 2024', sla: '12 hours', resolvedIn: '10h 15m', timeForResolution: '10h 15m', priority: 'Low', assignee: 'Jane Smith', department: 'Operations' }
        ];

        setIncidents(sampleIncidents);

        // Create sample SLA data for preview
        const sampleSlaData = {};
        sampleIncidents.forEach(incident => {
          if (incident.status !== 'Resolved') {
            const now = new Date();
            const future = new Date(now.getTime() + (Math.random() * 3600000)); // Random time within the next hour

            sampleSlaData[incident.ticket_id] = {
              ticket_id: incident.ticket_id,
              status: incident.status.toLowerCase(),
              sla_timer: {
                sla_id: Math.floor(Math.random() * 100),
                warning_sent: Math.random() > 0.7,
                breach_notified: false,
                start_time: new Date(now.getTime() - (Math.random() * 3600000 * 5)).toISOString(), // Random start time in the past
                paused_time: null,
                total_paused_time: "00:00:00",
                sla_due_date: future.toISOString(),
                breached: false,
                sla_status: "Active",
                created_at: new Date(now.getTime() - (Math.random() * 3600000 * 6)).toISOString(),
                modified_at: new Date().toISOString(),
                ticket: incident.ticket_id,
                created_by: null,
                modified_by: null
              }
            };
          }
        });

        setSlaData(sampleSlaData);
        console.log('Sample SLA Data:', sampleSlaData);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, []);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved':
        return ' text-green-800';
      case 'Work In Progress':
        return ' text-yellow-800';
      case 'Open':
        return ' text-orange-800';
      case 'Blocked':
        return 'text-red-800';
      default:
        return ' text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-600';
      case 'Major':
        return 'text-yellow-600';
      case 'Medium':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get SLA status color based on time remaining
  const getSlaStatusColor = (timeRemaining) => {
    if (!timeRemaining) return 'text-gray-600';
    if (timeRemaining.breached) return 'text-red-600';
    if (timeRemaining.totalSeconds < 3600) return 'text-orange-600'; // Less than 1 hour
    if (timeRemaining.totalSeconds < 7200) return 'text-yellow-600'; // Less than 2 hours
    return 'text-green-600';
  };

  // Filter incidents based on search term and status
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.ticket_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || incident.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Handle incident click
  const handleIncidentClick = (incident) => {
    if (expandedIncident === incident.ticket_id) {
      setExpandedIncident(null);
    } else {
      setExpandedIncident(incident.ticket_id);
      setSelectedIncident(incident);
    }
  };

  // Icon component map
  const IconMap = {
    'CheckCircle': CheckCircle,
    'Clock': Clock,
    'ChevronsUp': ChevronsUp,
    'Search': Search
  };

  const handleClick = () => {
    // Directly navigating to the full path
    navigate('/request-issue/application-support/sap/create-issue');
  };

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <Sidebar />
  
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-4 px-6">
          {/* Header - More compact with streamlined controls */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold text-gray-800">Incident Management</h1>
            <div className="flex space-x-2">
              <button
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                onClick={handleClick}
              >
                <AlertCircle size={14} />
                New Incident
              </button>
            </div>
          </div>
  
          {/* Search and filter - More compact with better alignment */}
          <div className="bg-white rounded shadow-sm mb-4 p-3 flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search incidents..."
                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Work In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Blocked">Blocked</option>
              </select>
              <select className="px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm">
                <option>All Priorities</option>
                <option>Critical</option>
                <option>Major</option>
                <option>Medium</option>
                <option>Low</option>
                <option>Minor</option>
              </select>
            </div>
          </div>
  
          {/* Main content area - More professional styling */}
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="border-b">
              <nav className="flex px-4">
                <button
                  className="py-3 px-2 border-b-2 font-medium text-sm border-blue-500 text-blue-600"
                >
                  Active Incidents
                </button>
              </nav>
            </div>
  
            {/* Incidents list - More compact and better organized */}
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No incidents found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredIncidents.map((incident, index) => {
                    const slaInfo = setSlaData[incident.ticket_id];
                    const timeRemaining = slaTimers[incident.ticket_id];
                    const slaStatus = incident.status;
                    const slaTimeDisplay = incident.status === 'Resolved'
                      ? incident.resolvedIn
                      : (timeRemaining ? formatTimeRemaining(timeRemaining) : 'N/A');
                    const slaTextColor = incident.status === 'Resolved'
                      ? 'text-green-600'
                      : (timeRemaining ? getSlaStatusColor(timeRemaining) : 'text-gray-600');
  
                    return (
                      <div
                        key={incident.ticket_id}
                        className={`border rounded overflow-hidden transition-all duration-200 ${expandedIncident === incident.ticket_id ? 'shadow-sm' : ''}`}
                      >
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer bg-white"
                          onClick={() => handleIncidentClick(incident)}
                        >
                          <div className="flex items-center gap-3 flex-grow">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-semibold text-xs">
                              {index + 1}
                            </div>
                            
                            <div className="flex-grow">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900 text-sm flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full ${getPriorityColor(incident.priority).replace('text-', 'bg-')}`}></span>
                                  {incident.summary}
                                </h3>
                                <span className="text-xs text-gray-500 font-medium">
                                  {incident.ticket_id}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                                  {incident.status}
                                </span>
                                {/* <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {incident.issue_type || 'Issue'}
                                </span> */}
                                <span className="text-xs text-gray-500 ml-1">
                                  <Calendar className="inline h-3 w-3 mr-1" />{incident.created_at.substring(0, 10)}
                                </span>
                              </div>
                            </div>
                          </div>
  
                          <div className="flex items-center gap-4">
                            {/* <div className="text-right text-xs hidden md:block">
                              <div className={`text-gray-600 flex items-center gap-1`}>
                                <Clock size={12} />
                                <span className={slaTextColor + " font-medium"}>
                                  {slaTimeDisplay}
                                </span>
                              </div>
                            </div> */}
                            
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                {incident.assignee}
                              </span>
                            </div>
                            
                            {expandedIncident === incident.ticket_id ? (
                              <ChevronDown size={16} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-400" />
                            )}
                          </div>
                        </div>
  
                        {/* Expanded content - More compact with better organization */}
                        {expandedIncident === incident.ticket_id && (
                          <div className="border-t p-3 bg-gray-50">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <div className="lg:col-span-2">
                                {/* Incident details */}
                                <div className="bg-white p-3 rounded shadow-sm mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-gray-800 text-sm">Incident Details</h4>
                                    <Link
                                      to={`/request-issue/application-support/sap/resolve-issue/${incident.ticket_id}`}
                                      className="text-blue-600 text-xs"
                                    >
                                      View Details
                                    </Link>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <p className="text-gray-500">Ticket ID</p>
                                      <p className="font-medium">{incident.ticket_id}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Created Date</p>
                                      <p className="font-medium">{incident.created_at.substring(0, 10)}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Status</p>
                                      <p className={`font-medium ${getPriorityColor(incident.status)}`}>{incident.status}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Priority</p>
                                      <p className={`font-medium ${getPriorityColor(incident.priority)}`}>{incident.priority}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Assigned To</p>
                                      <p className="font-medium">{incident.assignee}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Department</p>
                                      <p className="font-medium">{incident.department}</p>
                                    </div>
  
                                    {/* SLA information */}
                                    {slaInfo && slaInfo.sla_timer && (
                                      <>
                                        <div>
                                          <p className="text-gray-500">SLA Status</p>
                                          <p className={`font-medium ${slaTextColor}`}>{slaStatus}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">Time Remaining</p>
                                          <p className={`font-medium ${slaTextColor}`}>{slaTimeDisplay}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="lg:col-span-1">
                                {/* <div className="bg-white p-3 rounded shadow-sm h-full">
                                  <h4 className="font-medium text-gray-800 text-sm mb-2">Quick Actions</h4>
                                  <div className="flex flex-col gap-2">
                                    <button className="w-full px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors">
                                      Update Status
                                    </button>
                                    <button className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors">
                                      Add Comment
                                    </button>
                                    <button className="w-full px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors">
                                      Reassign
                                    </button>
                                  </div>
                                </div> */}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
  
          {/* Help section - More compact */}
          {/* <div className="mt-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Need help with incident management?</h3>
                  <p className="text-xs text-gray-600 mt-1">Our support team is available 24/7.</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs">
                    Contact Support
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs">
                    View Docs
                  </button>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
  
      <ChatbotPopup />
    </div>
  );
};

export default IncidentTrackingSystem;