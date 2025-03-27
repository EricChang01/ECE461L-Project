import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles.css"; // Will create this for styling

const MyLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Logging in with:", email, password); // Debug log

    try {
      const response = await fetch("http://127.0.0.1:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Server Response:", data); // Debug log

      if (response.status === 200) {
        setMessage(`✅ Success: ${data.message}`);
        if (data.token) {
          localStorage.setItem("token", data.token);

          // Store the username for later use
          if (data.username) {
            localStorage.setItem("username", data.username);
          }

          navigate("/projects");
        }
      } else if (response.status === 401) {
        setMessage(`❌ Error: ${data.message}`);
      } else {
        setMessage(
          `⚠️ Unexpected Error: ${data.message || "Something went wrong"}`
        );
      }
    } catch (error) {
      console.error("API Error:", error);
      setMessage("❌ Network Error: Unable to reach the server.");
    }
  };

  const handleRegisterClick = () => {
    navigate("/my-register");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Team TBD</h1>

        <form onSubmit={handleLogin}>
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
            Login
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <div className="register-container">
          <button onClick={handleRegisterClick} className="btn btn-secondary">
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyLogin;
