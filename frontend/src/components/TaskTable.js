import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button, Typography } from "@mui/material";
import dayjs from "dayjs"; // For date comparisons

const TaskTable = ({ tasks, onComplete, onDelete }) => {
    const today = dayjs().format("YYYY-MM-DD");

    const upcomingTasks = tasks.filter(task => !task.completed && task.due_date && task.due_date >= today);
    const overdueTasks = tasks.filter(task => !task.completed && task.due_date && task.due_date < today);
    const completedTasks = tasks.filter(task => task.completed);

    const renderTaskRows = (taskList) => (
        taskList.map((task) => (
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
        ))
    );

    return (
        <TableContainer component={Paper} sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>Upcoming Tasks</Typography>
            <Table>{upcomingTasks.length > 0 ? <TableBody>{renderTaskRows(upcomingTasks)}</TableBody> : <Typography>No upcoming tasks.</Typography>}</Table>

            <Typography variant="h6" sx={{ fontWeight: "bold", mt: 4, mb: 2, color: "red" }}>Overdue Tasks</Typography>
            <Table>{overdueTasks.length > 0 ? <TableBody>{renderTaskRows(overdueTasks)}</TableBody> : <Typography>No overdue tasks.</Typography>}</Table>

            <Typography variant="h6" sx={{ fontWeight: "bold", mt: 4, mb: 2, color: "green" }}>Completed Tasks</Typography>
            <Table>{completedTasks.length > 0 ? <TableBody>{renderTaskRows(completedTasks)}</TableBody> : <Typography>No completed tasks.</Typography>}</Table>
        </TableContainer>
    );
};

export default TaskTable;
