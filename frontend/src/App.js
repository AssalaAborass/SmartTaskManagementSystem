import { useEffect, useState } from "react";
import { Container, Typography, Paper, Box, TextField, Button } from "@mui/material";
import TaskTable from "./components/TaskTable";

function App() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState("Medium");

    useEffect(() => {
        fetch("http://127.0.0.1:8080/api/tasks/")
            .then(response => response.json())
            .then(data => setTasks(data))
            .catch(error => console.error("Error fetching tasks:", error));
    }, []);

    const addTask = (e) => {
        e.preventDefault();

        fetch("http://127.0.0.1:8080/api/tasks/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: title,
                priority: priority,
                completed: false,
            }),
        })
        .then(response => response.json())
        .then(newTask => {
            setTasks([...tasks, newTask]);
            setTitle("");
        })
        .catch(error => console.error("Error adding task:", error));
    };

    const markTaskComplete = (id) => {
        fetch(`http://127.0.0.1:8080/api/tasks/${id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: true }),
        })
        .then(() => setTasks(tasks.map(task => task.id === id ? { ...task, completed: true } : task)))
        .catch(error => console.error("Error completing task:", error));
    };

    const deleteTask = (id) => {
        fetch(`http://127.0.0.1:8080/api/tasks/${id}/`, { method: "DELETE" })
        .then(() => setTasks(tasks.filter(task => task.id !== id)))
        .catch(error => console.error("Error deleting task:", error));
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 5, p: 3, textAlign: "center", bgcolor: "#f5f5f5", borderRadius: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>Smart Task Manager</Typography>

                {/* Task Input Form */}
                <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                    <form onSubmit={addTask}>
                        <TextField
                            fullWidth
                            label="New Task"
                            variant="outlined"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <Button type="submit" variant="contained" sx={{ mt: 2, width: "100%" }}>
                            Add Task
                        </Button>
                    </form>
                </Paper>

                {/* Task Table */}
                <TaskTable tasks={tasks} onComplete={markTaskComplete} onDelete={deleteTask} />
            </Box>
        </Container>
    );
}

export default App;
