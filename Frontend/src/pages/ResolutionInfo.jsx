import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { axiosInstance } from "../utils/axiosInstance";
import { toast } from "react-toastify";

const ResolutionInfo = ({ ticketDetails, setActivityLog, activityLog }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingResolution, setIsFetchingResolution] = useState(false);
  const userProfile = useSelector((state) => state.userProfile?.username);
  const accessToken = localStorage.getItem("access_token");
  const authHeaders = { headers: { Authorization: `Bearer ${accessToken}` } };

  const [formData, setFormData] = useState({
    resolutionCode: "",
    incidentBasedOn: "",
    incidentCategory: "",
    resolutionNotes: "",
    resolutionSummary: "",
    status: "",
    ticket_id: "",
    resolvedBy: "",
    resolvedDate: "",
  });
  const [resolutionChoices, setResolutionChoices] = useState([]);
  const [incidentChoices, setIncidentChoices] = useState([]);
  const [incidentCategoryChoices, setIncidentCategoryChoices] = useState([]);
  const [resolutionData, setResolutionData] = useState(null);

  useEffect(() => {
    if (ticketDetails) {
      setFormData((prev) => ({
        ...prev,
        ...ticketDetails,
      }));
      
      // If ticket status is Resolved, fetch resolution information
      if (ticketDetails.status === "Resolved") {
        fetchResolutionInfo(ticketDetails.ticket_id);
      }
    }
  }, [ticketDetails]);
  
  const fetchResolutionInfo = async (ticketId) => {
    setIsFetchingResolution(true);
    try {
      const response = await axiosInstance.get(
        `resolution/resolutions/${ticketId}/`,
        authHeaders
      );
      
      if (response.data && response.data.length > 0) {
        const resolutionInfo = response.data[0];
        setResolutionData(resolutionInfo);
        
        // Map the backend data format to our component's format
        setFormData(prev => ({
          ...prev,
          status: "Resolved",
          resolutionCode: resolutionInfo.resolution_type,
          incidentBasedOn: resolutionInfo.incident_based_on,
          incidentCategory: resolutionInfo.incident_category,
          resolutionNotes: resolutionInfo.resolution_description,
          resolutionSummary: resolutionInfo.resolution_summary || "",
          resolvedBy: resolutionInfo.created_by,
          resolvedDate: new Date(resolutionInfo.created_at).toLocaleString(),
        }));
      }
    } catch (error) {
      console.error("Error fetching resolution info:", error);
    } finally {
      setIsFetchingResolution(false);
    }
  };

  useEffect(() => {
    const fetchTicketChoices = async () => {
      try {
        const response = await axiosInstance.get(
          `resolution/resolution-choices/`,
          authHeaders
        );
        console.log("Resolution Choices Data:", response.data);

        setResolutionChoices(response.data.resolution_type_choices);
        setIncidentChoices(response.data.incident_based_on_choices);
        setIncidentCategoryChoices(response.data.incident_category_choices);
      } catch (error) {
        console.error("Error fetching ticket choices:", error);
      }
    };

    fetchTicketChoices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First update the ticket status to Resolved
      await axiosInstance.put(
        `ticket/tickets/${formData.ticket_id}/`,
        {
          status: "Resolved",
        },
        authHeaders
      );

      // Then create the resolution record
      await axiosInstance.post(
        `/resolution/resolutions/`,
        {
          ticket_id: formData.ticket_id,
          status: "Resolved",
          resolution_type: formData.resolutionCode,
          incident_based_on: formData.incidentBasedOn,
          incident_category: formData.incidentCategory,
          resolution_description: formData.resolutionNotes,
          resolution_summary: formData.resolutionSummary,
          resolved_by: userProfile?.id || formData.requestor,
          resolved_date: new Date().toISOString(),
        },
        authHeaders
      );

      // Update local formData with resolved status and information
      setFormData((prev) => ({
        ...prev,
        status: "Resolved",
        resolvedBy: userProfile?.username || prev.requestor,
        resolvedDate: new Date().toLocaleString(),
      }));

      toast.success("Incident resolved successfully");

      window.location.reload();

      // Update activity log if it's provided
      if (setActivityLog && activityLog) {
        setActivityLog([
          {
            user: userProfile?.username || formData.requestor,
            timestamp: new Date().toLocaleString(),
            type: "Resolution",
            changes: [
              { field: "status", value: "Resolved" },
              { field: "Resolution Code", value: formData.resolutionCode },
              { field: "Incident Type", value: formData.incidentBasedOn },
              { field: "Incident Category", value: formData.incidentCategory },
            ],
          },
          ...activityLog,
        ]);
      }
      
      // Refresh resolution info
      fetchResolutionInfo(formData.ticket_id);
      
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingResolution) {
    return (
      <div className="p-4">
        <h3 className="font-medium text-lg mb-4">Resolution Information</h3>
        <div className="flex justify-center">
          <p>Loading resolution information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-medium text-lg mb-4">Resolution Information</h3>

      {formData.status === "Resolved" ? (
        <div className="space-y-4">
          <div className="flex">
            <div className="w-1/3 font-medium text-gray-600">
              Resolution Code:
            </div>
            <div className="w-2/3">
              {resolutionChoices.find(choice => 
                choice[0] === formData.resolutionCode
              )?.[1] || formData.resolutionCode}
            </div>
          </div>
          <div className="flex">
            <div className="w-1/3 font-medium text-gray-600">
              Incident Based On:
            </div>
            <div className="w-2/3">
              {incidentChoices.find(choice => 
                choice[0] === formData.incidentBasedOn
              )?.[1] || formData.incidentBasedOn}
            </div>
          </div>
          <div className="flex">
            <div className="w-1/3 font-medium text-gray-600">
              Incident Category:
            </div>
            <div className="w-2/3">
              {incidentCategoryChoices.find(choice => 
                choice[0] === formData.incidentCategory
              )?.[1] || formData.incidentCategory}
            </div>
          </div>
          <div className="flex">
            <div className="w-1/3 font-medium text-gray-600">
              Resolution Notes:
            </div>
            <div className="w-2/3 whitespace-pre-wrap">
              {formData.resolutionNotes}
            </div>
          </div>
          {/* <div className="flex">
            <div className="w-1/3 font-medium text-gray-600">
              Resolution Summary:
            </div>
            <div className="w-2/3 whitespace-pre-wrap">
              {formData.resolutionSummary}
            </div>
          </div> */}
          <div className="flex">
            <div className="w-1/3 font-medium text-gray-600">Resolved By:</div>
            <div className="w-2/3">{formData.resolvedBy}</div>
          </div>
          <div className="flex">
            <div className="w-1/3 font-medium text-gray-600">
              Resolved Date:
            </div>
            <div className="w-2/3">{formData.resolvedDate}</div>
          </div>
        </div>
      ) : (
        <div>
          <form onSubmit={handleResolve}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Resolution Code:
              </label>
              <select
                name="resolutionCode"
                value={formData.resolutionCode || ""}
                onChange={handleInputChange}
                className="border rounded w-full px-3 py-2"
                required
              >
                <option value="">Select Resolution Code</option>
                {resolutionChoices.map((code) => (
                  <option key={code[0]} value={code[0]}>
                    {code[1]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Incident Based On:
              </label>
              <select
                name="incidentBasedOn"
                value={formData.incidentBasedOn || ""}
                onChange={handleInputChange}
                className="border rounded w-full px-3 py-2"
                required
              >
                <option value="">Select Incident Type</option>
                {incidentChoices.map((incident) => (
                  <option key={incident[0]} value={incident[0]}>
                    {incident[1]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Incident Category:
              </label>
              <select
                name="incidentCategory"
                value={formData.incidentCategory || ""}
                onChange={handleInputChange}
                className="border rounded w-full px-3 py-2"
                required
              >
                <option value="">Select Incident Category</option>
                {incidentCategoryChoices.map((category) => (
                  <option key={category[0]} value={category[0]}>
                    {category[1]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Resolution Notes:
              </label>
              <textarea
                name="resolutionNotes"
                value={formData.resolutionNotes || ""}
                onChange={handleInputChange}
                className="border rounded w-full px-3 py-2 h-24"
                placeholder="Provide detailed notes about the resolution..."
                required
              ></textarea>
            </div>

            {/* <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Resolution Summary:
              </label>
              <textarea
                name="resolutionSummary"
                value={formData.resolutionSummary || ""}
                onChange={handleInputChange}
                className="border rounded w-full px-3 py-2 h-24"
                placeholder="Provide a brief summary of the resolution..."
                required
              ></textarea>
            </div> */}

            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? "Resolving..." : "Resolve Issue"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ResolutionInfo;