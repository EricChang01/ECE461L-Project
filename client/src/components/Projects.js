import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateProjectModal from "./CreateProjectModal";
import JoinProjectModal from "./JoinProjectModal";
import ConfirmationModal from "./ConfirmationModal";
import "./styles.css";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  // New state for confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "warning",
    projectID: null,
    projectName: "",
  });
  // New state for result modal
  const [resultModal, setResultModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const navigate = useNavigate();

  // Add logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/my-login");
  };

  // Fetch user's projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/my-login");
          return;
        }

        const response = await fetch(
          "http://127.0.0.1:5000/projects/user_projects",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/my-login");
          return;
        }

        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [navigate]);

  const handleProjectCreated = (newProject) => {
    setProjects([...projects, newProject]);
    setShowCreateModal(false);
  };

  const handleProjectJoined = () => {
    // Refresh the projects list after joining
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "http://127.0.0.1:5000/projects/user_projects",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error("Error refreshing projects:", error);
      }
    };

    fetchProjects();
    setShowJoinModal(false);
  };

  const handleLeaveProject = (projectID, projectName) => {
    // Get current number of users in the project
    const project = projects.find((p) => p.projectID === projectID);
    const userCount = project?.users?.length || 0;

    // If last user, confirm deletion with different message
    if (userCount <= 1) {
      setConfirmModal({
        isOpen: true,
        title: "Delete Project",
        message: `You are the last member of "${projectName}". If you leave, the project will be permanently deleted. Continue?`,
        confirmText: "Leave & Delete",
        cancelText: "Cancel",
        type: "error",
        projectID,
        projectName,
        onConfirm: () =>
          confirmLeaveProject(projectID, projectName, userCount <= 1),
      });
    } else {
      // Regular leave confirmation
      setConfirmModal({
        isOpen: true,
        title: "Leave Project",
        message: `Are you sure you want to leave the project "${projectName}"?`,
        confirmText: "Leave Project",
        cancelText: "Cancel",
        type: "warning",
        projectID,
        projectName,
        onConfirm: () =>
          confirmLeaveProject(projectID, projectName, userCount <= 1),
      });
    }
  };

  // New function to handle the actual leaving after confirmation
  const confirmLeaveProject = async (projectID, projectName, isLastUser) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:5000/projects/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectID: projectID,
        }),
      });

      if (response.ok) {
        // Remove the project from the local state
        setProjects(
          projects.filter((project) => project.projectID !== projectID)
        );

        // Close the confirmation modal
        setConfirmModal({ ...confirmModal, isOpen: false });

        // Show appropriate result message
        if (isLastUser) {
          setResultModal({
            isOpen: true,
            title: "Project Deleted",
            message: `You've left "${projectName}" and the project has been permanently deleted.`,
            confirmText: "OK",
            type: "info",
          });
        } else {
          setResultModal({
            isOpen: true,
            title: "Left Project",
            message: `You've successfully left the project "${projectName}".`,
            confirmText: "OK",
            type: "success",
          });
        }
      } else {
        const data = await response.json();
        // Close the confirmation modal
        setConfirmModal({ ...confirmModal, isOpen: false });

        // Show error message
        setResultModal({
          isOpen: true,
          title: "Error",
          message: data.message || "Failed to leave project",
          confirmText: "OK",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error leaving project:", error);
      // Close the confirmation modal
      setConfirmModal({ ...confirmModal, isOpen: false });

      // Show error message
      setResultModal({
        isOpen: true,
        title: "Error",
        message: "An error occurred while trying to leave the project",
        confirmText: "OK",
        type: "error",
      });
    }
  };

  // Function to close the result modal
  const closeResultModal = () => {
    setResultModal({ ...resultModal, isOpen: false });
  };

  return (
    <div className="projects-container">
      {/* Add logout button */}
      <div className="logout-container">
        <button className="logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      <div className="projects-header">
        <h1>Projects</h1>
        <div className="project-actions">
          <button
            className="action-button create-button"
            onClick={() => setShowCreateModal(true)}
          >
            Create Project
          </button>
          <button
            className="action-button join-button"
            onClick={() => setShowJoinModal(true)}
          >
            Join Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="no-projects-container">
          <p>No projects found. Create or join a project to get started.</p>
        </div>
      ) : (
        <div className="projects-table-container">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project name</th>
                <th className="center-align">Project ID</th>
                <th>Users</th>
                <th>Description</th>
                <th>Hardware</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.projectID} className="project-row">
                  <td className="project-name">{project.name}</td>
                  <td className="project-id center-align">
                    {project.projectID}
                  </td>
                  <td className="project-users">
                    {project.users
                      .map((user) => user.username || user.email)
                      .join(", ")}
                  </td>
                  <td className="project-description">{project.des}</td>
                  <td className="project-hardware">
                    {project.hardware && project.hardware.length > 0 ? (
                      <ul className="hardware-list">
                        {project.hardware.map((hw, idx) => (
                          <li key={idx}>
                            {hw.hw_name}: {hw.amount}/100
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>No hardware assigned</span>
                    )}
                  </td>
                  <td className="project-actions">
                    <button
                      className="leave-button"
                      onClick={() =>
                        handleLeaveProject(project.projectID, project.name)
                      }
                    >
                      Leave
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}

      {showJoinModal && (
        <JoinProjectModal
          onClose={() => setShowJoinModal(false)}
          onProjectJoined={handleProjectJoined}
        />
      )}

      {/* Add the confirmation modals */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type={confirmModal.type}
      />

      <ConfirmationModal
        isOpen={resultModal.isOpen}
        title={resultModal.title}
        message={resultModal.message}
        confirmText={resultModal.confirmText}
        onConfirm={closeResultModal}
        onCancel={closeResultModal}
        type={resultModal.type}
      />
    </div>
  );
};

export default Projects;
