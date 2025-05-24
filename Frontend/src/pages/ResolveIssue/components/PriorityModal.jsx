import { useState, useEffect } from "react";
import { X, AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { axiosInstance } from "../../../utils/axiosInstance";
import { toast } from "react-toastify";

const PriorityModal = ({ 
  isOpen, 
  onClose, 
  ticket, 
  priorityChoices = [], 
  onPriorityUpdate 
}) => {
  const [selectedPriority, setSelectedPriority] = useState("");
  const [currentPriority, setCurrentPriority] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justification, setJustification] = useState("");


  console.log("PriorityModal Choices:", priorityChoices)
  // Initialize current priority when modal opens
  useEffect(() => {
    if (isOpen && ticket) {
      const currentPriorityObj = priorityChoices.find(
        (p) => p.urgency_name === ticket.priority
      );
      setCurrentPriority(ticket.priority || "");
      setSelectedPriority(currentPriorityObj?.priority_id || "");
      setJustification("");
    }
  }, [isOpen, ticket, priorityChoices]);

  // Get priority icon based on priority level
  const getPriorityIcon = (priorityName) => {
    const name = priorityName?.toLowerCase();
    if (name?.includes("critical") || name?.includes("urgent")) {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    } else if (name?.includes("high")) {
      return <ArrowUp className="w-4 h-4 text-orange-500" />;
    } else if (name?.includes("medium") || name?.includes("normal")) {
      return <Minus className="w-4 h-4 text-yellow-500" />;
    } else if (name?.includes("low")) {
      return <ArrowDown className="w-4 h-4 text-green-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  // Get priority color class
  const getPriorityColorClass = (priorityName) => {
    const name = priorityName?.toLowerCase();
    if (name?.includes("critical") || name?.includes("urgent")) {
      return "text-red-600 bg-red-50 border-red-200";
    } else if (name?.includes("high")) {
      return "text-orange-600 bg-orange-50 border-orange-200";
    } else if (name?.includes("medium") || name?.includes("normal")) {
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    } else if (name?.includes("low")) {
      return "text-green-600 bg-green-50 border-green-200";
    }
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPriority) {
      toast.error("Please select a priority level");
      return;
    }

    const selectedPriorityObj = priorityChoices.find(
      (p) => p.priority_id === selectedPriority
    );

    // Check if priority is actually changing
    if (selectedPriorityObj?.urgency_name === currentPriority) {
      toast.info("Priority is already set to this level");
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        priority: selectedPriorityObj.urgency_name,
        priority_id: selectedPriority,
      };

      // Add justification if provided
      if (justification.trim()) {
        updateData.priority_justification = justification.trim();
      }

      const response = await axiosInstance.put(
        `ticket/tickets/${ticket.ticket_id}/`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      // Call the parent callback to update the ticket
      if (onPriorityUpdate) {
        onPriorityUpdate(response.data);
      }

      toast.success(
        `Priority updated to ${selectedPriorityObj.urgency_name} successfully!`
      );
      onClose();
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error(
        error.response?.data?.message || "Failed to update priority"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedPriority("");
    setJustification("");
    onClose();
  };

  if (!isOpen) return null;

  const selectedPriorityObj = priorityChoices.find(
    (p) => p.priority_id === selectedPriority
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Change Priority
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Ticket Info */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="text-sm text-gray-600 mb-1">Ticket</div>
            <div className="font-medium text-gray-900">{ticket?.ticket_id}</div>
            <div className="text-sm text-gray-700 mt-1 line-clamp-2">
              {ticket?.summary}
            </div>
          </div>

          {/* Current Priority */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Current Priority
            </label>
            <div
              className={`flex items-center space-x-2 px-3 py-2 rounded-md border ${getPriorityColorClass(
                currentPriority
              )}`}
            >
              {getPriorityIcon(currentPriority)}
              <span className="font-medium">
                {currentPriority || "Not Set"}
              </span>
            </div>
          </div>

          {/* New Priority Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              New Priority <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {priorityChoices.map((priority) => (
                <label
                  key={priority.priority_id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${
                    selectedPriority === priority.priority_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={priority.priority_id}
                    checked={selectedPriority === priority.priority_id}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    {getPriorityIcon(priority.urgency_name)}
                    <span className="font-medium text-gray-900">
                      {priority.urgency_name}
                    </span>
                  </div>
                  {priority.urgency_name === currentPriority && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Justification (Optional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Justification
              <span className="text-xs text-gray-500 font-normal ml-1">
                (Optional)
              </span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide a reason for changing the priority..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="3"
              maxLength="500"
            />
            <div className="text-xs text-gray-500 text-right">
              {justification.length}/500
            </div>
          </div>

          {/* Priority Change Summary */}
          {selectedPriorityObj && selectedPriorityObj.urgency_name !== currentPriority && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-1">
                Priority Change Summary
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  {getPriorityIcon(currentPriority)}
                  <span className="text-gray-700">
                    {currentPriority || "Not Set"}
                  </span>
                </div>
                <span className="text-gray-500">→</span>
                <div className="flex items-center space-x-1">
                  {getPriorityIcon(selectedPriorityObj.urgency_name)}
                  <span className="text-blue-700 font-medium">
                    {selectedPriorityObj.urgency_name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPriority}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Priority</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriorityModal;