import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import HardwareSetList from "./HardwareSetList";

const ProjectDetails = ({ project }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {project.name}
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          {project.des}
        </Typography>

        {/* User list or other project info */}
        {/* ... */}

        {/* Hardware Sets */}
        <HardwareSetList projectID={project.projectID} />
      </CardContent>
    </Card>
  );
};

export default ProjectDetails;
