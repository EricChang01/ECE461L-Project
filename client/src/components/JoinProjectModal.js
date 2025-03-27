import React, { useState } from "react";
import "./styles.css";

const JoinProjectModal = ({ onClose, onProjectJoined }) => {
  const [projectID, setProjectID] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingID, setValidatingID] = useState(false);

  // Add a function to check if project ID exists
  const checkProjectIDExists = async (id) => {
    if (!id) return false;

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
      setValidatingID(false);
      return data.exists;
    } catch (error) {
      console.error("Error checking project ID:", error);
      setValidatingID(false);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // First check if the project exists
      const checkResponse = await fetch(
        `http://127.0.0.1:5000/projects/check_id_exists?id=${projectID}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const checkData = await checkResponse.json();

      if (!checkData.exists) {
        setError(
          "Project ID does not exist. Please check the ID and try again."
        );
        setLoading(false);
        return;
      }

      // If project exists, try to join it
      const joinResponse = await fetch("http://127.0.0.1:5000/projects/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectID: projectID, // Keep as string
        }),
      });

      const joinData = await joinResponse.json();

      if (joinResponse.ok) {
        onProjectJoined();
      } else {
        setError(joinData.message || "Failed to join project");
      }
    } catch (error) {
      console.error("Error joining project:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Join Existing Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project ID</label>
            <input
              type="text" // Changed from "number" to "text" to preserve leading zeros
              value={projectID}
              onChange={(e) => setProjectID(e.target.value)}
              required
              placeholder="Enter project ID"
            />
            {validatingID && (
              <small className="validating-message">
                Verifying project ID...
              </small>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={loading || validatingID}>
              {loading ? "Joining..." : "Join Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinProjectModal;
