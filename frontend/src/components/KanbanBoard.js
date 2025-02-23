import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Box, Typography, Paper, List, ListItem, Button } from "@mui/material";

const KanbanBoard = ({ setToken }) => {
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
    
        fetch("http://127.0.0.1:8080/api/tasks/", {
            headers: { "Authorization": `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(data => {
                console.log("Fetched tasks:", data);
                setTasks(Array.isArray(data) ? data : []);
            })
            .catch(error => console.error("Error fetching tasks:", error));
    }, []);
    
    const statuses = ["To Do", "In Progress", "Completed"];

    const onDragEnd = (result) => {
        if (!result.destination) return;

        const updatedTasks = [...tasks];
        const draggedTask = updatedTasks.find(task => task.id.toString() === result.draggableId);
        draggedTask.status = statuses[result.destination.droppableId];

        setTasks(updatedTasks);

        // Update task status in Django backend
        fetch(`http://127.0.0.1:8080/api/tasks/${draggedTask.id}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ status: draggedTask.status })
        }).catch(error => console.error("Error updating task:", error));
    };

    const handleLogout = () => {
        localStorage.removeItem("token"); // ✅ Remove token
        window.location.reload(); // ✅ Reload the page to go back to the login screen
    };

    return (
        <>
            {/* ✅ Logout Button at the Top-Right */}
            <Box display="flex" justifyContent="flex-end" p={2}>
                <Button variant="contained" color="error" onClick={handleLogout}>
                    Logout
                </Button>
            </Box>

            {/* Kanban Board */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Box display="flex" justifyContent="space-around" mt={4}>
                    {statuses.map((status, index) => (
                        <Droppable droppableId={`${index}`} key={status}>
                            {(provided) => (
                                <Paper
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    sx={{
                                        width: "30%",
                                        minHeight: "300px",
                                        p: 2,
                                        bgcolor: status === "To Do" ? "#29b6f6" :
                                                status === "In Progress" ? "#ffb300" : "#66bb6a",
                                    }}
                                >
                                    <Typography variant="h6" sx={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>
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
                                                            }}
                                                        >
                                                            {task.title}
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
        </>
    );
};

export default KanbanBoard;
