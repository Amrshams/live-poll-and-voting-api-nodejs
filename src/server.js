//Initialize , load , reads env. variables from .env
import "dotenv/config"
import express from "express"
import helmet from "helmet"
import cors from "cors"
import authRoutes from "./routes/auth.routes.js"
import pollsRoutes from "./routes/polls.routes.js"
import { initSocket } from "./ws/socket.js"

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use("/api/auth", authRoutes)
app.use("/api/polls", pollsRoutes)

const server =app.listen(process.env.PORT, () => {
    console.log("Server Started, and listening on port", process.env.PORT)
})
initSocket(server);

let isShuttingDown = false
app.get("/health", (req, res) => {
    if (isShuttingDown) {
        res.status(503).send("Service Unavailable")
    } else{
        res.status(200). send("Ok")
    }
})
process.on("SIGTERM", () => {
    isShuttingDown = true
    console.log("Server is going to shutdown")
    server.close(() => {
        console.log("Server Closed by SIGTERM")
    })
})

process.on("SIGINT", () => {
    isShuttingDown = true
    console.log("Server is going to shutdown manually")
    server.close(() => {
        console.log("Server Closed by SIGINT")
    })
})

app.use((req, res, next) => {
    res.status(404).json({error: "Sorry, that route does not exist."})
})

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500
    console.error(err)
    res.status(statusCode).json({"error": err.message})
})