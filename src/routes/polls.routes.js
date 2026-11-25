import express from "express";
import { readData, writeData } from "../utils/storage.js";
import { authenticate } from "../middleware/auth.js"
import { randomUUID } from "crypto"
import { broadcastPollUpdate } from "../ws/socket.js";


const router = express.Router()

router.get("/", async (req, res) => {
    const statusFiltered = req.query.status
    const polls = await readData("polls.json")
    //Filter results if req.query.status (open or closed) is provided
    if (statusFiltered) {
        const filteredPolls = polls.filter(p => p.status === statusFiltered)
        return res.status(200).json(filteredPolls)
    }
})

router.post("/", authenticate, async (req, res) => {
    const { question, options } = req.body
    if (!question || typeof question !== "string" || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: "You have to input a question and at least 2 options" })
    }

    //.map() to convert each item in "option" array into a structured object:
    const optionObjects = options.map(option => ({
        id: randomUUID(),
        text: option,
        votes: 0
    })
    )
    const poll = {
        id: randomUUID(),
        question,
        creatorId: req.user.id,
        status: "open",
        options: optionObjects,
        voters: [],
        createdAt: new Date().toISOString()
    }

    /**1. Read (readFile + JSON.parse): Loads the existing file from disk and converts the JSON text back into a live JavaScript array in memory ([ poll1, poll2 ]).
       2. Push (polls.push(newPoll)): Safely inserts the new poll inside that JavaScript array ([ poll1, poll2, poll3 ]).
       3. Write (JSON.stringify + writeFile): Converts the entire updated array back into valid JSON text and writes it cleanly to polls.json.
       */
    const polls = await readData("polls.json")
    polls.push(poll)
    await writeData("polls.json", polls)
    return res.status(201).json({ message: "Poll has been added", poll })
})

router.delete("/:id", authenticate, async (req, res) => {
    const polls = await readData("polls.json")
    const poll = polls.find(p => p.id === req.params.id)
    if (!poll) {
        return res.status(404).json({ error: "No poll found" })
    }

    if (poll.creatorId !== req.user.id) {
        return res.status(403).json({ message: " poll creator only can delete this poll" })
    }
    polls.filter(item => item === poll)
    await writeData("polls.json", polls)
    return res.status(200).json({ message: "Poll deleted successfully" })
})

router.post("/:id/vote", authenticate, async (req, res) => {
    const polls = await readData("polls.json")
    const poll = polls.find(p => p.id === req.params.id)
    if (!poll) {
        return res.status(404).json({ error: "poll id not found" })
    }
    if (poll.status !== "open") {
        return res.status(400).json({ error: "poll status is closed" })
    }
    if (poll.voters.includes(req.user.id)) {
        return res.status(409).json({ error: "You have already voted on this poll" })
    }
    const { optionId } = req.body
    const option = poll.options.find(opt => opt.id === optionId)
    if (!option) {
        return res.status(400).json({ error: 'Invalid option ID' })
    }
    option.votes += 1;
    poll.voters.push(req.user.id)
    await writeData("polls.json", polls)

    broadcastPollUpdate(poll)

    return res.status(200).json(poll)

})
export default router