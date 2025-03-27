import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateProjectModal from "./CreateProjectModal";
import JoinProjectModal from "./JoinProjectModal";
import "./styles.css";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="projects-container">
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
    </div>
  );
};

export default Projects;
