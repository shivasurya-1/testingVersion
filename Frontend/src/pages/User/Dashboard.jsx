import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Calendar, Clock, User, AlertCircle, CheckCircle, Settings, TrendingUp, UserX, RefreshCw } from 'lucide-react';
import Sidebar from '../../components/Sidebar'; // Adjust the import path as necessary
import {axiosInstance} from '../../utils/axiosInstance'

const Dashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredTicket, setHoveredTicket] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredImpactBarIndex, setHoveredImpactBarIndex] = useState(null);
  const userProfile = useSelector((state) => state.userProfile?.user);
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch if we don't have tickets or if userProfile changed
    if (tickets.length === 0 || !tickets) {
      fetchTickets();
    }
  }, [userProfile]);

const fetchTickets = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    const response = await axiosInstance.get('ticket/all/?limit=100&offset=0', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response.data;

    // Ensure we have the correct data structure
    const ticketData = data.results?.all_tickets || data.all_tickets || data || [];
    setTickets(Array.isArray(ticketData) ? ticketData : []);
    console.log('Tickets:', data);

  } catch (error) {
    console.error('Error fetching tickets:', error);
    setError(error.message || 'Something went wrong');
    setTickets([]);
  } finally {
    setLoading(false);
  }
};

  const handleTicketClick = (ticketId) => {
    navigate(`/request-issue/application-support/sap/resolve-issue/${ticketId}`);
  };

  const getFilteredTickets = () => {
    if (!userProfile || !tickets.length) return [];
    
    const role = userProfile.role?.toLowerCase();
    
    switch (role) {
      case 'requester':
        return tickets.filter(ticket => ticket.created_by === userProfile.username);
      case 'developer':
        return tickets.filter(ticket => 
          ticket.assignee === userProfile.username || 
          ticket.created_by === userProfile.username
        );
      case 'dispatcher':
        // For dispatcher, show tickets that are either:
        // 1. Assigned to "Dispatcher" (unassigned tickets needing assignment)
        // 2. All tickets for oversight
        return tickets.filter(ticket => 
          ticket.assignee === 'Dispatcher' || 
          ticket.assignee === userProfile.username ||
          !ticket.assignee || 
          ticket.assignee === '' ||
          ticket.assignee === null
        );
      case 'admin':
      default:
        return tickets;
    }
  };

  const filteredTickets = getFilteredTickets();

  // Updated Color helper functions with consistent industry standards
  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_');
    switch (normalizedStatus) {
      case 'open': return '#007BFF'; // Blue
      case 'working_in_progress': return '#FFC107'; // Yellow/Amber
      case 'waiting_for_user_response': return '#6F42C1'; // Purple
      case 'resolved': return '#28A745'; // Green
      case 'closed': return '#6C757D'; // Dark Gray
      case 'breached': return '#DC3545'; // Red
      case 'canceled': return '#ADB5BD'; // Light Gray
      case 'delegated': return '#20C997'; // Teal
      default: return '#6C757D'; // Default to Dark Gray
    }
  };

  const getPriorityColor = (priority) => {
    const normalizedPriority = priority?.toLowerCase();
    switch (normalizedPriority) {
      case 'critical': return '#DC3545'; // Red
      case 'high': return '#FD7E14'; // Orange
      case 'medium': return '#007BFF'; // Blue
      case 'low': return '#28A745'; // Green
      default: return '#28A745'; // Default to Green (Low)
    }
  };

  const getImpactColor = (impact) => {
    const normalizedImpact = impact?.toLowerCase();
    switch (normalizedImpact) {
      case 'a':
      case 'high': return '#FD7E14'; // Orange (High)
      case 'b':
      case 'medium': return '#007BFF'; // Blue (Medium)
      case 'c':
      case 'low': return '#28A745'; // Green (Low)
      case 'd':
      case 'critical': return '#DC3545'; // Red (Critical)
      default: return '#28A745'; // Default to Green (Low)
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    const normalizedPriority = priority?.toLowerCase();
    switch (normalizedPriority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatsForRole = () => {
    const role = userProfile?.role?.toLowerCase();
    const totalTickets = filteredTickets.length;
    
    const statusCounts = filteredTickets.reduce((acc, ticket) => {
      const status = ticket.status?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const priorityCounts = filteredTickets.reduce((acc, ticket) => {
      const priority = ticket.priority?.toLowerCase() || 'unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const impactCounts = filteredTickets.reduce((acc, ticket) => {
      const impact = ticket.impact?.toLowerCase() || 'unknown';
      acc[impact] = (acc[impact] || 0) + 1;
      return acc;
    }, {});

    switch (role) {
      case 'requester':
        return {
          cards: [
            { title: 'Total Tickets', value: totalTickets, icon: TrendingUp, color: 'bg-indigo-500' },
            { title: 'My Tickets', value: totalTickets, icon: User, color: 'bg-blue-500' },
            { title: 'Open', value: statusCounts.open || 0, icon: AlertCircle, color: 'bg-blue-500' },
            { title: 'In Progress', value: statusCounts.working_in_progress || 0, icon: Clock, color: 'bg-yellow-500' },
            { title: 'Resolved', value: statusCounts.resolved || 0, icon: CheckCircle, color: 'bg-green-500' }
          ]
        };
      
      case 'developer':
        const assignedToMe = filteredTickets.filter(t => t.assignee === userProfile.username);
        const createdByMe = filteredTickets.filter(t => t.created_by === userProfile.username);
        return {
          cards: [
            { title: 'Total Tickets', value: totalTickets, icon: TrendingUp, color: 'bg-indigo-500' },
            { title: 'My Tickets', value: createdByMe.length, icon: Settings, color: 'bg-blue-500' },
            { title: 'Assigned to Me', value: assignedToMe.length, icon: User, color: 'bg-purple-500' },
            { title: 'Open', value: statusCounts.open || 0, icon: AlertCircle, color: 'bg-blue-500' },
            { title: 'In Progress', value: statusCounts.working_in_progress || 0, icon: Clock, color: 'bg-yellow-500' },
            { title: 'Resolved', value: statusCounts.resolved || 0, icon: CheckCircle, color: 'bg-green-500' }
          ]
        };
      
      case 'dispatcher':
        // Calculate unassigned tickets (assigned to "Dispatcher" or null/empty)
        const unassignedTickets = tickets.filter(ticket => 
          ticket.assignee === 'Dispatcher' || 
          !ticket.assignee || 
          ticket.assignee === '' ||
          ticket.assignee === null
        );
        
        const highPriorityTickets = tickets.filter(ticket => 
          ticket.priority?.toLowerCase() === 'high'
        );

        const criticalPriorityTickets = tickets.filter(ticket => 
          ticket.priority?.toLowerCase() === 'critical'
        );

        return {
          cards: [
            { title: 'Total Tickets', value: tickets.length, icon: TrendingUp, color: 'bg-indigo-500' },
            { title: 'Unassigned Tickets', value: unassignedTickets.length, icon: UserX, color: 'bg-red-500' },
            { title: 'Critical Priority', value: criticalPriorityTickets.length, icon: AlertCircle, color: 'bg-red-500' },
            { title: 'High Priority', value: highPriorityTickets.length, icon: CheckCircle, color: 'bg-orange-500' }
          ]
        };
      
      case 'admin':
      default:
        return {
          cards: [
            { title: 'Total Tickets', value: totalTickets, icon: TrendingUp, color: 'bg-indigo-500' },
            { title: 'Open', value: statusCounts.open || 0, icon: AlertCircle, color: 'bg-blue-500' },
            { title: 'In Progress', value: statusCounts.working_in_progress || 0, icon: Clock, color: 'bg-yellow-500' },
            { title: 'Resolved', value: statusCounts.resolved || 0, icon: CheckCircle, color: 'bg-green-500' }
          ]
        };
    }
  };

  const getChartData = () => {
    const statusData = filteredTickets.reduce((acc, ticket) => {
      const status = ticket.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const priorityData = filteredTickets.reduce((acc, ticket) => {
      const priority = ticket.priority || 'Unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const impactData = filteredTickets.reduce((acc, ticket) => {
      const impact = ticket.impact || 'Unknown';
      acc[impact] = (acc[impact] || 0) + 1;
      return acc;
    }, {});

    // For dispatcher, use priority data instead of assignment status
    let dispatcherPriorityData = {};
    if (userProfile?.role?.toLowerCase() === 'dispatcher') {
      dispatcherPriorityData = tickets.reduce((acc, ticket) => {
        const priority = ticket.priority || 'Unknown';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});
    }

    return {
      statusChart: Object.entries(statusData).map(([name, value]) => ({ 
        name, 
        value, 
        color: getStatusColor(name) 
      })),
      priorityChart: Object.entries(priorityData).map(([name, value]) => ({ 
        name, 
        value, 
        color: getPriorityColor(name) 
      })),
      impactChart: Object.entries(impactData).map(([name, value]) => ({ 
        name, 
        value, 
        color: getImpactColor(name) 
      })),
      dispatcherPriorityChart: Object.entries(dispatcherPriorityData).map(([name, value]) => ({ 
        name, 
        value, 
        color: getPriorityColor(name) 
      }))
    };
  };

  const getRecentTickets = () => {
    return filteredTickets
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5); // Show 5 recent tickets instead of 3
  };

  const getTimelineData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const ticketsOnDate = filteredTickets.filter(ticket => 
        ticket.created_at && ticket.created_at.split('T')[0] === dateStr
      ).length;
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tickets: ticketsOnDate
      });
    }
    return last7Days;
  };

  // Custom Bar shape component for hover effect
  const CustomBar = (props) => {
    const { fill, payload, index, ...rest } = props;
    const isHovered = hoveredBarIndex === index;
    
    return (
      <rect
        {...rest}
        fill={fill}
        stroke={isHovered ? fill : 'none'}
        strokeWidth={isHovered ? 3 : 0}
        opacity={isHovered ? 0.8 : 1}
        style={{
          filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
          transition: 'all 0.2s ease-in-out'
        }}
      />
    );
  };

  // Custom Bar shape component for Impact chart hover effect
  const CustomImpactBar = (props) => {
    const { fill, payload, index, ...rest } = props;
    const isHovered = hoveredImpactBarIndex === index;
    
    return (
      <rect
        {...rest}
        fill={fill}
        stroke={isHovered ? fill : 'none'}
        strokeWidth={isHovered ? 3 : 0}
        opacity={isHovered ? 0.8 : 1}
        style={{
          filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
          transition: 'all 0.2s ease-in-out'
        }}
      />
    );
  };

  // Custom Tooltip with no background
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
          <p className="text-sm font-medium">{`${label}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  // Show error state
  if (error) {
    return (
      <div className="flex w-full h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-red-600 mb-2">Error loading dashboard</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <button 
              onClick={fetchTickets}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex w-full h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto flex items-center justify-center">
          <div className="text-lg font-medium text-gray-600">Loading dashboard...</div>
        </main>
      </div>
    );
  }

  const stats = getStatsForRole();
  const chartData = getChartData();
  const recentTickets = getRecentTickets();
  const timelineData = getTimelineData();

  // Function to get grid classes based on role
  const getGridClasses = () => {
    const role = userProfile?.role?.toLowerCase();
    const cardCount = stats.cards.length;
    
    switch (role) {
      case 'requester':
        // 5 cards in one row
        return 'grid grid-cols-5 gap-4';
      case 'developer':
        // 6 cards in one row
        return 'grid grid-cols-6 gap-4';
      case 'dispatcher':
        // 4 cards in one row
        return 'grid grid-cols-4 gap-4';
      case 'admin':
      default:
        // 4 cards in one row
        return 'grid grid-cols-4 gap-4';
    }
  };

  return (
    <div className="flex w-full h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-4 h-full overflow-y-auto">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {userProfile?.first_name || 'User'}
              </h1>
              <p className="text-gray-600 text-sm">
                {userProfile?.role} Dashboard - {userProfile?.organisation_name}
              </p>
            </div>
            <button
              onClick={fetchTickets}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
              }`}
              title="Refresh dashboard data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Stats Cards - Single Row Layout Based on Role */}
          <div className={`mb-4 ${getGridClasses()}`}>
            {stats.cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div 
                  key={index} 
                  className="bg-white shadow-sm border border-gray-200 p-2 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                    </div>
                    <div className={`${card.color} p-3 rounded-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* First Row: Charts based on role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Status Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart 
                  data={chartData.statusChart}
                  onMouseMove={(state) => {
                    if (state && state.activeTooltipIndex !== undefined) {
                      setHoveredBarIndex(state.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis fontSize={10} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Bar 
                    dataKey="value" 
                    radius={[2, 2, 0, 0]}
                    shape={<CustomBar />}
                  >
                    {chartData.statusChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Priority Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={userProfile?.role?.toLowerCase() === 'dispatcher' ? chartData.dispatcherPriorityChart : chartData.priorityChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({name, percent}) => `${name.substring(0,8)} ${(percent * 100).toFixed(0)}%`}
                    fontSize={9}
                  >
                    {(userProfile?.role?.toLowerCase() === 'dispatcher' ? chartData.dispatcherPriorityChart : chartData.priorityChart).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Second Row: Timeline and Impact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Timeline Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Ticket Timeline</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10}
                    interval={0}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="tickets" stroke="#007BFF" fill="#007BFF" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Impact Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Impact Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart 
                  data={chartData.impactChart}
                  onMouseMove={(state) => {
                    if (state && state.activeTooltipIndex !== undefined) {
                      setHoveredImpactBarIndex(state.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => setHoveredImpactBarIndex(null)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10}
                    interval={0}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis fontSize={10} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Bar 
                    dataKey="value" 
                    radius={[2, 2, 0, 0]}
                    shape={<CustomImpactBar />}
                  >
                    {chartData.impactChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Recent Tickets</h3>
              <span className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => {
                  const statusColor = getStatusColor(ticket.status);
                  const isHovered = hoveredTicket === ticket.ticket_id;
                  return (
                    <div 
                      key={ticket.ticket_id} 
                      className={`border-l-4 pl-3 py-2 rounded-r transition-all duration-200 cursor-pointer ${
                        isHovered ? 'transform scale-[1.02] shadow-md' : ''
                      }`}
                      style={{ 
                        borderLeftColor: statusColor,
                        borderLeftWidth: isHovered ? '6px' : '4px'
                      }}
                      onMouseEnter={() => setHoveredTicket(ticket.ticket_id)}
                      onMouseLeave={() => setHoveredTicket(null)}
                      onClick={() => handleTicketClick(ticket.ticket_id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span 
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                        >
                          {ticket.ticket_id}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadgeStyle(ticket.priority)}`}>
                            {ticket.priority || 'Low'}
                          </span>
                          {(ticket.assignee === 'Dispatcher' || !ticket.assignee) && userProfile?.role?.toLowerCase() === 'dispatcher' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                              Needs Assignment
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{ticket.summary}</p>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                        <span>
                          {ticket.assignee === 'Dispatcher' || !ticket.assignee ? 
                            'Unassigned' : 
                            ticket.assignee
                          }
                        </span>
                        <span>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'No date'}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No tickets found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;