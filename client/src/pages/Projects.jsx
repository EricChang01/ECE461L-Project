import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import HardwareSetList from "../components/HardwareSetList";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [hardwareSets, setHardwareSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState({
    projectID: "",
    type: "",
    hardware: null,
  });
  const [amount, setAmount] = useState(1);
  const [operationResult, setOperationResult] = useState(null);

  useEffect(() => {
    console.log("Projects component mounted");
    fetchProjects();
    fetchHardwareSets();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Fetching projects with token:", token);

      const response = await axios.get(
        "http://localhost:5000/projects/user_projects",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Projects response:", response.data);
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchHardwareSets = async () => {
    try {
      console.log("Fetching hardware sets...");

      // Get the JWT token from localStorage
      const token = localStorage.getItem("token");

      // Make the request with the Authorization header
      const response = await axios.get("http://localhost:5000/resources/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Hardware sets data:", response.data);
      setHardwareSets(response.data || []);
    } catch (error) {
      console.error("Error fetching hardware sets:", error);
    }
  };

  const handleExpandProject = (projectID) => {
    setExpandedProject(expandedProject === projectID ? null : projectID);
  };

  const handleOpenDialog = (projectID, type, hardware) => {
    setCurrentOperation({
      projectID,
      type,
      hardware,
    });
    setAmount(1);
    setDialogOpen(true);
    setOperationResult(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleAmountChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0) {
      setAmount(value);
    }
  };

  const performOperation = async () => {
    try {
      const token = localStorage.getItem("token");
      const { projectID, type, hardware } = currentOperation;

      const response = await axios.post(
        `http://localhost:5000/resources/${type}`,
        {
          projectID: projectID,
          hardware_set: hardware.name,
          amount: amount,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOperationResult({
        success: true,
        message: response.data.message,
      });

      // Refresh data
      fetchHardwareSets();
      fetchProjects();
    } catch (error) {
      setOperationResult({
        success: false,
        message: error.response?.data?.message || "Operation failed",
      });
      console.error("Operation error:", error);
    }
  };

  return (
    <div className="projects-container">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Project name</TableCell>
              <TableCell>Project ID</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Hardware</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map((project) => (
              <React.Fragment key={project.projectID}>
                <TableRow>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.projectID}</TableCell>
                  <TableCell>
                    {project.users
                      ?.map((user) => user.username || user.email)
                      .join(", ")}
                  </TableCell>
                  <TableCell>{project.des}</TableCell>
                  <TableCell>
                    {project.hardware && project.hardware.length > 0
                      ? project.hardware
                          .map((h) => `${h.hw_name}: ${h.amount}`)
                          .join(", ")
                      : "No hardware assigned"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleExpandProject(project.projectID)}
                      sx={{ mr: 1 }}
                    >
                      {expandedProject === project.projectID
                        ? "Hide Hardware"
                        : "Manage Hardware"}
                    </Button>
                    <Button variant="contained" color="error">
                      Leave
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    style={{ paddingBottom: 0, paddingTop: 0 }}
                    colSpan={6}
                  >
                    <Collapse
                      in={expandedProject === project.projectID}
                      timeout="auto"
                      unmountOnExit
                    >
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="h6" gutterBottom component="div">
                          Hardware Management
                        </Typography>
                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Hardware Set</TableCell>
                                <TableCell>Availability/Capacity</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {hardwareSets.map((hardware) => (
                                <TableRow key={hardware.name}>
                                  <TableCell>{hardware.name}</TableCell>
                                  <TableCell>
                                    {hardware.avail} / {hardware.capacity}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Button
                                      variant="outlined"
                                      color="primary"
                                      size="small"
                                      sx={{ mr: 1 }}
                                      onClick={() =>
                                        handleOpenDialog(
                                          project.projectID,
                                          "checkout",
                                          hardware
                                        )
                                      }
                                    >
                                      Check Out
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      color="secondary"
                                      size="small"
                                      onClick={() =>
                                        handleOpenDialog(
                                          project.projectID,
                                          "checkin",
                                          hardware
                                        )
                                      }
                                    >
                                      Check In
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for hardware operations */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>
          {currentOperation.type === "checkout" ? "Check Out" : "Check In"}{" "}
          Hardware
        </DialogTitle>
        <DialogContent sx={{ minWidth: "300px", pt: 2 }}>
          {operationResult ? (
            <Alert
              severity={operationResult.success ? "success" : "error"}
              sx={{ mt: 2 }}
            >
              {operationResult.message}
            </Alert>
          ) : (
            <>
              <Typography variant="body1" gutterBottom>
                {currentOperation.hardware?.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Available: {currentOperation.hardware?.avail} /{" "}
                {currentOperation.hardware?.capacity}
              </Typography>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                margin="normal"
                value={amount}
                onChange={handleAmountChange}
                inputProps={{
                  min: 1,
                  max:
                    currentOperation.type === "checkout"
                      ? currentOperation.hardware?.avail
                      : undefined,
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {operationResult ? "Close" : "Cancel"}
          </Button>
          {!operationResult && (
            <Button onClick={performOperation} color="primary">
              Confirm
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Debug button */}
      <Button
        variant="outlined"
        color="warning"
        onClick={() => {
          console.log("Testing API call...");
          const token = localStorage.getItem("token");

          fetch("http://localhost:5000/resources/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
              return response.json();
            })
            .then((data) => {
              console.log("API response:", data);
              alert("Hardware sets: " + JSON.stringify(data));
            })
            .catch((error) => {
              console.error("API call failed:", error);
              alert("API call failed: " + error.message);
            });
        }}
        style={{ margin: "20px" }}
      >
        Debug: Test API
      </Button>

      {/* Display token for debugging */}
      <div
        style={{ margin: "20px", padding: "10px", border: "1px solid #ccc" }}
      >
        <h4>Debug Info</h4>
        <p>
          Token:{" "}
          {localStorage.getItem("token") ? "Token exists" : "No token found"}
        </p>
        <p>Hardware Sets: {JSON.stringify(hardwareSets)}</p>
      </div>
    </div>
  );
};

export default Projects;
