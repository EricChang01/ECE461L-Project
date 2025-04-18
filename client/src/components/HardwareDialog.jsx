import React, { useState, useEffect } from "react";

const HardwareDialog = ({
  isOpen,
  onClose,
  operation,
  projectID,
  hardware,
  checkedOutAmount, // Pass this from parent
  onOperationComplete,
}) => {
  const [amount, setAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAmount(1);
      setResult(null);
    }
  }, [isOpen]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow empty string or convert to number
    if (value === "") {
      setAmount("");
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0) {
        // Don't allow more than available
        const max =
          operation === "checkout"
            ? hardware?.avail || 0
            : checkedOutAmount || 0;
        setAmount(numValue > max ? max : numValue);
      }
    }
  };

  const getMaxAmount = () => {
    if (operation === "checkout") {
      return hardware?.avail || 0;
    } else {
      return checkedOutAmount || 0;
    }
  };

  const validateInput = () => {
    if (amount <= 0) {
      setResult({
        success: false,
        message: "Amount must be greater than zero",
      });
      return false;
    }

    if (operation === "checkout" && amount > hardware?.avail) {
      setResult({
        success: false,
        message: `Only ${hardware?.avail} units available for checkout`,
      });
      return false;
    }

    return true;
  };

  const performOperation = async () => {
    if (!validateInput()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");

      console.log(
        `Attempting to ${operation} ${amount} units of ${hardware.name} for project ${projectID}`
      );

      const response = await fetch(
        `http://127.0.0.1:5000/resources/${operation}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectID: projectID,
            hardware_set: hardware.name,
            amount: amount,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message:
            data.message ||
            `Successfully ${
              operation === "checkout" ? "checked out" : "checked in"
            } ${amount} units of ${hardware.name}`,
        });
        // Notify parent to refresh data
        if (onOperationComplete) {
          onOperationComplete();
        }
      } else {
        setResult({
          success: false,
          message: data.message || `Failed to ${operation} hardware`,
        });
      }
    } catch (error) {
      console.error(`Error during ${operation}:`, error);
      setResult({
        success: false,
        message: "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {operation === "checkout" ? "Check Out" : "Check In"} Hardware
          </h2>
        </div>
        <div className="modal-body">
          {result ? (
            <div
              className={`result-message ${
                result.success ? "success" : "error"
              }`}
            >
              {result.message}
            </div>
          ) : (
            <>
              <p>
                <strong>{hardware?.name}</strong>
              </p>
              {operation === "checkout" ? (
                <p>
                  Available: {hardware?.avail}/{hardware?.capacity}
                </p>
              ) : (
                <p>Currently checked out: {checkedOutAmount}</p>
              )}
              <div className="form-group">
                <label>Amount:</label>
                <input
                  type="number"
                  min="1"
                  max={operation === "checkout" ? hardware?.avail : undefined}
                  value={amount}
                  onChange={handleAmountChange}
                />
                {operation === "checkout" && (
                  <small className="input-hint">
                    Maximum: {hardware?.avail}
                  </small>
                )}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              className="confirm-button"
              onClick={performOperation}
              disabled={
                isLoading ||
                amount === "" ||
                amount <= 0 ||
                (operation === "checkout" && amount > hardware?.avail)
              }
            >
              {isLoading ? "Processing..." : "Confirm"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HardwareDialog;
