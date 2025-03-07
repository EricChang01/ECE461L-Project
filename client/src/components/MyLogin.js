import React, { useState } from "react";

const MyLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

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
            } else if (response.status === 401) {
                setMessage(`❌ Error: ${data.message}`);
            } else {
                setMessage(`⚠️ Unexpected Error: ${data.message || "Something went wrong"}`);
            }
        } catch (error) {
            console.error("API Error:", error);
            setMessage("❌ Network Error: Unable to reach the server.");
        }
    };

    return (
        <div>
            <h2>Login Page</h2>
            <form onSubmit={handleLogin}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
                <button type="submit">Login</button>
            </form>
            <p>{message}</p> {/* Show success/error messages */}
        </div>
    );
};

export default MyLogin;
