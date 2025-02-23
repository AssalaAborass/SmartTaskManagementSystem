import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Box, Typography, Paper, List, ListItem, TextField, MenuItem, Button } from "@mui/material";

const KanbanBoard = () => {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState(""); 
    const [dueDate, setDueDate] = useState("");  
    const [priority, setPriority] = useState("Medium");

    useEffect(() => {
        const token = localStorage.getItem("token");

        fetch("http://127.0.0.1:8080/api/tasks/", {
            headers: { "Authorization": `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(data => setTasks(Array.isArray(data) ? data : []))
            .catch(error => console.error("Error fetching tasks:", error));
    }, []);

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
        })
        .catch(error => console.error("Error adding task:", error));
    };

    const priorityColors = {
        High: "red",
        Medium: "orange",
        Low: "green"
    };

    // Handle Drag and Drop of tasks
    const onDragEnd = (result) => {
        if (!result.destination) return;

        const updatedTasks = [...tasks];
        const draggedTask = updatedTasks.find(task => task.id.toString() === result.draggableId);

        // Get new status from the column it was dropped into
        const newStatus = result.destination.droppableId;
        draggedTask.status = newStatus;

        setTasks(updatedTasks);

        // Send updated task status to the backend
        fetch(`http://127.0.0.1:8080/api/tasks/${draggedTask.id}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(updatedTask => {
            setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
        })
        .catch(error => console.error("Error updating task:", error));
    };

    const handleLogout = () => {
        localStorage.removeItem("token");  // Remove token from storage
        window.location.reload();  // Refresh the page to go back to login
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

            {/* Task Board with Drag & Drop */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Box display="flex" justifyContent="space-between">
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
                                        {tasks
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
                                                                flexDirection: "column"
                                                            }}
                                                        >
                                                            <Typography fontWeight="bold">{task.title}</Typography>
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
        </Box>
    );
};

export default KanbanBoard;
