// import React, { useState } from "react";
// import KanbanBoard from "./components/KanbanBoard";
// import Login from "./components/Login";

// function App() {
//     const [token, setToken] = useState(localStorage.getItem("token"));

//     return token ? <KanbanBoard /> : <Login setToken={setToken} />;
// }

// export default App;


import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import Login from "./components/Login";
import KanbanBoard from "./components/KanbanBoard";

const App = () => {
    const [token, setToken] = useState(localStorage.getItem("token"));

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login setToken={setToken} />} />
                <Route path="/tasks" element={token ? <KanbanBoard /> : <Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
};

export default App;

