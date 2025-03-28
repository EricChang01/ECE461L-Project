import React, { useState } from "react";
import HardwareSetList from "./HardwareSetList";
import { Box, Button, Collapse } from "@mui/material";

// Your existing ProjectsPage component
function ProjectsPage() {
  const [expandedProject, setExpandedProject] = useState(null);

  const handleExpandProject = (projectID) => {
    setExpandedProject(expandedProject === projectID ? null : projectID);
  };

  // Within your existing render method, modify the Actions cell:
  return (
    <>
      {/* Your existing table structure */}
      <table>
        <thead>
          <tr>
            <th>Project name</th>
            <th>Project ID</th>
            <th>Users</th>
            <th>Description</th>
            <th>Hardware</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <React.Fragment key={project.projectID}>
              <tr>
                <td>{project.name}</td>
                <td>{project.projectID}</td>
                <td>{project.users}</td>
                <td>{project.des}</td>
                <td>
                  {project.hardware && project.hardware.length > 0
                    ? project.hardware
                        .map((h) => `${h.hw_name}: ${h.amount}`)
                        .join(", ")
                    : "No hardware assigned"}
                </td>
                <td>
                  {/* Add Manage Hardware button here */}
                  <Button
                    variant="outlined"
                    style={{ marginRight: "8px" }}
                    onClick={() => handleExpandProject(project.projectID)}
                  >
                    {expandedProject === project.projectID
                      ? "Hide Hardware"
                      : "Manage Hardware"}
                  </Button>
                  <Button variant="contained" color="error">
                    Leave
                  </Button>
                </td>
              </tr>
              <tr>
                <td colSpan="6" style={{ padding: 0 }}>
                  <Collapse in={expandedProject === project.projectID}>
                    <Box p={2} border="1px solid #eee" borderRadius={1} m={1}>
                      <HardwareSetList projectID={project.projectID} />
                    </Box>
                  </Collapse>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}
