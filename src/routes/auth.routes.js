import express from "express";
import { readData, writeData } from "../utils/storage.js"
import { randomUUID } from "crypto"
import { hashPassword, verifyPassword } from "../utils/crypto.js"
import { signToken } from "../utils/jwt.js"

const app = express()
const router = express.Router()

router.post("/register", async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        return res.status(400).send("username and password are required")
    }

    const users = await readData("users.json")
    const userExists = users.find(u => u.username === username)

    if (userExists) {
        return res.status(409).send("Duplicated: username exists")
    }

    const newUser = {
        id: randomUUID(),
        username: username,
        hashedPassword: hashPassword(password)
    }
    users.push(newUser)
    await writeData("users.json", users)

    res.status(201).send("User Created Successfully")
})


router.post("/login", async (req, res) => {
    const { username, password } = req.body
    if(!username || !password) {
        return res.status(400).json({ message: "Username and password are required" })
    }
    const users = await readData("users.json")
    const user = users.find(u => u.username === username) || null

    if (!user) {
        res.status(401).json({message: "Invalid credentials"})
    }

    const isSamePassword = verifyPassword(password, user.hashedPassword)
    if (!isSamePassword) {
        res.status(401).json({message: "Invalid credentials"})
    }
    
    // Extract 'hashedPassword' property from user and assign everything else to 'Payload'
    const {hashedPassword, ...payload} = user
    const token = signToken(payload)
    return res.status(200).json({ message: "Logged In Successfully", token: token})
})

export default router;