import { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../utils/axiosInstance";
import Sidebar from "../components/Sidebar";
import ChatbotPopup from "../components/ChatBot";
import { ToastContainer, toast } from "react-toastify";
import ReactPaginate from "react-paginate";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import { useSelector } from "react-redux";

export default function DispatcherPage() {
  // State for page data
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0); 
  const [availableSolutionGroups, setAvailableSolutionGroups] = useState([]);
  const [currentEntries, setCurrentEntries] = useState({
    start: 0, 
    end: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // State for assignment modal
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [supportStaff, setSupportStaff] = useState([]);
  const [flatEmployeeData, setFlatEmployeeData] = useState([]);
  const [supportOrganizations, setSupportOrganizations] = useState([]);
  const [solutionGroups, setSolutionGroups] = useState([]);
  const [assignmentData, setAssignmentData] = useState({
    assigneeId: "",
    supportOrgId: "",
    solutionGroupId: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [adminOrganization, setAdminOrganization] = useState("");
  const accessToken = localStorage.getItem("access_token");

  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const userProfile = useSelector((state) => state.userProfile.user);

  // Update admin organization when user profile is available
  useEffect(() => {
    if (userProfile?.organisation_name) {
      setAdminOrganization(userProfile.organisation_name);
    }
  }, [userProfile]);

  // Filter staff data when adminOrganization changes
  useEffect(() => {
    if (adminOrganization && flatEmployeeData.length > 0) {
      const cleanedStaffData = flatEmployeeData.filter(
        (item) =>
          item.organisation_name?.toLowerCase() ===
          adminOrganization.toLowerCase()
      );
      setSupportStaff(cleanedStaffData);
    }
  }, [adminOrganization, flatEmployeeData]);

  // Fetch unassigned tickets on component mount
  useEffect(() => {
    fetchUnassignedTickets();
    fetchSupportData();
  }, []);

  // Fetch tickets when page size or current page changes
  useEffect(() => {
    if (!isSearching) {
      fetchUnassignedTickets();
    }
  }, [pageSize, currentPage]);

  // Reset to first page and refetch when search term changes (with debounce)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim() !== "") {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        setCurrentPage(0);
        fetchUnassignedTickets();
      }, 500);
    } else {
      setIsSearching(false);
      setCurrentPage(0);
      fetchUnassignedTickets();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const flattenEmployees = (data, parentInfo = null) => {
    let result = [];

    data.forEach((entry) => {
      const { children, ...employeeData } = entry;

      result.push({
        ...employeeData,
        id: employeeData.employee_id, // Ensure id property exists
        isChild: parentInfo !== null,
        parentUsername: parentInfo?.username || null,
        parentId: parentInfo?.employee_id || null,
      });

      if (children && Array.isArray(children) && children.length > 0) {
        const childEntries = flattenEmployees(children, {
          username: employeeData.username,
          employee_id: employeeData.employee_id,
        });
        result = result.concat(childEntries);
      }
    });

    return result;
  };

  const fetchUnassignedTickets = async () => {
    setLoading(true);

    try {
      // Calculate offset based on current page and page size
      const offset = currentPage * pageSize;
      
      // Prepare query parameters for pagination and search
      const params = {
        limit: pageSize,
        offset: offset
      };
      
      // Add search term if it exists
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await axiosInstance.get("/ticket/dispatcher/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: params
      });
      
      // Update tickets and total count - assuming API returns total count
      const allTickets = response.data.results?.all_tickets || response.data.results?.all_ticket || [];
      setUnassignedTickets(allTickets);
      
      // Update total count if the API provides it
      if (response.data.count !== undefined) {
        setTotalEntries(response.data.count);
      } else {
        // Fallback to local count if API doesn't provide total
        setTotalEntries(allTickets.length);
      }
      
      // Calculate current entries
      const start = allTickets.length > 0 ? offset + 1 : 0;
      const end = Math.min(offset + pageSize, offset + allTickets.length);
      setCurrentEntries({ start, end });
      
    } catch (error) {
      console.error("Error fetching unassigned tickets:", error);
      toast.error("Failed to load unassigned tickets");
      setUnassignedTickets([]);
      setTotalEntries(0);
      setCurrentEntries({ start: 0, end: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    try {
      const [staffRes, orgsRes, solutionsRes] = await Promise.all([
        axiosInstance.get("/user/api/assignee/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axiosInstance.get("org/autoAssignee/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axiosInstance.get("/solution_grp/create/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      setSupportStaff(staffRes.data);

      // Process employee data
      // if (staffRes.data && Array.isArray(staffRes.data)) {
      //   const flattened = flattenEmployees(staffRes.data);
      //   setFlatEmployeeData(flattened);

      //   // Initial filtering (will be refined in useEffect when adminOrganization is confirmed)
      //   if (adminOrganization) {
      //     const filtered = flattened.filter(
      //       emp => emp.organisation_name?.toLowerCase() === adminOrganization.toLowerCase()
      //     );
      //     setSupportStaff(filtered);
      //   } else {
      //     setSupportStaff(flattened);
      //   }
      // }

      // Process organization data
      if (orgsRes.data && Array.isArray(orgsRes.data)) {
        const cleanedOrgData = orgsRes.data.map((item) => ({
          username: item.username,
          organisation_name: item.organisation_name,
          solutiongroup: item.solutiongroup,
        }));
        setSupportOrganizations(cleanedOrgData);
      }

      // Process solution groups data
      if (Array.isArray(solutionsRes.data)) {
        // If returned data is an array of objects with group_name property
        if (solutionsRes.data.length > 0 && solutionsRes.data[0]?.group_name) {
          // Map to just the group names for display
          const groupNames = solutionsRes.data.map((group) => group.group_name);
          setSolutionGroups(groupNames);
          setAvailableSolutionGroups(groupNames);
        } else {
          // If it's just an array of strings or primitive values
          setSolutionGroups(solutionsRes.data);
          setAvailableSolutionGroups(solutionsRes.data);
        }
      }
    } catch (error) {
      console.error("Error fetching support data:", error);
      toast.error("Failed to load support data");
      setSupportStaff([]);
      setSupportOrganizations([]);
      setSolutionGroups([]);
    }
  };

  const handlePageClick = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const handleSolutionGroupChange = (e) => {
    const solutionGroupId = e.target.value;
    setAssignmentData((prev) => ({ ...prev, solutionGroupId }));
  };

  const openAssignmentModal = (ticket) => {
    setSelectedTicket(ticket);
    setAssignmentData({
      assigneeId: "",
      supportOrgId: "",
      solutionGroupId: "",
    });
    setShowAssignmentModal(true);
  };

  const handleAssigneeChange = (e) => {
    const assigneeId = e.target.value;

    // Find the selected staff member
    const selectedStaff = supportStaff.find(
      (staff) =>
        staff.id?.toString() === assigneeId ||
        staff.employee_id?.toString() === assigneeId
    );

    if (selectedStaff) {
      setAssignmentData((prev) => ({
        ...prev,
        assigneeId,
        assignee: selectedStaff.username,
        supportOrgId: selectedStaff.organisation_name,
      }));
    } else {
      setAssignmentData((prev) => ({ ...prev, assigneeId }));
    }
  };

  const handleAssignTicket = async (e) => {
    e.preventDefault();

    if (!assignmentData.assigneeId) {
      toast.error("Please select an assignee");
      return;
    }

    if (!assignmentData.solutionGroupId) {
      toast.error("Please select a solution group");
      return;
    }

    setAssignLoading(true);

    if (!accessToken) {
      toast.error("Please log in to assign tickets");
      setAssignLoading(false);
      return;
    }
    console.log(
      "Assigning ticket with data Dispatcher:",
      assignmentData,
      "Selected ticket:",
      selectedTicket
    );
    try {
      await axiosInstance.put(
        `/ticket/dispatcher/`,
        {
          ticket_id: selectedTicket.ticket_id,
          developer_organization: assignmentData.supportOrgId,
          is_active: true,
          assignee: assignmentData.assigneeId,
          solution_grp: assignmentData.solutionGroupId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log("Ticket assigned successfully", assignmentData.assigneeId);

      // After successful assignment, refresh the ticket list
      fetchUnassignedTickets();
      toast.success(
        `Ticket #${selectedTicket.ticket_id} assigned successfully`
      );

      setShowAssignmentModal(false);
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast.error("Failed to assign ticket");
    } finally {
      setAssignLoading(false);
    }
  };

  const getOrganizationName = (orgId) => {
    if (!orgId) return "Not assigned";

    // If orgId is already a name
    if (typeof orgId === "string") {
      return orgId;
    }

    // Otherwise try to find by ID
    const org = supportOrganizations.find(
      (org) =>
        org.organisation_id?.toString() === orgId.toString() ||
        org.id?.toString() === orgId.toString()
    );

    return org ? org.organisation_name : "Unknown Organization";
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get priority badge class
  const getPriorityBadgeClass = (priority) => {
    if (!priority) return "bg-gray-100 text-gray-800";

    const priorityLower = priority.toLowerCase();
    if (priorityLower === "high" || priorityLower === "critical")
      return "bg-red-100 text-red-800";
    if (priorityLower === "medium") return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  // Calculate page count based on total entries
  const pageCount = Math.max(1, Math.ceil(totalEntries / pageSize));

  return (
    <div className="flex w-full h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="p-4 max-w-full">
          {/* Condensed Header */}
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Dispatcher Dashboard
              </h1>
              <p className="text-gray-500 text-sm">
                Assign unassigned tickets to support staff members
              </p>
            </div>
            <button
              onClick={() => {
                setCurrentPage(0);
                setSearchTerm("");
                fetchUnassignedTickets();
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <FiRefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* Search bar in a row with other controls */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative w-64">
              <input
                ref={searchInputRef}
                type="text"
                className="border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={handleSearchInputChange}
              />
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" size={16} />
              </div>
            </div>

            <div className="flex items-center text-sm ml-auto">
              <label htmlFor="pageSize" className="text-gray-600 mr-1">
                Show:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>

              <span className="ml-2 text-sm text-gray-600">
                {currentEntries.start}-{currentEntries.end} of {totalEntries}
              </span>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-fit">
            {loading ? (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600 text-sm">Loading tickets...</p>
              </div>
            ) : !unassignedTickets.length ? (
              <div className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                  >
                    <path d="M10 21h4M19 12V8.2c0-1.12 0-1.68-.218-2.108a2 2 0 00-.874-.874C17.48 5 16.92 5 15.8 5H8.2c-1.12 0-1.68 0-2.108.218a2 2 0 00-.874.874C5 6.52 5 7.08 5 8.2V12" />
                    <path d="M15 17H9c-.93 0-1.395 0-1.776.102a3 3 0 00-2.122 2.122C5 19.605 5 20.07 5 21v0M7 10h.01M12 10h.01M17 10h.01" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  {searchTerm
                    ? "No matching tickets found"
                    : "No unassigned tickets available"}
                </p>
                <button
                  onClick={() => {
                    setCurrentPage(0);
                    setSearchTerm("");
                    fetchUnassignedTickets();
                  }}
                  className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 mx-auto text-sm"
                >
                  <FiRefreshCw size={16} />
                  Refresh Tickets
                </button>
              </div>
            ) : (
              <div className="overflow-auto h-full">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Ticket ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Summary
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Priority
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Requestor
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Created At
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {unassignedTickets.map((ticket, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          {ticket.ticket_id}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-800 max-w-xs truncate">
                          {ticket.summary}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${getPriorityBadgeClass(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                          {ticket.created_by}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                          {formatDate(ticket.created_at)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                          <button
                            onClick={() => openAssignmentModal(ticket)}
                            className="text-blue-600 hover:text-blue-900 py-1 px-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors text-xs"
                          >
                            Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Compact Pagination Controls */}
          {totalEntries > 0 && (
            <div className="mt-2 flex justify-start items-center">
              <ReactPaginate
                previousLabel={
                  <span className="flex items-center">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </span>
                }
                nextLabel={
                  <span className="flex items-center">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                }
                breakLabel={"..."}
                pageCount={pageCount}
                marginPagesDisplayed={1}
                pageRangeDisplayed={2}
                onPageChange={handlePageClick}
                forcePage={currentPage}
                containerClassName="flex space-x-1"
                pageClassName="w-6 h-6 flex items-center justify-center rounded text-xs"
                pageLinkClassName="w-full h-full flex items-center justify-center"
                activeClassName="bg-blue-600 text-white"
                activeLinkClassName="font-medium"
                previousClassName="px-1.5 py-1 rounded flex items-center text-xs text-gray-700 hover:bg-gray-100"
                nextClassName="px-1.5 py-1 rounded flex items-center text-xs text-gray-700 hover:bg-gray-100"
                disabledClassName="opacity-50 cursor-not-allowed"
                breakClassName="w-6 h-6 flex items-center justify-center"
              />
            </div>
          )}

          {/* Assignment Modal */}
          {showAssignmentModal && selectedTicket && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                <div className="border-b border-gray-200 p-3 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Assign Ticket #{selectedTicket.ticket_id}
                  </h2>
                  <button
                    onClick={() => setShowAssignmentModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-gray-50 border-b">
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Summary:</span>{" "}
                      {selectedTicket.summary}
                    </p>
                    <p>
                      <span className="font-medium">Issue Type:</span>{" "}
                      {selectedTicket.issue_type}
                    </p>
                    <p>
                      <span className="font-medium">Requested by:</span>{" "}
                      {selectedTicket.created_by} (
                      {selectedTicket.requester_email})
                    </p>
                    <p>
                      <span className="font-medium">Priority:</span>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getPriorityBadgeClass(
                          selectedTicket.priority
                        )}`}
                      >
                        {selectedTicket.priority}
                      </span>
                    </p>
                    {selectedTicket.description && (
                      <div>
                        <p className="font-medium">Description:</p>
                        <div
                          className="text-xs mt-1 p-2 bg-white rounded border border-gray-200 max-h-28 overflow-y-auto"
                          dangerouslySetInnerHTML={{
                            __html: selectedTicket.description,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleAssignTicket} className="p-4 space-y-4">
                  <div>
                    <label
                      htmlFor="assignee"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Assignee <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="assignee"
                      value={assignmentData.assigneeId}
                      onChange={handleAssigneeChange}
                      required
                      className="border border-gray-300 rounded-lg p-2 w-full text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select an assignee</option>
                      {supportStaff.map((staff) => (
                        <option key={staff.id} value={staff.id?.toString()}>
                          {staff.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="supportOrg"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Support Organization
                    </label>
                    <input
                      id="supportOrg"
                      value={getOrganizationName(assignmentData.supportOrgId)}
                      disabled
                      className="border border-gray-300 rounded-lg p-2 w-full bg-gray-50 text-gray-500 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="solutionGroup"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Solution Group <span className="text-red-500">*</span>
                    </label>
                    {solutionGroups.length > 0 ? (
                      <select
                        id="solutionGroup"
                        value={assignmentData.solutionGroupId}
                        onChange={handleSolutionGroupChange}
                        required
                        className="border border-gray-300 rounded-lg p-2 w-full text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a solution group</option>
                        {solutionGroups.map((group, index) => (
                          <option
                            key={index}
                            value={
                              typeof group === "object"
                                ? group.group_name
                                : group
                            }
                          >
                            {typeof group === "object"
                              ? group.group_name
                              : group}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="solutionGroup"
                        value="No solution groups available"
                        disabled
                        className="border border-gray-300 rounded-lg p-2 w-full bg-gray-50 text-gray-500 text-sm"
                      />
                    )}
                  </div>

                  <div className="flex justify-end pt-2 space-x-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowAssignmentModal(false)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      disabled={assignLoading}
                    >
                      {assignLoading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        "Assign Ticket"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
      <ChatbotPopup />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}
