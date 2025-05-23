import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Navigate } from "react-router-dom";
import FieldsetInputField from "../common/FieldsetInputField";
import { enableButton } from "../../store/Slices/buttonSlice";
import { axiosInstance } from "../../utils/axiosInstance";
import { updateInput } from "../../store/actions";
import { toast, ToastContainer } from "react-toastify";
import { useAdminProgress } from "../../context/AdminProgressContext";
import AdminProgressTracker from "../common/AdminProgressTracker";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { adminProgress, startUserSetup, advanceToStep, loadings } = useAdminProgress();

  const formData = useSelector((state) => ({
    username: state.inputs.username || "",
    email: state.inputs.email || "",
  }));

  // Effect to check if there's a user in progress and redirect if needed
  useEffect(() => {
    // Only redirect if a step is in progress (1, 2) but not completed (3)
    if (!loadings && adminProgress.currentUser && adminProgress.currentStep > 1 && adminProgress.currentStep < 3) {
      const currentPath = window.location.pathname;
      // Only redirect if we're on the registration page
      if (currentPath === "/register" || currentPath === "/") {
        console.log("Redirecting from register to proper step:", adminProgress.currentStep);
        if (adminProgress.currentStep === 2) {
          // Role assigned, need to go to employee page
          navigate("/employee");
        } else if (adminProgress.currentStep === 1) {
          // Registration complete, need to go to user-role page
          navigate("/user-role");
        }
      }
    }
  }, [adminProgress, loadings, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    dispatch(updateInput({ name, value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    let missingFields = [];
    const usernameRegex = /^(?!.*__)[a-zA-Z0-9_]{3,}$/;
    if (!formData.username) {
      missingFields.push("username");
    }
    if (!formData.email) {
      missingFields.push("email");
    }
    if (missingFields.length > 0) {
      const message =
        missingFields.length === 1
          ? `${missingFields[0]} cannot be empty`
          : `${missingFields.slice(0, -1).join(", ")} and ${missingFields.at(
              -1
            )} cannot be empty`;

      setError(message);
      setIsLoading(false);
      return;
    }

    if (!usernameRegex.test(formData.username)) {
      setError(
        "Username must be at least 3 characters and can contain only letters, numbers, and one underscore."
      );
      setIsLoading(false);
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      toast.error("Access token is missing. Please login.");
      setIsLoading(false);
      return;
    }

    const registerAPI = process.env.REACT_APP_REGISTER_API;

    try {
      const response = await axiosInstance.post(registerAPI, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (response.status === 201) {
        toast.success("Registration Successful");
        
        // Start the user setup process at step 0 - don't advance or navigate
        startUserSetup(formData.username, formData.email);
        console.log("User setup started at step 0");
        
        // Clear the form inputs
        dispatch(updateInput({ name: "username", value: "" }));
        dispatch(updateInput({ name: "email", value: "" }));
        
        dispatch(enableButton());
      }
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;

        if (errorData) {
          if (errorData.username) {
            setError(errorData.username[0]);
          } else if (errorData.email) {
            setError(errorData.email[0]);
          }
        } else if (error.response.status === 500) {
          setError("Server error. Please try again later.");
        }
      } else if (error.request) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // If a user setup is in progress and past registration, prevent new registration
  if (!loadings && adminProgress.currentUser && adminProgress.currentStep > 1) {
    // Redirect to the appropriate page based on current step
    const redirectPath = adminProgress.currentStep === 2 
      ? "/employee" // Role assigned, go to employee page
      : adminProgress.currentStep === 1 
        ? "/user-role" // Registration done, go to role page
        : "/dashboard"; // Setup complete, go to dashboard
    
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="w-full">
      <header className="text-center pb-6 px-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
          Register To NxDesk
        </h1>
        <p className="text-lg md:text-xl text-blue-900 font-semibold">
          The Ultimate Ticketing Tool for all your issues
        </p>
      </header>

      {/* Show progress tracker when a user setup is in progress at step 1 (just registered) */}
      {!loadings && adminProgress.currentUser && adminProgress.currentStep === 1 && (
        <div className="mt-4 w-full sm:w-10/12 md:w-7/12 lg:w-10/12 xl:w-8/12 mx-auto mb-6">
          <AdminProgressTracker />
        </div>
      )}

      {/* Only show registration form if no user setup is in progress */}
      {(!adminProgress.currentUser || adminProgress.currentStep === 0 || loadings) && (
        <div className="bg-blue-50 p-6 md:p-12 rounded-3xl shadow-2xl w-full sm:w-10/12 md:w-7/12 lg:w-10/12 xl:w-8/12 mb-4 md:mb-6 mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldsetInputField
              id="userName"
              label="User Name"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
            <FieldsetInputField
              id="email"
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />

            <a
              href="/login"
              className="text-gray-600 hover:text-gray-800 underline transition-colors"
            >
              Already registered? Login Here
            </a>

            <div className="text-center">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-2 text-white bg-blue-500 rounded-md transition-colors
                ${
                  isLoading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "hover:bg-blue-600"
                }`}
              >
                {isLoading ? "Registering..." : "Register"}
              </button>
            </div>
            {error && (
              <div
                className="text-red-500 text-center p-2 bg-red-50 rounded-md"
                role="alert"
              >
                {error}
              </div>
            )}
          </form>
        </div>
      )}
      
      <ToastContainer
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  newestOnTop={true}
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
/>
    </div>
  );
};

export default Register;