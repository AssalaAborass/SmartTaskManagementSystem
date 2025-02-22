import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button } from "@mui/material";

const TaskTable = ({ tasks, onComplete, onDelete }) => {
    return (
        <TableContainer component={Paper} sx={{ mt: 3, p: 2 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell><strong>Title</strong></TableCell>
                        <TableCell><strong>Due Date</strong></TableCell>
                        <TableCell><strong>Priority</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tasks.map((task) => (
                        <TableRow key={task.id}>
                            <TableCell>{task.title}</TableCell>
                            <TableCell>{task.due_date || "No Due Date"}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={task.priority} 
                                    color={task.priority === "High" ? "error" : task.priority === "Medium" ? "warning" : "success"} 
                                />
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={task.completed ? "Completed" : "Pending"} 
                                    color={task.completed ? "success" : "primary"} 
                                />
                            </TableCell>
                            <TableCell>
                                {!task.completed && (
                                    <Button 
                                        variant="contained" 
                                        color="success" 
                                        size="small"
                                        onClick={() => onComplete(task.id)}
                                        sx={{ mr: 1 }}
                                    >
                                        Complete
                                    </Button>
                                )}
                                <Button 
                                    variant="contained" 
                                    color="error" 
                                    size="small"
                                    onClick={() => onDelete(task.id)}
                                >
                                    Delete
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TaskTable;
