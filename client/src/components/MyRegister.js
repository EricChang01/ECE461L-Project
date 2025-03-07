/*
Send registration data to the Postman Mock API (api/auth/register)
*/

import React, { useState } from "react";

const MyRegister = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage("");
        
        try {
            const response = await fetch("http://127.0.0.1:5000/auth/register", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
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

    return (
        <div>
            <h2>New Registration Page</h2>
            <form onSubmit={handleRegister}>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
                <button type="submit">Sign Up</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default MyRegister;
