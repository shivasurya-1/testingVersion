import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import { formatDate } from "../../utils/formatDate";
import "react-toastify/dist/ReactToastify.css";
import { ChevronLeft, X, Paperclip, Trash2, Clock } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import ChatbotPopup from "../../components/ChatBot";
import QuillTextEditor from "../CreateIssue/Components/QuillTextEditor";
import { axiosInstance } from "../../utils/axiosInstance";
import ResolutionInfo from "../ResolutionInfo";
import ChatUI from "./ChatUI";
import QuestionToUserModal from "./components/QuestionToUserModal";
import AssignmentModal from "./components/AssignmentModal";
import PriorityModal from "./components/PriorityModal";

export default function ResolveIssue() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const userProfile = useSelector((state) => state.userProfile.user);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editableStatus, setEditableStatus] = useState("");
  const [statusChoices, setStatusChoices] = useState([]);
  const [impactChoices, setImpactChoices] = useState([]);
  const [priorityChoices, setPriorityChoices] = useState([]);
  const [supportTeamChoices, setSupportTeamChoices] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [expandEditor, setExpandEditor] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    assigneeId: "",
    assignee: "",
    supportOrgId: "",
    solutionGroupId: "",
  });
  const [currentTab, setCurrentTab] = useState("Notes");
  const [questionData, setQuestionData] = useState({
    ticket: "",
    comment: "",
    commentHTML: "",
    attachments: [],
  });
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reference to ChatUI component - will be used to access its methods
  const chatUIRef = useRef(null);

  // Refs for content scrolling
  const mainContentRef = useRef(null);
  const tabContentRef = useRef(null);

  // Initialize editable status when ticket data is loaded
  useEffect(() => {
    if (ticket) {
      setEditableStatus(ticket.status || "Open");
    }
  }, [ticket]);

  // Fetch ticket details
  const fetchTicketDetails = async () => {
    try {
      const response = await axiosInstance.get(`ticket/tickets/${ticketId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      console.log("Ticket Details", response);
      setTicket(response.data);
      setAttachments(response.data.attachments || []);
      setQuestionData((prev) => ({
        ...prev,
        ticket: response.data.ticket_id,
      }));

      // Initialize assignment data
      setAssignmentData({
        assigneeId: "",
        assignee: response.data.assignee || "",
        supportOrgId: response.data.developer_organization || "",
        solutionGroupId: response.data.solution_grp || "",
      });
    } catch (error) {
      console.error("Error fetching ticket details:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  // Fetch ticket choices for dropdowns
  useEffect(() => {
    const fetchTicketChoices = async () => {
      try {
        const response = await axiosInstance.get(`ticket/ticket/choices/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        console.log("All choices", response);
        setPriorityChoices(response.data.priority_choices || []);
        setImpactChoices(response.data.impact_choices || []);
        setStatusChoices(response.data.status_choices || []);
        setSupportTeamChoices(response.data.support_team_choices || []);
      } catch (error) {
        console.error("Error fetching ticket choices:", error);
      }
    };

    fetchTicketChoices();
  }, []);

  // Fetch history when History tab is selected
  useEffect(() => {
    if (currentTab === "History" && ticket?.ticket_id) {
      fetchHistory();
    }
  }, [currentTab, ticket?.ticket_id]);

  useEffect(() => {
    if (tabContentRef.current) {
      // Ensure the tab content is visible
      tabContentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentTab]);

  // Fetch history function
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axiosInstance.get(
        `ticket/history/?ticket=${ticket?.ticket_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      setHistory(response.data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Failed to fetch ticket history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Add history entry function
  const addHistoryEntry = async (title, ticketId) => {
    try {
      await axiosInstance.post(
        'ticket/history/',
        {
          title: title,
          ticket: ticketId
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      // Refresh history if History tab is active
      if (currentTab === "History") {
        fetchHistory();
      }
    } catch (error) {
      console.error("Error adding history entry:", error);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleQuestionToUser = () => {
    setIsQuestionModalOpen(true);
  };

  const handleAssignClick = () => {
    setIsAssignmentModalOpen(true);
  };

  const handleChangePriority = () => {
    setIsPriorityModalOpen(true);
  };

  const handleAssignmentSuccess = (updatedTicket) => {
    // Update the ticket state with the new assignment data
    setTicket(updatedTicket);
    setAssignmentData({
      assigneeId: "",
      assignee: updatedTicket.assignee || "",
      supportOrgId: updatedTicket.developer_organization || "",
      solutionGroupId: updatedTicket.solution_grp || "",
    });
    addHistoryEntry(`Ticket assigned to ${updatedTicket.assignee}`, updatedTicket.ticket_id);
  };

  const handlePriorityUpdate = (updatedTicket) => {
    // Update the ticket state with the new priority data
    setTicket(updatedTicket);
    toast.success("Priority updated successfully!");
    
    // Add history entry
    addHistoryEntry(`Priority changed to ${updatedTicket.priority}`, updatedTicket.ticket_id);
  };

  const refetchTicketDetails = () => {
    fetchTicketDetails();
  };

  const updateTicketStatus = (newStatus) => {
    const oldStatus = ticket?.status;
    setTicket((prev) => ({ ...prev, status: newStatus }));
    setEditableStatus(newStatus);

    // Add history entry
    if (oldStatus !== newStatus) {
      addHistoryEntry(`Status changed from ${oldStatus} to ${newStatus}`, ticket?.ticket_id);
    }
  };

  // Helper function to get impact code from label
  const getImpactCode = (impactLabel) => {
    if (!impactLabel || !impactChoices.length) return null;

    const impactItem = impactChoices.find((item) => item[1] === impactLabel);
    return impactItem ? impactItem[0] : null;
  };

  // Helper function to get priority ID from label
  const getPriorityId = (priorityLabel) => {
    if (!priorityLabel || !priorityChoices.length) return null;

    const priorityItem = priorityChoices.find(
      (item) => item.urgency_name === priorityLabel
    );
    return priorityItem ? priorityItem.priority_id : null;
  };

  // Handle Start Work button click
  const handleStartWork = async () => {
    try {
      // Get the correct impact code and priority ID
      const impactCode = getImpactCode(ticket?.impact);
      const priorityId = getPriorityId(ticket?.priority);

      // Make sure we have valid values before sending
      if (!impactCode) {
        console.error("Invalid impact value:", ticket?.impact);
        return;
      }

      if (!priorityId) {
        console.error("Invalid priority value:", ticket?.priority);
        return;
      }

      const response = await axiosInstance.put(
        `ticket/tickets/${ticketId}/`,
        {
          status: "Working in Progress",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      setTicket(response.data);
      setEditableStatus("Working in Progress");
      toast.success("Status updated to Working in Progress!");
      // Add history entry
      addHistoryEntry("Work started on ticket", ticket?.ticket_id);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Function to handle chat updates and add to history
  const handleChatUpdate = (message, messageType = 'comment') => {
    // Add history entry for chat updates
    let historyTitle = '';
    
    switch(messageType) {
      case 'question':
        historyTitle = 'Question sent to user';
        break;
      case 'reply':
        historyTitle = 'Reply added to ticket';
        break;
      case 'note':
        historyTitle = 'Internal note added';
        break;
      default:
        historyTitle = 'Comment added to ticket';
    }
    
    addHistoryEntry(historyTitle, ticket?.ticket_id);
  };

  // Generate tabs array dynamically
  const generateTabs = () => {
    const baseTabs = ["Notes", "RelatedRecords", "History"];
    
    // Case 1: If the ticket status is "Resolved", always include "ResolutionInfo"
    if (ticket?.status === "Resolved") {
      baseTabs.push("ResolutionInfo");
    }
    // Case 2: If the status is NOT "Resolved", only include "ResolutionInfo" if the logged-in user is the assignee
    else if (
      ticket?.assignee?.toLowerCase() === userProfile?.username?.toLowerCase()
    ) {
      baseTabs.push("ResolutionInfo");
    }
    
    return baseTabs;
  };

  const tabs = generateTabs();

  const renderField = (label, value, additionalClasses = "") => {
    const displayValue = value || "N/A";
    const fieldClasses = `bg-gray-50 border  px-2 py-1 w-[50%] cursor-not-allowed outline-none text-sm ${
      !value ? "italic text-gray-400" : ""
    } ${additionalClasses}`;

    return (
      <div className="flex items-center mb-2">
        <label className="w-36 text-gray-600 text-base text-right pr-2">
          {label}
        </label>
        <div className={fieldClasses}>{displayValue}</div>
      </div>
    );
  };

  const renderHistoryContent = () => {
    if (historyLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading history...</div>
        </div>
      );
    }

    if (!history || history.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Clock size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No history entries found for this ticket</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {history.map((entry) => (
          <div key={entry.history_id} className="border-l-2 border-gray-200 pl-4 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {entry.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  by {entry.modified_by || entry.created_by} • {formatDate(entry.modified_at)}
                </div>
              </div>
              <div className="ml-4">
                <Clock size={14} className="text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div
          className={`fixed md:static top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }`}
        >
          <Sidebar />
        </div>
        <div className="flex-1 flex justify-center items-center">
          <div className="text-xl font-semibold">Loading ticket details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <div
        className={`fixed md:static top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 max-h-screen overflow-hidden">
        {/* Sub Header - Compact */}
        <div className="bg-white border-b flex items-center justify-between p-2 shadow-sm">
          <div className="flex items-center">
            <button
              className="p-1 border  mr-2 hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1 text-gray-500">≡</span>
            <div>
              <div className="font-semibold text-base leading-tight">
                {ticket?.summary}
              </div>
              <div className="text-gray-600 text-xs">{ticket?.ticket_id}</div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {ticket.status === "Resolved" ? (
              <button
                type="button"
                className="border  px-4 py-2 text-xs bg-green-50 text-green-700 hover:bg-green-100"
              >
                Resolved
              </button>
            ) : (
              <>
                {ticket?.assignee?.toLowerCase() ===
                  userProfile?.username?.toLowerCase() && (
                  <>
                    {editableStatus !== "Working in Progress" ? (
                      <>
                        <button
                          type="button"
                          className="border  px-4 py-2 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
                          onClick={handleStartWork}
                        >
                          Start Work
                        </button>
                        <button
                          type="button"
                          className="border  px-4 py-2 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
                          onClick={handleAssignClick}
                        >
                          Assign
                        </button>

                        <button
                          type="button"
                          className="border  px-4 py-2 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
                          onClick={handleChangePriority}
                        >
                          Change Priority
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="border  px-4 py-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={handleQuestionToUser}
                        >
                          Question to User
                        </button>
                        <button
                          type="button"
                          className="border  px-4 py-2 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
                          onClick={handleAssignClick}
                        >
                          Assign
                        </button>

                        <button
                          type="button"
                          className="border  px-4 py-2 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100"
                          onClick={handleChangePriority}
                        >
                          Change Priority
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main content area with scrolling */}
        <div className="flex-1 overflow-auto" ref={mainContentRef}>
          {/* Ticket Details Card */}
          <div className="bg-white p-3  shadow-sm m-3">
            {/* Key details in 2 columns for better space utilization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              {/* Column 1 */}
              <div>
                {renderField("Number", ticket?.ticket_id)}
                {renderField("Service Domain", ticket?.service_domain)}
                {renderField("Service Type", ticket?.service_type)}
                {renderField("Requestor", ticket?.created_by)}
                {renderField("Solution Group", ticket?.solution_grp)}
                {renderField("Assignee", ticket?.assignee)}

                {ticket?.contact_mode === "phone" &&
                  renderField("Contact Number", ticket?.customer_number)}
              </div>

              {/* Column 2 */}
              <div>
                {renderField("Status", editableStatus)}
                {renderField("Impact", ticket?.impact)}
                {renderField("Priority", ticket?.priority)}
                {renderField("Project", ticket?.project)}
                {renderField("Product", ticket?.product)}

                {renderField(
                  "Created On",
                  formatDate(ticket?.created_at) || "N/A"
                )}
              </div>
            </div>

            {/* Reference Ticket - if exists */}
            {ticket?.reference_tickets &&
              ticket.reference_tickets.length > 0 && (
                <div className="flex items-center mt-2">
                  <label className="w-36 text-black text-sm font-medium">
                    Reference Ticket
                  </label>
                  <div className="border  px-2 py-1 text-sm bg-gray-50 flex-1">
                    {ticket.reference_tickets.join(", ")}
                  </div>
                </div>
              )}

            {/* Summary and Description - Compact */}
            <div className="mt-3 space-y-2">
              <div className="flex">
                <label className="w-36 text-gray-600 text-base text-right pr-2">
                  Description
                </label>
                <div
                  className="border px-2 py-1 text-sm flex-1 bg-gray-50 max-h-80 overflow-auto"
                  dangerouslySetInnerHTML={{
                    __html: ticket?.description || "No description provided",
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Professional Tab System */}
          <div className="sticky top-0 bg-white z-10 px-3 border-b shadow-sm">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 font-medium relative transition-all duration-200 ${
                    currentTab === tab
                      ? "text-blue-700"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setCurrentTab(tab)}
                >
                  {tab}
                  {currentTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content with reference for scrolling */}
          <div className="p-4 bg-white" ref={tabContentRef}>
            {currentTab === "Notes" && (
              <ChatUI 
                ref={chatUIRef} 
                ticketId={ticket?.ticket_id}
                onChatUpdate={handleChatUpdate}
              />
            )}

            {currentTab === "History" && renderHistoryContent()}
            
            {currentTab === "RelatedRecords" && (
              <div className="p-2">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-lg">Attachments</h3>
                  </div>

                  <div className="border">
                    {/* Attachments Table */}
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border-b p-2 text-left">File</th>
                          <th className="border-b p-2 text-left">
                            Uploaded At
                          </th>
                          <th className="border-b p-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachments && attachments.length > 0 ? (
                          attachments.map((attachment) => {
                            // Extract filename from the file path
                            const fileName = attachment.file.split("/").pop();
                            const fileExtension = fileName
                              .split(".")
                              .pop()
                              ?.toLowerCase();

                            // Define file type categories
                            const imageExtensions = [
                              "jpg",
                              "jpeg",
                              "png",
                              "gif",
                              "bmp",
                              "webp",
                              "svg",
                              "ico",
                            ];
                            const previewableDocuments = [
                              "pdf",
                              "txt",
                              "html",
                              "htm",
                              "json",
                              "xml",
                              "css",
                              "js",
                              "md",
                            ];
                            const nonPreviewableFiles = [
                              "docx",
                              "doc",
                              "xlsx",
                              "xls",
                              "pptx",
                              "ppt",
                              "zip",
                              "rar",
                              "7z",
                              "tar",
                              "gz",
                              "exe",
                              "dmg",
                              "apk",
                              "deb",
                              "rpm",
                            ];

                            // Determine file type
                            const isImage =
                              imageExtensions.includes(fileExtension);
                            const isPreviewableDocument =
                              previewableDocuments.includes(fileExtension);
                            const isNonPreviewable =
                              nonPreviewableFiles.includes(fileExtension);

                            // Construct the correct backend URL
                            const backendUrl =
                              process.env.REACT_APP_API_BASE_URL ||
                              "http://localhost:8000";
                            const fullUrl = `${backendUrl}${attachment.file}`;

                            return (
                              <tr
                                key={attachment.id}
                                className="hover:bg-gray-50"
                              >
                                <td className="border-b p-2">
                                  <div className="flex items-center">
                                    <Paperclip
                                      size={16}
                                      className="mr-2 text-gray-500"
                                    />
                                    <span className="text-gray-700">
                                      {fileName}
                                    </span>
                                  </div>
                                </td>
                                <td className="border-b p-2">
                                  {new Date(
                                    attachment.uploaded_at
                                  ).toLocaleString()}
                                </td>
                                <td className="border-b p-2">
                                  <div className="flex space-x-2">
                                    {/* Images: Only View (no download) */}
                                    {isImage && (
                                      <a
                                        href={fullUrl}
                                        className="text-blue-500 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View
                                      </a>
                                    )}

                                    {/* Previewable Documents: Both View and Download */}
                                    {isPreviewableDocument && (
                                      <>
                                        <a
                                          href={fullUrl}
                                          className="text-blue-500 hover:underline"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          View
                                        </a>
                                        <a
                                          href={fullUrl}
                                          className="text-blue-500 hover:underline"
                                          download={fileName}
                                        >
                                          Download
                                        </a>
                                      </>
                                    )}

                                    {/* Non-previewable Files: Only Download */}
                                    {(isNonPreviewable ||
                                      (!isImage && !isPreviewableDocument)) && (
                                      <a
                                        href={fullUrl}
                                        className="text-blue-500 hover:underline"
                                        download={fileName}
                                      >
                                        Download
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan="3"
                              className="p-4 text-center text-gray-500"
                            >
                              No attachments found for this ticket
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {currentTab === "ResolutionInfo" && (
              <ResolutionInfo ticketDetails={ticket} />
            )}
          </div>
        </div>

        <QuestionToUserModal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          ticketId={ticket?.ticket_id}
          ticketStatus={editableStatus}
          updateTicketStatus={updateTicketStatus}
          refreshChatMessages={() => {
            if (
              chatUIRef.current &&
              typeof chatUIRef.current.fetchMessages === "function"
            ) {
              chatUIRef.current.fetchMessages(ticket.ticket_id);
            }
          }}
          onQuestionSent={() => handleChatUpdate('Question sent to user', 'question')}
        />

        <AssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          ticket={ticket}
          onAssignmentSuccess={handleAssignmentSuccess}
        />

        <PriorityModal
          isOpen={isPriorityModalOpen}
          onClose={() => setIsPriorityModalOpen(false)}
          ticket={ticket}
          refetchTicketDetails={refetchTicketDetails}
          onPriorityUpdate={handlePriorityUpdate}
        />

        {/* Toast Container and Chatbot */}
        <ChatbotPopup />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          style={{ fontSize: "14px" }}
        />
      </div>
    </div>
  );
}