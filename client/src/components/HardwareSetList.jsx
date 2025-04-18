import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Alert,
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

  useEffect(() => {
    fetchHardwareSets();
  }, []);

  const fetchHardwareSets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/resources/");
      console.log("Hardware sets response:", response.data);
      setHardwareSets(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching hardware sets:", err);
      setError("Failed to load hardware sets");
      setLoading(false);
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

      console.log(
        `Performing ${type} operation for ${hardware.name}, amount: ${amount}`
      );

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

      console.log("Operation response:", response.data);

      setOperationResult({
        success: true,
        message: response.data.message,
      });

      // Refresh hardware sets data
      fetchHardwareSets();
    } catch (err) {
      console.error("Operation error:", err);
      setOperationResult({
        success: false,
        message: err.response?.data?.message || "Operation failed",
      });
    }
  };

  if (loading) return <Typography>Loading hardware sets...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Hardware Sets
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Hardware Set</TableCell>
              <TableCell>Availability/Capacity</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hardwareSets.length > 0 ? (
              hardwareSets.map((hardware) => (
                <TableRow key={hardware.name}>
                  <TableCell>{hardware.name}</TableCell>
                  <TableCell>
                    {hardware.avail} / {hardware.capacity}
                  </TableCell>
                  <TableCell align="right">
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
                      color="secondary"
                      onClick={() => handleOpen("checkin", hardware)}
                    >
                      Check In
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No hardware sets available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for check in/out operations */}
      <Dialog open={open} onClose={handleClose}>
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
