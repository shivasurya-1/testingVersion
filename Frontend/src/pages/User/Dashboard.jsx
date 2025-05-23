"use client";

import { useState, useEffect } from "react";
import { axiosInstance } from "../../utils/axiosInstance";
import { useSelector, useDispatch } from "react-redux";
import Sidebar from "../../components/Sidebar";
import {
  Clock,
  Ticket,
  AlertCircle,
  CheckCircle,
  Play,
  Bell,
  Users,
  BarChart,
  Settings,
  FileText,
  Menu,
  ChevronRight,
  TrendingUp,
  Calendar,
  Activity,
  Target,
  Plus,
  Search,
  Filter,
  RefreshCw,
  User,
  Shield,
  Code,
  UserCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { use } from "react";

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Get user profile from Redux store
  const userProfile = useSelector((state) => state.userProfile?.user);
  const userRole = userProfile?.role || "requestor";

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from localStorage or Redux state
      const token = localStorage.getItem("access_token") || userProfile?.token;

      const response = await axiosInstance.get(
        "ticket/all/?limit=100&offset=0",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );

      const data = response.data;

      // Access the all_tickets array safely
      const ticketArray = data?.results?.all_tickets || [];
      console.log("All tickes Fetched", data);

      setTickets(ticketArray);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching tickets:", err);

      if (err.response) {
        const status = err.response.status;
        if (status === 401) {
          setError("Authentication required. Please log in again.");
        } else if (status === 403) {
          setError("Access denied. Insufficient permissions.");
        } else if (status === 404) {
          setError("Ticket service not available.");
        } else {
          setError(`Server error: ${status}`);
        }
      } else {
        setError(err.message || "An unknown error occurred.");
      }

      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchTickets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Role-based filtering with more robust logic
  const getFilteredTickets = () => {
    if (!tickets.length) return [];

    const currentUserId = userProfile?.id;
    const currentUserEmail = userProfile?.email;
    const currentUsername = userProfile?.username;

    switch (userRole.toLowerCase()) {
      case "requestor":
        // Requestors see only tickets they created
        return tickets.filter(
          (ticket) =>
            ticket.created_by === currentUserId ||
            ticket.requester === currentUserEmail ||
            ticket.requester === currentUsername ||
            ticket.requester_id === currentUserId
        );

      case "developer":
        return tickets.filter((ticket) => {
          const isAssignedToMe = ticket.assignee === currentUsername;

          const isCreatedByMe =
            ticket.created_by === currentUserId ||
            ticket.created_by === currentUsername;

          const isInMyTeam =
            ticket.team &&
            userProfile?.team &&
            ticket.team === userProfile.team;

          return isAssignedToMe || isCreatedByMe || isInMyTeam;
        });

      case "admin":
        // Admins see all tickets
        return tickets;

      default:
        // Default: show only user's own tickets
        return tickets.filter(
          (ticket) =>
            ticket.created_by === currentUserId ||
            ticket.requester_id === currentUserId
        );
    }
  };

  // Fix the getAssignedTickets function - replace the existing function with this:
  const getAssignedTickets = () => {
    if (!tickets.length || userRole.toLowerCase() !== "developer") return [];

    const currentUserId = userProfile?.id;
    const currentUserEmail = userProfile?.email;
    const currentUsername = userProfile?.username;

    return tickets.filter((ticket) => {
      const isAssignedToMe = ticket.assignee === currentUsername;

      const isCreatedByMe =
        ticket.created_by === currentUserId ||
        ticket.created_by === currentUsername;

      return isAssignedToMe && !isCreatedByMe;
    });
  };
  const getMyCreatedTickets = () => {
    if (!tickets.length || userRole.toLowerCase() !== "developer") return [];

    const currentUserId = userProfile?.id;
    const currentUsername = userProfile?.username;

    return tickets.filter(
      (ticket) =>
        ticket.created_by === currentUserId ||
        ticket.created_by === currentUsername
    );
  };

  const filteredTickets = getFilteredTickets();
  const assignedTickets = getAssignedTickets();

  const myCreatedTickets = getMyCreatedTickets();

  // Role-based permissions
  const canCreateTicket = () => {
    return ["requestor", "developer", "admin"].includes(userRole.toLowerCase());
  };

  const canViewAllTickets = () => {
    return ["admin"].includes(userRole.toLowerCase());
  };

  const canAssignTickets = () => {
    return ["admin", "developer"].includes(userRole.toLowerCase());
  };

  // Get role display info
  const getRoleInfo = () => {
    const roleConfig = {
      requestor: {
        icon: User,
        color: "text-blue-600",
        bg: "bg-blue-100",
        label: "Requestor",
      },
      developer: {
        icon: Code,
        color: "text-purple-600",
        bg: "bg-purple-100",
        label: "Developer",
      },
      admin: {
        icon: Shield,
        color: "text-red-600",
        bg: "bg-red-100",
        label: "Administrator",
      },
    };
    return roleConfig[userRole.toLowerCase()] || roleConfig.requestor;
  };

  const roleInfo = getRoleInfo();

  // Process data for charts
  const getPriorityData = () => {
    if (!filteredTickets.length) return [];

    const priorityCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(priorityCounts).map(([priority, count]) => ({
      name: priority,
      value: count,
      color:
        {
          Critical: "#dc2626",
          High: "#ea580c",
          Medium: "#ca8a04",
          Low: "#16a34a",
        }[priority] || "#6b7280",
    }));
  };

  const getImpactData = () => {
    if (!filteredTickets.length) return [];

    const impactCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.impact] = (acc[ticket.impact] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(impactCounts).map(([impact, count]) => ({
      name: impact,
      value: count,
      color:
        {
          High: "#dc2626",
          Medium: "#f59e0b",
          Low: "#10b981",
        }[impact] || "#6b7280",
    }));
  };

  const getStatusData = () => {
    if (!filteredTickets.length) return [];

    const statusCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(" ", "\n"),
      value: count,
      fullName: status,
    }));
  };

  const getDateData = () => {
    if (!filteredTickets.length) return [];

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      const ticketsOnDate = filteredTickets.filter((ticket) => {
        const ticketDate = new Date(ticket.created_at)
          .toISOString()
          .split("T")[0];
        return ticketDate === dateString;
      }).length;

      last7Days.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        tickets: ticketsOnDate,
      });
    }
    return last7Days;
  };

  const priorityData = getPriorityData();
  const impactData = getImpactData();
  const statusData = getStatusData();
  const dateData = getDateData();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getPriorityBadgeColor = (priority) => {
    const colors = {
      Critical: "bg-red-100 text-red-800 border-red-200",
      High: "bg-orange-100 text-orange-800 border-orange-200",
      Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Low: "bg-green-100 text-green-800 border-green-200",
    };
    return colors[priority] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      Open: "bg-blue-100 text-blue-800 border-blue-200",
      "In Progress": "bg-purple-100 text-purple-800 border-purple-200",
      "Working in Progress": "bg-purple-100 text-purple-800 border-purple-200",
      Resolved: "bg-green-100 text-green-800 border-green-200",
      Closed: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter((t) => t.status === "Open").length;
  const inProgressTickets = filteredTickets.filter(
    (t) => t.status && t.status.includes("Progress")
  ).length;
  const resolvedTickets = filteredTickets.filter(
    (t) => t.status === "Resolved" || t.status === "Closed"
  ).length;
  const criticalTickets = filteredTickets.filter(
    (t) => t.priority === "Critical"
  ).length;

  // Developer specific counts
  const assignedToMeCount = assignedTickets.length;
  const myTicketsCount = myCreatedTickets.length;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-700">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ticketing Dashboard
                </h1>
                <p className="text-gray-600">
                  Monitor and manage your support tickets
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleInfo.bg} ${roleInfo.color}`}
                >
                  <roleInfo.icon size={16} className="mr-1" />
                  {roleInfo.label}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Loading Data
              </h3>
              <p className="text-gray-600 mb-4">
                Unable to fetch ticket data: {error}
              </p>
              <button
                onClick={fetchTickets}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!filteredTickets.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ticketing Dashboard
                </h1>
                <p className="text-gray-600">
                  Monitor and manage your support tickets
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleInfo.bg} ${roleInfo.color}`}
                >
                  <roleInfo.icon size={16} className="mr-1" />
                  {roleInfo.label}
                </div>
                <button
                  onClick={fetchTickets}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Ticket className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Tickets Found
              </h3>
              <p className="text-gray-600 mb-4">
                {userRole === "admin"
                  ? "No tickets have been created yet."
                  : "You don't have any tickets yet."}
              </p>
              {canCreateTicket() && (
                <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus size={16} className="mr-2" />
                  Create New Ticket
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Ticketing Dashboard
                  </h1>
                  <p className="text-gray-600">
                    Monitor and manage your support tickets
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div
                    className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleInfo.bg} ${roleInfo.color}`}
                  >
                    <roleInfo.icon size={16} className="mr-1" />
                    {roleInfo.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    Last updated:{" "}
                    {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
                  </div>
                  <button
                    onClick={fetchTickets}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Alert for Critical Tickets */}
            {criticalTickets > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="text-red-600 mr-3" size={20} />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">
                      {criticalTickets} Critical Ticket
                      {criticalTickets > 1 ? "s" : ""} Require
                      {criticalTickets === 1 ? "s" : ""} Immediate Attention
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      These high-priority tickets need urgent resolution to
                      minimize business impact.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats for Developers and Admins */}
            {(userRole === "developer" || userRole === "admin") && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      {userRole === "developer"
                        ? "Your Workload"
                        : "Team Performance"}
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {userRole === "developer"
                        ? `You have ${inProgressTickets} tickets in progress and ${openTickets} waiting to be started.`
                        : `${inProgressTickets} tickets are currently being worked on across the team.`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-800">
                      {Math.round((resolvedTickets / totalTickets) * 100) || 0}%
                    </div>
                    <div className="text-sm text-blue-600">Resolution Rate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div
              className={`grid grid-cols-1 gap-6 mb-8 ${
                userRole === "developer"
                  ? "md:grid-cols-2 lg:grid-cols-7"
                  : "md:grid-cols-2 lg:grid-cols-5"
              }`}
            >
              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 mr-4 bg-blue-100 rounded-lg">
                    <Ticket className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Tickets
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {totalTickets}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 mr-4 bg-orange-100 rounded-lg">
                    <AlertCircle className="text-orange-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Open Tickets
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {openTickets}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 mr-4 bg-purple-100 rounded-lg">
                    <Play className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      In Progress
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {inProgressTickets}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 mr-4 bg-green-100 rounded-lg">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Resolved
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {resolvedTickets}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 mr-4 bg-red-100 rounded-lg">
                    <AlertCircle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Critical
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {criticalTickets}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Developer-specific cards */}
              {userRole === "developer" && (
                <>
                  <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className="p-3 mr-4 bg-indigo-100 rounded-lg">
                        <UserCheck className="text-indigo-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Assigned to Me
                        </p>
                        <h3 className="text-3xl font-bold text-gray-900">
                          {assignedToMeCount}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className="p-3 mr-4 bg-teal-100 rounded-lg">
                        <User className="text-teal-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          My Tickets
                        </p>
                        <h3 className="text-3xl font-bold text-gray-900">
                          {myTicketsCount}
                        </h3>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Charts Section - Smaller */}
            <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
              {/* Priority Distribution */}
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <Target className="mr-2 text-red-600" size={20} />
                  <h3 className="text-base font-semibold text-gray-900">
                    Priority Distribution
                  </h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, `${name} Priority`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {priorityData.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-xs text-gray-600">
                        {item.name}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Distribution */}
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <Activity className="mr-2 text-orange-600" size={20} />
                  <h3 className="text-base font-semibold text-gray-900">
                    Impact Distribution
                  </h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={impactData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {impactData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, `${name} Impact`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {impactData.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-xs text-gray-600">
                        {item.name}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Bar Chart and Date Trend - Smaller */}
            <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
              {/* Status Distribution */}
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <BarChart className="mr-2 text-blue-600" size={20} />
                  <h3 className="text-base font-semibold text-gray-900">
                    Status Distribution
                  </h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value, name, props) => [
                          value,
                          props.payload.fullName,
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        radius={[2, 2, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ticket Trend (Last 7 Days) */}
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <TrendingUp className="mr-2 text-green-600" size={20} />
                  <h3 className="text-base font-semibold text-gray-900">
                    Ticket Trend (Last 7 Days)
                  </h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="tickets"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Developer-specific sections */}
            {userRole === "developer" && (
              <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
                {/* Assigned to Me */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <UserCheck className="mr-2 text-indigo-600" size={20} />
                        <h3 className="text-base font-semibold text-gray-900">
                          Assigned to Me
                        </h3>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium text-indigo-800 bg-indigo-100 rounded-full">
                        {assignedToMeCount}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    {assignedTickets.length > 0 ? (
                      <div className="space-y-3">
                        {assignedTickets.slice(0, 3).map((ticket) => (
                          <div
                            key={ticket.id}
                            className="p-3 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  #{ticket.ticket_id} - {ticket.title}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  Created: {formatDate(ticket.created_at)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-1 ml-2">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityBadgeColor(
                                    ticket.priority
                                  )}`}
                                >
                                  {ticket.priority}
                                </span>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(
                                    ticket.status
                                  )}`}
                                >
                                  {ticket.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {assignedTickets.length > 3 && (
                          <div className="text-center">
                            <button className="text-sm text-indigo-600 hover:text-indigo-800">
                              View all {assignedTickets.length} assigned tickets
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <UserCheck
                          className="mx-auto mb-3 text-gray-400"
                          size={32}
                        />
                        <p className="text-sm text-gray-600">
                          No tickets assigned to you
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* My Created Tickets */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="mr-2 text-teal-600" size={20} />
                        <h3 className="text-base font-semibold text-gray-900">
                          My Created Tickets
                        </h3>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium text-teal-800 bg-teal-100 rounded-full">
                        {myTicketsCount}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    {myCreatedTickets.length > 0 ? (
                      <div className="space-y-3">
                        {myCreatedTickets.slice(0, 3).map((ticket) => (
                          <div
                            key={ticket.id}
                            className="p-3 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  #{ticket.ticket_id} - {ticket.title}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  Created: {formatDate(ticket.created_at)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-1 ml-2">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityBadgeColor(
                                    ticket.priority
                                  )}`}
                                >
                                  {ticket.priority}
                                </span>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(
                                    ticket.status
                                  )}`}
                                >
                                  {ticket.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {myCreatedTickets.length > 3 && (
                          <div className="text-center">
                            <button className="text-sm text-teal-600 hover:text-teal-800">
                              View all {myCreatedTickets.length} created tickets
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User
                          className="mx-auto mb-3 text-gray-400"
                          size={32}
                        />
                        <p className="text-sm text-gray-600">
                          You haven't created any tickets
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Tickets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="mr-2 text-blue-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-900">
                      Recent Tickets
                    </h3>
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing latest 3 tickets
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {filteredTickets
                    .sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at)
                    )
                    .slice(0, 3)
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                #{ticket.ticket_id}
                              </h4>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityBadgeColor(
                                  ticket.priority
                                )}`}
                              >
                                {ticket.priority}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(
                                  ticket.status
                                )}`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <h3 className="text-base font-medium text-gray-900 mb-2">
                              {ticket.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {ticket.description}
                            </p>
                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                              <span>
                                Created: {formatDate(ticket.created_at)}
                              </span>
                              {ticket.assignee && (
                                <span>Assigned to: {ticket.assignee}</span>
                              )}
                              {ticket.impact && (
                                <span>Impact: {ticket.impact}</span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>{" "}
    </div>
  );
}
