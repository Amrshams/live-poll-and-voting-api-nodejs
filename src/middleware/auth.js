import { verifyToken } from "../utils/jwt.js";

export function authenticate(req, res, next) {
    //checking the Authorization header: "Authorization: Bearer <token>""
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided." });
    }
    const token = authHeader.split(" ")[1]
    const decoded = verifyToken(token)
    if (!decoded) {
        return res.status(401).json({ error: "Token provided is Invalid." });
    }
    req.user = decoded
    next()
}