import { useState, useEffect } from "react";
import {
  Search,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../../../components/Sidebar";
import ChatbotPopup from "../../../components/ChatBot";
import ReactPaginate from "react-paginate";
import { axiosInstance } from "../../../utils/axiosInstance";
import { useSelector } from "react-redux";

export default function MyTickets() {
  const [allTickets, setAllTickets] = useState([]); // Store all tickets from backend
  const [filteredTickets, setFilteredTickets] = useState([]); // Store filtered tickets
  const [displayedTickets, setDisplayedTickets] = useState([]); // Store current page tickets
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [currentEntries, setCurrentEntries] = useState({
    start: 0,
    end: 0,
  });
  
  useEffect(() => {
    const fetchEmployeeData = async () => {
      const accessToken = localStorage.getItem("access_token");

      try {
        const response = await axiosInstance.get("/org/employee/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log("Employee Data:", response.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchEmployeeData();
  }, []);

  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc", // Default to newest first
  });
  const [lastUpdated, setLastUpdated] = useState(
    new Date().toLocaleTimeString()
  );

  const userProfile = useSelector((state) => state.userProfile.user);

  // Initial fetch of all tickets
  useEffect(() => {
    fetchAllTickets();
  }, []);

  // Apply search, sort, and pagination whenever relevant state changes
  useEffect(() => {
    applyFiltersAndPagination();
  }, [allTickets, searchTerm, sortConfig, currentPage, pageSize]);

  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("No access token found. Please log in.");
      }

      // Fetch all tickets without any search/pagination parameters
      const url = `/ticket/all/?created=True&limit=1000`; // Fetch a large number to get all tickets

      console.log("Fetching all tickets with URL:", url);

      const response = await axiosInstance.get(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("API Response:", response.data);

      const ticketsData =
        response.data.results?.all_tickets ||
        response.data.results?.all_ticket ||
        response.data.results ||
        [];

      if (!Array.isArray(ticketsData)) {
        throw new Error("Invalid data format: expected an array of tickets");
      }

      setAllTickets(ticketsData);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error(
        "Error fetching tickets:",
        err.response ? err.response.data : err.message
      );
      
      setError(err.message || "Failed to fetch tickets");
      setAllTickets([]);
      setLoading(false);
    }
  };

  // Apply search, sorting, and pagination
  const applyFiltersAndPagination = () => {
    let filtered = [...allTickets];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(ticket => {
        const searchFields = [
          ticket.ticket_id?.toString(),
          ticket.summary,
          ticket.status,
          ticket.priority,
          ticket.issue_type,
          ticket.product,
          ticket.assigned_to,
          ticket.requester
        ];
        
        return searchFields.some(field => 
          field?.toString().toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle different data types
        if (sortConfig.key === 'created_at' || sortConfig.key === 'updated_at') {
          // Handle date sorting
          aVal = new Date(aVal || 0);
          bVal = new Date(bVal || 0);
        } else if (sortConfig.key === 'ticket_id') {
          // Handle numeric sorting for ticket IDs
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        } else {
          // Handle string sorting
          aVal = aVal?.toString().toLowerCase() || '';
          bVal = bVal?.toString().toLowerCase() || '';
        }

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredTickets(filtered);

    // Apply pagination
    const totalFilteredEntries = filtered.length;
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTickets = filtered.slice(startIndex, endIndex);

    setDisplayedTickets(paginatedTickets);

    // Calculate current entries
    const start = paginatedTickets.length > 0 ? startIndex + 1 : 0;
    const end = Math.min(endIndex, totalFilteredEntries);
    setCurrentEntries({ start, end });
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(0); // Reset to first page when sorting changes
  };

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number.parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page when page size changes
  };

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setCurrentPage(0); // Reset to first page when search changes
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(0);
  };

  const handleTicketClick = (ticketId) => {
    window.location.href = `/request-issue/application-support/sap/resolve-issue/${ticketId}`;
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || "";
    switch (statusLower) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in progress":
      case "working in progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    const priorityLower = priority?.toLowerCase() || "";
    switch (priorityLower) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const getOpenTickets = () => {
    return filteredTickets.filter(
      (t) => t.status?.toLowerCase() === "open"
    ).length;
  };

  const getInProgressTickets = () => {
    return filteredTickets.filter(
      (t) => t.status?.toLowerCase() === "working in progress" || 
             t.status?.toLowerCase() === "in progress"
    ).length;
  };

  // Calculate page count based on filtered results
  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / pageSize));

  return (
    <div className="flex w-full min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-200 pb-4 gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                My Tickets
              </h3>
              <p className="text-gray-600 mt-2">
                Manage and track tickets created by you
              </p>
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors whitespace-nowrap"
                onClick={() =>
                  (window.location.href =
                    "/request-issue/")
                }
              >
                New Ticket
              </button>
              <div className="relative flex-1 lg:flex-none">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 rounded-lg border w-full lg:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <ul className="grid grid-cols-3 gap-4 text-gray-800 text-sm font-medium w-full lg:w-auto">
              <li className="px-3 py-2 border rounded text-center shadow-sm bg-white">
                {filteredTickets.length} Total
              </li>
              <li className="px-3 py-2 border rounded text-center shadow-sm bg-white">
                {getOpenTickets()} Open
              </li>
              <li className="px-3 py-2 border rounded text-center shadow-sm bg-white">
                {getInProgressTickets()} In Progress
              </li>
            </ul>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock size={16} />
                <span>Last updated: {lastUpdated}</span>
              </div>
              <button
                onClick={() => {
                  setCurrentPage(0);
                  setSearchTerm("");
                  fetchAllTickets();
                }}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 bg-white rounded-md shadow-sm mt-4 p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading tickets...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 bg-white rounded-md shadow-sm mt-4 p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="mt-4 text-red-500">{error}</p>
              <button
                onClick={fetchAllTickets}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {displayedTickets.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="w-8 px-3 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="w-8 px-3 py-3"></th>
                          <th
                            className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => requestSort("ticket_id")}
                          >
                            <div className="flex items-center gap-1">
                              Number
                              {sortConfig.key === "ticket_id" && (
                                <span>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => requestSort("summary")}
                          >
                            <div className="flex items-center gap-1">
                              Summary
                              {sortConfig.key === "summary" && (
                                <span>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => requestSort("status")}
                          >
                            <div className="flex items-center gap-1">
                              Status
                              {sortConfig.key === "status" && (
                                <span>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => requestSort("priority")}
                          >
                            <div className="flex items-center gap-1">
                              Priority
                              {sortConfig.key === "priority" && (
                                <span>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => requestSort("created_at")}
                          >
                            <div className="flex items-center gap-1">
                              Created
                              {sortConfig.key === "created_at" && (
                                <span>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displayedTickets.map((ticket, index) => {
                          return (
                            <tr
                              key={ticket.ticket_id || index}
                              className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                                index % 2 === 1 ? "bg-gray-50" : ""
                              }`}
                              onClick={() => handleTicketClick(ticket.ticket_id)}
                            >
                              <td className="w-8 px-3 py-3">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="w-8 px-3 py-3">
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-blue-500">
                                  <span className="text-xs">i</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                {ticket.ticket_id || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium max-w-xs">
                                <div className="truncate" title={ticket.summary}>
                                  {ticket.summary || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    ticket.status
                                  )}`}
                                >
                                  {ticket.status || "N/A"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                    ticket.priority
                                  )}`}
                                >
                                  {ticket.priority || "N/A"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                {formatDate(ticket.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center p-4 border-t border-gray-200 bg-gray-50 gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <label htmlFor="pageSize" className="mr-2 text-sm">
                          Items per page:
                        </label>
                        <select
                          id="pageSize"
                          value={pageSize}
                          onChange={handlePageSizeChange}
                          className="border rounded-md p-1 text-sm"
                        >
                          <option value="2">2</option>
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                        </select>
                      </div>
                      {filteredTickets.length > 0 && (
                        <span className="text-sm text-gray-600">
                          Showing {currentEntries.start} to{" "}
                          {currentEntries.end} of {filteredTickets.length} entries
                          {searchTerm && (
                            <span className="text-blue-600">
                              {" "}(filtered from {allTickets.length} total)
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <ReactPaginate
                        previousLabel={
                          <ChevronLeft size={16} className="text-gray-500" />
                        }
                        nextLabel={
                          <ChevronRight size={16} className="text-gray-500" />
                        }
                        breakLabel={"..."}
                        pageCount={pageCount}
                        marginPagesDisplayed={2}
                        pageRangeDisplayed={3}
                        onPageChange={handlePageClick}
                        forcePage={currentPage}
                        containerClassName="flex space-x-1"
                        pageClassName="p-1 border border-gray-300 rounded bg-white w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-100 text-sm"
                        activeClassName="bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                        previousClassName="p-1 border border-gray-300 rounded bg-white w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                        nextClassName="p-1 border border-gray-300 rounded bg-white w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                        disabledClassName="opacity-50 cursor-not-allowed"
                        breakClassName="p-1 border border-gray-300 rounded bg-white w-8 h-8 flex items-center justify-center"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  {searchTerm
                    ? `No tickets match your search criteria "${searchTerm}"`
                    : "No tickets found"}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <ChatbotPopup />
    </div>
  );
}