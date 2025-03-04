import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Box, Typography, Paper, List, ListItem, TextField, MenuItem, Button, IconButton, Alert, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AITaskGenerator from "./AITaskGenerator";


const KanbanBoard = () => {
    const [tasks, setTasks] = useState([]);
    const [editTask, setEditTask] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [filterPriority, setFilterPriority] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchTasks();
    }, []);

    useEffect(() => {
        let filtered = tasks;
        if (filterPriority !== "All") {
            filtered = filtered.filter(task => task.priority === filterPriority);
        }
        if (filterStatus !== "All") {
            filtered = filtered.filter(task => task.status === filterStatus);
        }
        setFilteredTasks(filtered);
    }, [tasks, filterPriority, filterStatus]);

    const fetchTasks = () => {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        fetch("http://127.0.0.1:8080/api/tasks/", {
            headers: { "Authorization": `Bearer ${token}` }
        })
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch tasks");
                return response.json();
            })
            .then(data => setTasks(Array.isArray(data) ? data : []))
            .catch(error => {
                setError(error.message);
                console.error("Error fetching tasks:", error);
            })
            .finally(() => setLoading(false));
    };

    const addTask = (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        fetch("http://127.0.0.1:8080/api/tasks/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                due_date: dueDate || null,
                priority,
                status: "To Do"
            }),
        })
        .then(response => response.json())
        .then(newTask => {
            setTasks([...tasks, newTask]);
            setTitle("");
            setDescription("");
            setDueDate("");
            setPriority("Medium");
        })
        .catch(error => console.error("Error adding task:", error));
    };

    const priorityColors = {
        High: "red",
        Medium: "orange",
        Low: "green"
    };

    const isOverdue = (due_date) => {
        return due_date && new Date(due_date) < new Date();
    };

    const handleEditTask = (task) => {
        setEditTask(task);
        setTitle(task.title);
        setDescription(task.description);
        setDueDate(task.due_date);
        setPriority(task.priority);
    };

    const saveTaskEdits = () => {
        const token = localStorage.getItem("token");
        fetch(`http://127.0.0.1:8080/api/tasks/${editTask.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ title, description, due_date: dueDate, priority })
        })
        .then(response => response.json())
        .then(updatedTask => {
            setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
            setEditTask(null);
        })
        .catch(error => console.error("Error updating task:", error));
    };

    const confirmDeleteTask = (taskId) => {
        setDeleteConfirm(taskId);
    };

    const deleteTask = () => {
        const token = localStorage.getItem("token");
        fetch(`http://127.0.0.1:8080/api/tasks/${deleteConfirm}/`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        })
        .then(() => {
            setTasks(tasks.filter(task => task.id !== deleteConfirm));
            setDeleteConfirm(null);
        })
        .catch(error => console.error("Error deleting task:", error));
    };

    // Handle Drag and Drop of tasks
    const onDragEnd = (result) => {
        if (!result.destination) return;

        const updatedTasks = [...tasks];
        const draggedTask = updatedTasks.find(task => task.id.toString() === result.draggableId);
        const newStatus = result.destination.droppableId;

        draggedTask.status = newStatus;
        setTasks(updatedTasks);

        // Save to backend
        fetch(`http://127.0.0.1:8080/api/tasks/${draggedTask.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(updatedTask => {
            setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
        })
        .catch(error => console.error("Error updating task:", error));
    };

    const handleLogout = () => {
        localStorage.removeItem("token");   // Remove token from storage
        window.location.reload();       // Refresh the page to go back to login
    }

    const handleAITaskGenerated = (task) => {
        setTasks([...tasks, task]);
    };
    

    return (
        <Box sx={{ backgroundColor: "#FFE4C4", minHeight: "100vh", p: 3 }}>
            {/* Logout Button */}
            <Box display="flex" justifyContent="space-between" alignItems={"center"}>
                <Button
                    style={{ marginLeft: "auto" }}
                    variant="contained"
                    color="error"
                    onClick={handleLogout}
                    sx={{ fontWeight: "bold" }}
                >
                    Logout
                </Button>
            </Box>

            <Typography variant="h4" fontWeight="bold" textAlign="center" color="black" mb={3}>
                ✨ Smart Task Manager ✨
            </Typography>

            {/* Task Form */}
            <Box component="form" onSubmit={addTask} sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                    label="Task Title"
                    variant="outlined"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <TextField
                    label="Description"
                    variant="outlined"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
                <TextField
                    type="date"
                    variant="outlined"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                />
                <TextField
                    select
                    label="Priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    sx={{ width: 120 }}
                >
                    {["High", "Medium", "Low"].map((option) => (
                        <MenuItem key={option} value={option}>
                            <span style={{ color: priorityColors[option], fontWeight: "bold" }}>{option}</span>
                        </MenuItem>
                    ))}
                </TextField>
                <Button type="submit" variant="contained" sx={{ bgcolor: "#1976D2", color: "white" }}>
                    ADD TASK
                </Button>
            </Box>

            <Box>
                {/* Filter by Priority */}
                <TextField
                    select
                    label="Filter by Priority"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    sx={{ width: 200, mb: 2 }}
                >
                    {["All", "High", "Medium", "Low"].map((option) => (
                        <MenuItem key={option} value={option}>
                            <span style={{ color: priorityColors[option], fontWeight: "bold" }}>{option}</span>
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    label="Filter by Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    sx={{ width: 200, mb: 2 }}
                >
                    {["All", "To Do", "In Progress", "Completed"].map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>

            {/* Loading Indicator */}
            {loading && <Box display={"flex"} justifyContent={"center"} mt={2}><CircularProgress /></Box>}

            {/* Error Message */}
            {error && <Alert severity="error">{error}</Alert>}

            {/* AI Task Generator */}
            <AITaskGenerator onTaskGenerated={handleAITaskGenerated} />

            {/* Task Board with Drag & Drop */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Box mt={3} display="flex" justifyContent="space-between">
                    {["To Do", "In Progress", "Completed"].map((status) => (
                        <Droppable droppableId={status} key={status}>
                            {(provided) => (
                                <Paper
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    sx={{
                                        width: "32%",
                                        minHeight: "350px",
                                        p: 2,
                                        bgcolor: status === "To Do" ? "#29b6f6"
                                            : status === "In Progress" ? "#ffb300" : "#66bb6a",
                                    }}
                                >
                                    <Typography variant="h6" fontWeight="bold" color="white" textAlign="center">
                                        {status}
                                    </Typography>
                                    <List>
                                        {filteredTasks
                                            .filter(task => task.status === status)
                                            .map((task, idx) => (
                                                <Draggable key={task.id} draggableId={task.id.toString()} index={idx}>
                                                    {(provided) => (
                                                        <ListItem
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            sx={{
                                                                mb: 1,
                                                                bgcolor: "#fff",
                                                                p: 1,
                                                                borderRadius: 1,
                                                                boxShadow: 2,
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                border: isOverdue(task.due_date) ? "2px solid red" : "none"
                                                            }}
                                                        >
                                                            <Box display="flex" justifyContent="space-between">
                                                                <Typography fontWeight="bold">{task.title}</Typography>
                                                                {isOverdue(task.due_date) && (
                                                                    <WarningAmberIcon sx={{ color: "red" }} />
                                                                )}
                                                            </Box>
                                                            <Typography fontSize="small">{task.description}</Typography>
                                                            <Typography fontSize="small" color="gray">
                                                                Due: {task.due_date || "No Deadline"}
                                                            </Typography>
                                                            <Typography 
                                                                fontSize="small" 
                                                                fontWeight="bold" 
                                                                sx={{ color: priorityColors[task.priority] }}
                                                            >
                                                                Priority: {task.priority}
                                                            </Typography>
                                                            <Box display="flex" justifyContent="flex-end">
                                                                <IconButton onClick={() => handleEditTask(task)}>
                                                                    <EditIcon color="primary" />
                                                                </IconButton>
                                                                <IconButton onClick={() => confirmDeleteTask(task.id)}>
                                                                    <DeleteIcon color="error" />
                                                                </IconButton>
                                                            </Box>
                                                        </ListItem>
                                                    )}
                                                </Draggable>
                                            ))}
                                        {provided.placeholder}
                                    </List>
                                </Paper>
                            )}
                        </Droppable>
                    ))}
                </Box>
            </DragDropContext>

            {/* Edit Task Dialog */}
            {editTask && (
                <Dialog open onClose={() => setEditTask(null)}>
                    <DialogTitle sx={{ paddingBottom: 2 }}>Edit Task</DialogTitle> 
                    <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField 
                            fullWidth 
                            label="Title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            InputLabelProps={{ shrink: true }} // Ensures label always stays above input
                            variant="outlined"
                            sx={{ mt: 1 }} // Adds spacing between title and first input
                        />
                        <TextField 
                            fullWidth 
                            label="Description" 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            multiline
                            rows={3} // Prevents text area from expanding too much
                            InputLabelProps={{ shrink: true }} 
                            variant="outlined"
                        />
                        <TextField 
                            fullWidth 
                            label="Due Date"
                            type="date" 
                            value={dueDate} 
                            onChange={(e) => setDueDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditTask(null)}>Cancel</Button>
                        <Button onClick={saveTaskEdits} color="primary">Save</Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <Dialog open onClose={() => setDeleteConfirm(null)}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogActions>
                        <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                        <Button onClick={deleteTask} color="error">Delete</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default KanbanBoard;
