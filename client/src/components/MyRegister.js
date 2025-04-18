/*
Send registration data to the Postman Mock API (api/auth/register)
*/

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css"; // Shared styles with login

const MyRegister = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch("http://127.0.0.1:5000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      console.log("Server Response:", data);

      if (response.ok) {
        setMessage("Registration successful!");
      } else {
        setMessage(`Registration failed: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Registration failed. Please try again later.");
    }
  };

  const handleLoginClick = () => {
    navigate("/my-login");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Create Account</h1>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Sign Up
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <div className="register-container">
          <button onClick={handleLoginClick} className="btn btn-secondary">
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyRegister;
