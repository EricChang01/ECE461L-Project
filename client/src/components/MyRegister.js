/*
Send registration data to the Postman Mock API (api/auth/register)
*/

import React, { useState } from "react";

const MyRegister = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        const response = await fetch("https://8ff9617e-04fd-4196-8703-cc4fee040511.mock.pstmn.io/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();
        console.log("Server Response:", data);
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
        </div>
    );
};

export default MyRegister;
