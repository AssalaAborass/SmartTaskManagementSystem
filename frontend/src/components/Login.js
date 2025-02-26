// import React, { useState } from "react";

// const Login = ({ setToken }) => {
//     const [username, setUsername] = useState("");
//     const [password, setPassword] = useState("");
//     const [isRegistering, setIsRegistering] = useState(false);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         const url = isRegistering
//             ? "http://127.0.0.1:8080/api/register/"
//             : "http://127.0.0.1:8080/api/token/";

//         const response = await fetch(url, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ username, password }),
//         });

//         const data = await response.json();
//         if (response.ok) {
//             localStorage.setItem("token", data.access); // ✅ Store token
//             setToken(data.access);
//         } else {
//             alert(data.error || "Something went wrong");
//         }
//     };

//     return (
//         <div style={{ textAlign: "center", marginTop: "50px" }}>
//             <h2>{isRegistering ? "Register" : "Login"}</h2>
//             <form onSubmit={handleSubmit}>
//                 <input
//                     type="text"
//                     placeholder="Username"
//                     value={username}
//                     onChange={(e) => setUsername(e.target.value)}
//                     required
//                 />
//                 <br />
//                 <input
//                     type="password"
//                     placeholder="Password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     required
//                 />
//                 <br />
//                 <button type="submit">{isRegistering ? "Register" : "Login"}</button>
//             </form>
//             <button onClick={() => setIsRegistering(!isRegistering)}>
//                 {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
//             </button>
//         </div>
//     );
// };

// export default Login;


import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Login = ({ setToken }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate(); // ✅ Add navigation hook

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Login button clicked");
        setError(""); // Reset error message
        const url = isRegistering
            ? "http://127.0.0.1:8080/api/register/"
            : "http://127.0.0.1:8080/api/token/";

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        console.log("server response", data);

        if (response.ok) {
            localStorage.setItem("token", data.access);
            setToken(data.access);
            console.log("Login successful");

            // ✅ Navigate to the tasks page immediately
            navigate("/tasks");
        } else {
            setError(data.error || "Invalid username or password");
            console.log("Login failed:", data.error || "unknown error");
        }
    };

    return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="#f5f5f5">
            <Paper elevation={3} sx={{ p: 4, width: 320, textAlign: "center" }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {isRegistering ? "Create an Account" : "Login"}
                </Typography>
                {error && <Typography color="error">{error}</Typography>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Username"
                        variant="outlined"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        sx={{ my: 1 }}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        sx={{ my: 1 }}
                    />
                    <Button fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                        {isRegistering ? "Sign Up" : "Login"}
                    </Button>
                </form>
                <Button
                    onClick={() => setIsRegistering(!isRegistering)}
                    sx={{ mt: 2, textTransform: "none" }}
                >
                    {isRegistering ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                </Button>
            </Paper>
        </Box>
    );
};

export default Login;
