import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const HardwareSetList = ({ projectID }) => {
  const [hardwareSets, setHardwareSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState({
    type: "",
    hardware: null,
  });
  const [amount, setAmount] = useState(1);
  const [operationResult, setOperationResult] = useState(null);

  // Fetch hardware sets on component mount
  useEffect(() => {
    fetchHardwareSets();
  }, []);

  const fetchHardwareSets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/resources/");
      setHardwareSets(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load hardware sets");
      setLoading(false);
      console.error(err);
    }
  };

  const handleOpen = (type, hardware) => {
    setCurrentOperation({ type, hardware });
    setAmount(1);
    setOpen(true);
    setOperationResult(null);
  };

  const handleClose = () => {
    setOpen(false);
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
      const { type, hardware } = currentOperation;

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

      // Refresh hardware sets data
      fetchHardwareSets();
    } catch (err) {
      setOperationResult({
        success: false,
        message: err.response?.data?.message || "Operation failed",
      });
      console.error(err);
    }
  };

  if (loading) return <Typography>Loading hardware sets...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Hardware Sets
      </Typography>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px" }}>Hardware Set</th>
            <th style={{ textAlign: "left", padding: "8px" }}>
              Availability/Capacity
            </th>
            <th style={{ textAlign: "right", padding: "8px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {hardwareSets.map((hardware) => (
            <tr key={hardware.name}>
              <td style={{ padding: "8px" }}>{hardware.name}</td>
              <td style={{ padding: "8px" }}>
                {hardware.avail} / {hardware.capacity}
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ mr: 1 }}
                  onClick={() => handleOpen("checkout", hardware)}
                >
                  Check Out
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleOpen("checkin", hardware)}
                >
                  Check In
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Dialog for check in/out operations */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {currentOperation.type === "checkout" ? "Check Out" : "Check In"}{" "}
          Hardware
        </DialogTitle>
        <DialogContent style={{ minWidth: "300px" }}>
          {operationResult ? (
            <Alert
              severity={operationResult.success ? "success" : "error"}
              style={{ marginTop: "16px" }}
            >
              {operationResult.message}
            </Alert>
          ) : (
            <>
              <Typography
                variant="body1"
                gutterBottom
                style={{ marginTop: "16px" }}
              >
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
          <Button onClick={handleClose}>
            {operationResult ? "Close" : "Cancel"}
          </Button>
          {!operationResult && (
            <Button onClick={performOperation} color="primary">
              Confirm
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HardwareSetList;
