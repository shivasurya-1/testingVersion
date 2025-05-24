import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Search, Paperclip, Send, X, FileText, Minimize2 } from "lucide-react";
import { axiosInstance } from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import QuillTextEditor from "../CreateIssue/Components/QuillTextEditor";
import RichTextViewer from "../../components/common/RichTextViewer"; // Import the RichTextViewer

const ChatUI = forwardRef(({ onChatUpdate }, ref) => {
  // URL and State Management
  const { ticketId } = useParams();
  const userProfile = useSelector((state) => state.userProfile.user);
  const accessToken = localStorage.getItem("access_token");
  const authHeaders = { headers: { Authorization: `Bearer ${accessToken}` } };

  // Chat UI States
  const [newMessage, setNewMessage] = useState("");
  const [newMessageHTML, setNewMessageHTML] = useState("");
  const [expandEditor, setExpandEditor] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ticketDetails, setTicketDetails] = useState({
    ticketId: "",
    requestor: "",
    summary: "",
    status: "",
  });

  useImperativeHandle(ref, () => ({
    fetchMessages,
  }));

  // Refs
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Load ticket details on component mount
  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails(ticketId);
    }
  }, [ticketId]);

  // Fetch messages when ticket ID changes
  useEffect(() => {
    if (ticketDetails.ticketId) {
      fetchMessages(ticketDetails.ticketId);
    }
  }, [ticketDetails.ticketId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Fetches ticket details from the API
   */
  const fetchTicketDetails = async (id) => {
    try {
      const response = await axiosInstance.get(
        `ticket/tickets/${id}/`,
        authHeaders
      );
      const ticketData = response.data;

      setTicketDetails({
        ticketId: ticketData.ticket_id || id,
        requestor: ticketData.created_by || userProfile?.username,
        email: ticketData.requester_email || userProfile?.email,
        summary: ticketData.summary || "",
        status: ticketData.status || "",
      });
    } catch (error) {
      console.error("Error fetching ticket details:", error);
    }
  };

  /**
   * Fetches message history for the current ticket
   */
  const fetchMessages = async (id) => {
    setLoading(true);
    try {
      if (!id || !accessToken) {
        if (!accessToken) toast.error("Access token missing. Please log in.");
        setLoading(false);
        return;
      }

      const response = await axiosInstance.get(`ticket/reports/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { ticket: id },
      });

      // Transform ticket notes into message format
      const messageData = response.data.map((note) => ({
        id: note.report_id || note.id,
        text: note.content || note.title,
        html: note.content || note.title,
        timestamp: new Date(note.created_at).toLocaleString(),
        isCurrentUser:
          note.username === userProfile?.username ||
          note.username === userProfile?.first_name,
        user: note.username || "System",
        attachments: note.report_attachments
          ? note.report_attachments.map((att) => ({
              id: att.id,
              name: getFileNameFromUrl(att.file_url),
              type: getFileTypeFromUrl(att.file_url),
              url: att.file_url,
              uploaded_at: att.uploaded_at,
            }))
          : [],
      }));

      setMessages(messageData);
    } catch (error) {
      console.error("Error fetching messages:", error);
      // toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extract filename from URL
   */
  const getFileNameFromUrl = (url) => {
    if (!url) return "Unknown file";
    const urlParts = url.split("/");
    const fileNameWithParams = urlParts[urlParts.length - 1];
    return fileNameWithParams.split("?")[0];
  };

  /**
   * Determine file type from URL or filename
   */
  const getFileTypeFromUrl = (url) => {
    if (!url) return "application/octet-stream";

    const fileName = getFileNameFromUrl(url).toLowerCase();

    if (fileName.match(/\.(jpeg|jpg|png|gif|bmp|webp)$/))
      return "image/" + fileName.split(".").pop();
    if (fileName.match(/\.(pdf)$/)) return "application/pdf";
    if (fileName.match(/\.(doc|docx)$/)) return "application/msword";
    if (fileName.match(/\.(xls|xlsx)$/)) return "application/vnd.ms-excel";
    if (fileName.match(/\.(ppt|pptx)$/)) return "application/vnd.ms-powerpoint";
    if (fileName.match(/\.(zip|rar|7z)$/)) return "application/zip";
    if (fileName.match(/\.(txt)$/)) return "text/plain";

    return "application/octet-stream";
  };

  /**
   * Extracts and processes embedded images from Quill content
   */
  const processEmbeddedImages = async (htmlContent) => {
    if (!htmlContent || !htmlContent.includes("<img")) {
      return { images: [], updatedHtml: htmlContent };
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    const imgElements = tempDiv.querySelectorAll("img");
    if (imgElements.length === 0)
      return { images: [], updatedHtml: htmlContent };

    const extractedImages = [];

    for (let i = 0; i < imgElements.length; i++) {
      const img = imgElements[i];
      const imgSrc = img.getAttribute("src");

      if (!imgSrc) continue;

      if (imgSrc.startsWith("data:")) {
        try {
          const response = await fetch(imgSrc);
          const blob = await response.blob();

          const imgType = blob.type.split("/")[1] || "png";
          const fileName = `embedded-image-${Date.now()}-${i}.${imgType}`;

          const file = new File([blob], fileName, { type: blob.type });

          extractedImages.push({
            id: `embedded-${Date.now()}-${i}`,
            name: fileName,
            type: blob.type,
            size: blob.size,
            file: file,
            previewUrl: imgSrc,
            isLocal: true,
          });

          // Keep the src but add data attributes for reference
          img.setAttribute("data-embedded-index", i);
          img.setAttribute("data-original-src", imgSrc);
        } catch (error) {
          console.error("Error processing embedded image:", error);
        }
      }
    }

    return {
      images: extractedImages,
      updatedHtml: tempDiv.innerHTML,
    };
  };

  /**
   * Send message with or without attachments
   */
  const sendMessage = async () => {
    const messageIsEmpty = isEmptyContent(newMessageHTML);
    const hasAttachments = attachments.length > 0;

    // Skip if no content and no attachments
    if (messageIsEmpty && !hasAttachments) return;

    try {
      if (!accessToken) {
        toast.error("Access token missing. Please log in.");
        return;
      }

      if (!ticketDetails.ticketId) {
        toast.error("Ticket ID is required");
        return;
      }

      // Process message content including any embedded images
      let messagesToSend = [];
      let processedAttachments = [...attachments];
      let messageContent = newMessage;
      let messageHtml = newMessageHTML;

      // Handle embedded images in rich text
      if (!messageIsEmpty && newMessageHTML.includes("<img")) {
        const { images, updatedHtml } = await processEmbeddedImages(
          newMessageHTML
        );
        processedAttachments = [...processedAttachments, ...images];
        messageHtml = updatedHtml;
      }

      // Create optimistic UI update
      const tempMessageId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempMessageId,
        text: messageContent,
        html: messageHtml,
        timestamp: new Date().toLocaleString(),
        isCurrentUser: true,
        user: userProfile?.username || "You",
        attachments: processedAttachments.map((att) => ({
          ...att,
          // For local attachments, use the preview URL temporarily
          url: att.isLocal ? att.previewUrl : att.url,
        })),
        pending: true,
      };

      // Add message to UI immediately for responsive feeling
      setMessages((prev) => [...prev, tempMessage]);

      // Clear input fields and attachments early for better UX
      setNewMessage("");
      setNewMessageHTML("");
      setAttachments([]);

      // Upload files and message
      if (hasAttachments) {
        // Case: Has attachments (with or without message)
        await sendAttachmentsWithMessage(
          processedAttachments,
          messageContent,
          messageHtml,
          ticketDetails.ticketId
        );
      } else {
        // Case: Message only, no attachments
        await sendTextMessage(
          messageContent,
          messageHtml,
          ticketDetails.ticketId
        );
      }

      // Refresh messages to get server-assigned IDs and proper statuses
      fetchMessages(ticketDetails.ticketId);
      if (typeof onChatUpdate === "function") {
        onChatUpdate("Comment added to ticket", "comment");
      }
    } catch (error) {
      console.error(
        "Error sending message:",
        error.response?.data || error.message
      );

      // Remove optimistic update on failure
      setMessages((prev) => prev.filter((msg) => !msg.pending));

      toast.error(
        "Failed to send message: " +
          (error.response?.data?.detail || "Please check ticket ID")
      );

      // Return attachments to the UI if sending failed
      if (attachments.length === 0) {
        setAttachments(attachments);
      }
    }
  };

  /**
   * Send text-only message
   */
  const sendTextMessage = async (text, html, ticketId) => {
    return axiosInstance.post(
      "ticket/reports/",
      {
        title: html,
        ticket: ticketId,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  };

  /**
   * Send message with attachments
   */
  const sendAttachmentsWithMessage = async (files, text, html, ticketId) => {
    let isContentSent = false;

    // Process each attachment
    for (const attachment of files) {
      if (attachment.isLocal) {
        const formData = new FormData();
        formData.append("attachments", attachment.file);
        formData.append("ticket", ticketId);

        // Add message content with first attachment only
        if (!isContentSent && !isEmptyContent(html)) {
          formData.append("title", html);
          isContentSent = true;
        } else {
          // For subsequent attachments or if no message
          formData.append(
            "title",
            attachment.name.startsWith("embedded-image")
              ? "Embedded Image"
              : "Attachment"
          );
        }

        await axiosInstance.post("ticket/reports/", formData, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }
    }

    // If we have a message but didn't send it with attachments, send it separately
    if (!isContentSent && !isEmptyContent(html)) {
      await sendTextMessage(text, html, ticketId);
    }

    // Clean up object URLs
    files.forEach((att) => {
      if (att.previewUrl && att.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(att.previewUrl);
      }
    });
  };

  /**
   * Handle file attachment button click
   */
  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  /**
   * Process selected files
   */
  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        file: file,
        previewUrl: URL.createObjectURL(file),
        isLocal: true,
      }));

      setAttachments((prev) => [...prev, ...newFiles]);
      toast.success(
        `${newFiles.length} file${newFiles.length > 1 ? "s" : ""} added`
      );
    }

    // Reset input value to allow selecting the same file again
    e.target.value = "";
  };

  /**
   * Remove attachment from list
   */
  const removeAttachment = (id) => {
    setAttachments((prev) =>
      prev.filter((att) => {
        if (att.id === id) {
          // Clean up preview URL
          if (att.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(att.previewUrl);
          }
          return false;
        }
        return true;
      })
    );
  };

  /**
   * Handle message input via keyboard
   */
  const handleKeyPress = (e) => {
    // Send message on Enter (but not with Shift+Enter for newlines)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * Handle Quill rich text editor changes
   */
  const handleQuillChange = (event) => {
    // Check if the event has HTML content
    if (event?.target?.value !== undefined) {
      const htmlValue = event.target.value;
      setNewMessageHTML(htmlValue);

      // Extract plain text from HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlValue;
      setNewMessage(tempDiv.textContent || tempDiv.innerText || "");
    }
  };

  /**
   * Toggle rich text editor expansion
   */
  const toggleExpandEditor = () => {
    setExpandEditor(!expandEditor);
  };

  /**
   * Check if content is empty
   */
  const isEmptyContent = (value) => {
    if (typeof value !== "string") return true;

    // Check for empty strings and Quill's empty paragraph
    return (
      !value || value === "" || value === "<p><br></p>" || value === "<p></p>"
    );
  };

  /**
   * Render file preview based on type
   */
  const renderFilePreview = (file) => {
    if (file.type?.startsWith("image/")) {
      return (
        <div className="relative group">
          <img
            src={file.previewUrl || file.url}
            alt={file.name}
            className="max-h-32 max-w-full rounded border border-gray-200"
          />
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
              onClick={() => window.open(file.previewUrl || file.url, "_blank")}
            >
              <Search size={14} />
            </button>
          </div>
        </div>
      );
    } else if (file.type === "application/pdf") {
      return (
        <div className="flex items-center bg-gray-100 p-2 rounded">
          <FileText size={24} className="text-red-500 mr-2" />
          <div className="flex-1 truncate text-sm">{file.name}</div>
          <a
            href={file.previewUrl || file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-500 hover:underline text-sm"
          >
            View PDF
          </a>
        </div>
      );
    } else {
      return (
        <div className="flex items-center bg-gray-100 p-2 rounded">
          <Paperclip size={18} className="text-gray-500 mr-2" />
          <div className="flex-1 truncate text-sm">{file.name}</div>
          {(file.previewUrl || file.url) && (
            <a
              href={file.previewUrl || file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-500 hover:underline text-sm"
              download={file.name}
            >
              Download
            </a>
          )}
        </div>
      );
    }
  };

  const renderMessageContent = (message) => {
    if (!message.html && !message.text) return null;

    // Check if the message appears to be an embedded image placeholder
    if (message.html && message.html.includes("[embedded-image")) {
      return <div className="text-sm italic text-gray-500">Embedded image</div>;
    }

    try {
      // Process the HTML to ensure images are displayed correctly
      if (message.html) {
        // Check if it's actual HTML content with proper structure
        if (message.html.includes("<") && message.html.includes(">")) {
          return (
            <RichTextViewer
              content={message.html}
              className="text-sm message-content"
            />
          );
        }
      }

      // Fallback to plain text with line breaks preserved
      return (
        <div className="text-sm whitespace-pre-wrap">
          {message.text || message.html}
        </div>
      );
    } catch (error) {
      console.error("Error rendering message content:", error);
      return (
        <div className="text-sm whitespace-pre-wrap">
          {message.text || "Error displaying message"}
        </div>
      );
    }
  };

  // Helper function to get user role/type based on username
  const getUserRole = (username) => {
    if (username === userProfile?.username) return "You";
    if (username === ticketDetails.requestor) return "Requestor";
    if (username?.toLowerCase().includes("admin")) return "Admin";
    if (username?.toLowerCase().includes("dev")) return "Developer";
    if (username?.toLowerCase().includes("lead")) return "Team Lead";
    return "Team Member";
  };

  // Helper function to get role-based avatar color
  const getRoleColor = (username) => {
    const role = getUserRole(username);
    switch (role) {
      case "You":
        return "bg-blue-600";
      case "Requestor":
        return "bg-green-600";
      case "Admin":
        return "bg-red-600";
      case "Developer":
        return "bg-purple-600";
      case "Team Lead":
        return "bg-orange-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="bg-white px-4 pb-4 border-b shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg text-gray-800">
                Activity & Comments
              </h2>
            </div>
            <div className="flex space-x-2">
              <button
                className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm transition-colors"
                onClick={() => fetchMessages(ticketDetails.ticketId)}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Messages area - Professional threaded layout */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div className="mt-3 text-gray-600 text-sm">
                Loading activity...
              </div>
            </div>
          ) : messages.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  {/* Message Header */}
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full ${getRoleColor(
                        msg.user
                      )} flex items-center justify-center text-white font-medium text-sm shrink-0`}
                    >
                      {msg.user?.charAt(0)?.toUpperCase() || "?"}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* User info and timestamp */}
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-medium text-gray-900">
                          {msg.user}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {getUserRole(msg.user)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp}
                        </span>
                        {msg.pending && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Sending...
                          </span>
                        )}
                      </div>

                      {/* Message content */}
                      <div className="prose prose-sm max-w-none text-gray-800">
                        {renderMessageContent(msg)}
                      </div>

                      {/* Attachments */}
                      {msg.attachments?.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attachments ({msg.attachments.length})
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {msg.attachments.map((file, fileIdx) => (
                              <div
                                key={fileIdx}
                                className="border border-gray-200 rounded-lg overflow-hidden"
                              >
                                {file.type?.startsWith("image/") ? (
                                  <div className="bg-gray-50 p-3">
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="max-h-64 max-w-full rounded border border-gray-200"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src =
                                          "https://via.placeholder.com/150?text=Image+Not+Available";
                                      }}
                                    />
                                    <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
                                      <span className="truncate font-medium">
                                        {file.name}
                                      </span>
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                        download
                                      >
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                ) : file.type === "application/pdf" ? (
                                  <div className="flex items-center p-3 bg-red-50">
                                    <FileText
                                      size={20}
                                      className="text-red-600 mr-3 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-gray-900 truncate">
                                        {file.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        PDF Document
                                      </div>
                                    </div>
                                    <div className="flex space-x-2 ml-3">
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                      >
                                        View
                                      </a>
                                      <a
                                        href={file.url}
                                        download={file.name}
                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                      >
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center p-3 bg-gray-50">
                                    <Paperclip
                                      size={18}
                                      className="text-gray-600 mr-3 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-gray-900 truncate">
                                        {file.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        File Attachment
                                      </div>
                                    </div>
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-3 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                      download={file.name}
                                    >
                                      Download
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef}></div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-gray-400 text-lg mb-2">No activity yet</div>
              <div className="text-sm text-gray-500">
                Be the first to add a comment or update to this ticket
              </div>
            </div>
          )}
        </div>

        {/* Attachment preview area */}
        {attachments.length > 0 && (
          <div className="bg-white border-t p-4">
            <div className="text-sm font-medium mb-3 text-gray-700">
              Ready to send: {attachments.length}{" "}
              {attachments.length === 1 ? "attachment" : "attachments"}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="relative group border border-gray-200 rounded-lg p-2"
                >
                  {renderFilePreview(file)}
                  <button
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-sm"
                    onClick={() => removeAttachment(file.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message input */}
        <div className="bg-white border-t p-4">
          <div className="flex items-start space-x-3">
            {/* Current user avatar */}
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm shrink-0">
              {userProfile?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>

            {/* Input area */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <button
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={handleFileAttachment}
                  title="Attach files"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
              </div>

              <div className="relative">
                {!expandEditor ? (
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      setNewMessageHTML(e.target.value);
                    }}
                    onFocus={() => setExpandEditor(true)}
                    onKeyPress={handleKeyPress}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="relative  overflow-hidden">
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={toggleExpandEditor}
                        className="p-1 hover:bg-gray-100 rounded-full"
                        title="Toggle editor size"
                      >
                        <Minimize2 size={16} />
                      </button>
                    </div>
                    <QuillTextEditor
                      name="message"
                      value={newMessageHTML}
                      onChange={handleQuillChange}
                      className="bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center mt-2">
                <button
                  className={`${
                    isEmptyContent(newMessageHTML) && attachments.length === 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2`}
                  onClick={sendMessage}
                  disabled={
                    isEmptyContent(newMessageHTML) && attachments.length === 0
                  }
                >
                  <span>Comment</span>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatUI;
