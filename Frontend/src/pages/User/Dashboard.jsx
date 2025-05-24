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
            { title: 'My Tickets', value: totalTickets, icon: User, color: 'bg-blue-500' },
            { title: 'Open', value: statusCounts.open || 0, icon: AlertCircle, color: 'bg-orange-500' },
            { title: 'In Progress', value: statusCounts.working_in_progress || 0, icon: Clock, color: 'bg-yellow-500' },
            { title: 'Closed', value: statusCounts.closed || 0, icon: CheckCircle, color: 'bg-green-500' }
          ]
        };
      
      case 'developer':
        const assignedToMe = filteredTickets.filter(t => t.assignee === userProfile.username);
        const createdByMe = filteredTickets.filter(t => t.created_by === userProfile.username);
        return {
          cards: [
                  { title: 'Total Tickets', value: totalTickets, icon: TrendingUp, color: 'bg-green-500' },
            { title: 'Assigned to Me', value: assignedToMe.length, icon: User, color: 'bg-purple-500' },
            { title: 'Created by Me', value: createdByMe.length, icon: Settings, color: 'bg-blue-500' },
            { title: 'In Progress', value: statusCounts.working_in_progress || 0, icon: Clock, color: 'bg-yellow-500' },
      
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

        const highImpactTickets = tickets.filter(ticket => 
          ticket.impact?.toLowerCase() === 'high'
        );

        return {
          cards: [
            { title: 'All Tickets', value: tickets.length, icon: TrendingUp, color: 'bg-indigo-500' },
            { title: 'Unassigned Tickets', value: unassignedTickets.length, icon: UserX, color: 'bg-red-500' },
            { title: 'High Priority', value: highPriorityTickets.length, icon: AlertCircle, color: 'bg-orange-500' },
            { title: 'High Impact', value: highImpactTickets.length, icon: CheckCircle, color: 'bg-purple-500' }
          ]
        };
      
      case 'admin':
      default:
        return {
          cards: [
            { title: 'Total Tickets', value: totalTickets, icon: TrendingUp, color: 'bg-indigo-500' },
            { title: 'Open', value: statusCounts.open || 0, icon: AlertCircle, color: 'bg-orange-500' },
            { title: 'In Progress', value: statusCounts.working_in_progress || 0, icon: Clock, color: 'bg-yellow-500' },
            { title: 'Closed', value: statusCounts.closed || 0, icon: CheckCircle, color: 'bg-green-500' }
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
      statusChart: Object.entries(statusData).map(([name, value]) => ({ name, value })),
      priorityChart: Object.entries(priorityData).map(([name, value]) => ({ name, value })),
      impactChart: Object.entries(impactData).map(([name, value]) => ({ name, value })),
      dispatcherPriorityChart: Object.entries(dispatcherPriorityData).map(([name, value]) => ({ name, value }))
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

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

  return (
    <div className="flex w-full h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
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

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {stats.cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                    </div>
                    <div className={`${card.color} p-2 rounded-lg`}>
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
                <BarChart data={chartData.statusChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[2, 2, 0, 0]} />
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
              <h3 className="text-base font-semibold text-gray-900 mb-3">Ticket Timeline (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="tickets" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Impact Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Impact Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.impactChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10B981" radius={[2, 2, 0, 0]} />
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
                recentTickets.map((ticket) => (
                  <div key={ticket.ticket_id} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 rounded-r">
                    <div className="flex items-center justify-between mb-1">
                      <span 
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        onClick={() => handleTicketClick(ticket.ticket_id)}
                      >
                        {ticket.ticket_id}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                          ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
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
                ))
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