import { readFile, writeFile } from "node:fs/promises";
import path from "path";


const __dirname = path.resolve("data", "./");

export async function readData(filename) {
    try {
       const filetoRead = (await readFile(path.join(__dirname, filename), "utf8")).trim()
       if (!filetoRead) {
        return [];
        }
       return JSON.parse(filetoRead)
    } catch (err) {
        if (err.code === "ENOENT") {
            return []
        } else {
            throw err
        }

    }
}

export async function writeData(filename, data) {
    const filePath = path.join(__dirname, filename)
    try {
        await writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
    } catch (err) {
        console.log("Error writing to file", err)
        throw err
    }
}
