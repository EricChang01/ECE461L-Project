import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Typography, Box, Button, Collapse } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HardwareSetList from "./HardwareSetList";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      const response = await axios.get(
        "http://localhost:5000/projects/user_projects",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProjects(response.data.projects || []);
      setLoading(false);
    } catch (err) {
      setError("Failed to load projects");
      setLoading(false);
      console.error(err);
    }
  };

  const handleExpandProject = (projectID) => {
    setExpandedProject(expandedProject === projectID ? null : projectID);
  };

  const columns = [
    { field: "name", headerName: "Project name", flex: 1 },
    { field: "projectID", headerName: "Project ID", flex: 1 },
    {
      field: "users",
      headerName: "Users",
      flex: 1,
      valueGetter: (params) => {
        return params.row.users
          .map((user) => user.username || user.email)
          .join(", ");
      },
    },
    { field: "des", headerName: "Description", flex: 1 },
    {
      field: "hardware",
      headerName: "Hardware",
      flex: 1,
      valueGetter: (params) => {
        if (!params.row.hardware || params.row.hardware.length === 0) {
          return "No hardware assigned";
        }
        return params.row.hardware
          .map((hw) => `${hw.hw_name}: ${hw.amount}`)
          .join(", ");
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleExpandProject(params.row.projectID)}
          >
            {expandedProject === params.row.projectID
              ? "Hide Hardware"
              : "Manage Hardware"}
          </Button>
          <Button variant="contained" color="error" sx={{ ml: 1 }}>
            Leave
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) return <Typography>Loading projects...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Container maxWidth="xl">
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
      >
        <Typography variant="h4">Projects</Typography>
        <Box>
          <Button variant="contained" color="primary" sx={{ mr: 2 }}>
            Create Project
          </Button>
          <Button variant="contained" color="secondary">
            Join Project
          </Button>
        </Box>
      </Box>

      <Box sx={{ height: 400, width: "100%" }}>
        {projects.length > 0 ? (
          <>
            <DataGrid
              rows={projects}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              getRowId={(row) => row.projectID}
              disableSelectionOnClick
            />
            {projects.map((project) => (
              <Collapse
                key={project.projectID}
                in={expandedProject === project.projectID}
                timeout="auto"
                unmountOnExit
                sx={{ mt: 2, mb: 2 }}
              >
                <Box sx={{ p: 2, border: "1px solid #ddd", borderRadius: 1 }}>
                  <HardwareSetList projectID={project.projectID} />
                </Box>
              </Collapse>
            ))}
          </>
        ) : (
          <Typography>
            No projects found. Create or join a project to get started.
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default Projects;
