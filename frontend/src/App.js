import { useEffect, useState } from "react";

function App() {
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        fetch("http://127.0.0.1:8080/api/tasks/")  // Fetch data from Django API
            .then(response => response.json())
            .then(data => setTasks(data))
            .catch(error => console.error("Error fetching tasks:", error));
    }, []);

    return (
        <div>
            <h1>Task List</h1>
            <ul>
                {tasks.map(task => (
                    <li key={task.id}>
                        <strong>{task.title}</strong> - {task.due_date} - {task.completed ? "✅ Completed" : "❌ Pending"}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;
