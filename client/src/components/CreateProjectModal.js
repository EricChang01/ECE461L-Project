import React, { useState } from "react";
import "./styles.css";

const CreateProjectModal = ({ onClose, onProjectCreated }) => {
  const [name, setName] = useState("");
  const [des, setDes] = useState("");
  const [projectID, setProjectID] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingID, setValidatingID] = useState(false);

  // Add a debounce function to avoid too many checks
  const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  // Function to check if project ID exists
  const checkProjectIDExists = async (id) => {
    if (!id) return;

    setValidatingID(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://127.0.0.1:5000/projects/check_id_exists?id=${id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.exists) {
        setError("Project ID already exists. Please choose another ID.");
      } else {
        setError(""); // Clear any previous error
      }
    } catch (error) {
      console.error("Error checking project ID:", error);
    } finally {
      setValidatingID(false);
    }
  };

  // Debounced version of the check function
  const debouncedCheckID = debounce(checkProjectIDExists, 500);

  // Handle project ID change with validation
  const handleProjectIDChange = (e) => {
    const value = e.target.value;
    setProjectID(value);
    if (value) {
      debouncedCheckID(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation before submission
    if (error) {
      return; // Don't proceed if there's an error
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          des,
          projectID: projectID,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Get the user's email from the JWT token
        const tokenPayload = JSON.parse(atob(token.split(".")[1]));
        const userEmail = tokenPayload.sub;

        // Get the username from localStorage or use email as fallback
        const username = localStorage.getItem("username") || userEmail;

        const newProject = {
          name,
          des,
          projectID: projectID,
          users: [{ email: userEmail, username: username }],
          hardware: [],
        };

        onProjectCreated(newProject);
      } else {
        setError(data.message || "Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter project name"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={des}
              onChange={(e) => setDes(e.target.value)}
              required
              placeholder="Enter project description"
            />
          </div>

          <div className="form-group">
            <label>Project ID</label>
            <input
              type="text"
              value={projectID}
              onChange={handleProjectIDChange}
              required
              placeholder="Enter project ID number"
            />
            {validatingID && (
              <small className="validating-message">
                Checking ID availability...
              </small>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || validatingID || error !== ""}
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
