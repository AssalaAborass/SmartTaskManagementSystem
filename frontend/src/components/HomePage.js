import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingLeft: "5%",
                backgroundImage: `url("/assets/task-board.png")`, // ✅ Full-page background
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                color: "white",
            }}
        >
            {/* Left Section - Text Content */}
            <Box
                sx={{
                    maxWidth: "40%", // Keep the text contained
                    textAlign: "left",
                    padding: "2rem",
                    borderRadius: "10px",
                }}
            >
                <Typography variant="h3" fontWeight="bold" color="white" gutterBottom>
                    Welcome to Smart Task Manager
                </Typography>
                <Typography variant="h6" color="gray" mb={3}>
                    Organize your tasks efficiently with our intuitive task management system.
                    Keep track of your workflow with our Kanban-style board and manage your tasks seamlessly.
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate("/login")}
                    sx={{ fontWeight: "bold", fontSize: "1rem", px: 4, py: 1 }}
                >
                    Get Started
                </Button>
            </Box>
        </Box>
    );
};

export default HomePage;
