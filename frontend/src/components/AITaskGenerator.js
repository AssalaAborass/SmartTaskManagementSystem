import React, { useState } from "react";
import { Box, TextField, Button, Typography, CircularProgress } from "@mui/material";

const AI_TaskGenerator = ({ onTaskGenerated }) => {
    const [taskDescription, setTaskDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGenerateTask = async () => {
        if (!taskDescription.trim()) {
            setError("Please enter a task description.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch("http://127.0.0.1:8080/api/generate-task/", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ description: taskDescription }),
            });

            const data = await response.json();

            if (response.ok) {
                onTaskGenerated(data); // Pass generated task to parent component
                setTaskDescription(""); // Clear input field
            } else {
                setError(data.error || "Failed to generate task.");
            }
        } catch (err) {
            setError("Server error. Please try again.");
        }

        setLoading(false);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}>
            <Typography variant="h6">AI Task Generator</Typography>
            <TextField
                label="Describe your task"
                variant="outlined"
                multiline
                rows={2}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                fullWidth
            />
            <Button variant="contained" color="primary" onClick={handleGenerateTask} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : "Generate Task"}
            </Button>
            {error && <Typography color="error">{error}</Typography>}
        </Box>
    );
};

export default AI_TaskGenerator;
