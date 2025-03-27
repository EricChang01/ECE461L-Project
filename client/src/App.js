import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import MyLogin from "./components/MyLogin";
import MyRegister from "./components/MyRegister";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/my-login" />} />
        <Route path="/my-login" element={<MyLogin />} />
        <Route path="/my-register" element={<MyRegister />} />
      </Routes>
    </Router>
  );
}

export default App;
