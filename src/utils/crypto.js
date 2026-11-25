import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

export function hashPassword(password) {
    //Generating a 16byte random salt; unique, random no. added to a password—before it passes through a cryptographic hash function. 
    // It ensures that identical passwords produce completely different hash outputs.
    const salt = randomBytes(16).toString("hex");
    // Derive a 64byte key using scrypt
    const derievedKey = scryptSync(password, salt, 64);

    //Store both the salt and the hash together (separated by a colon)
    return `${salt}: ${derievedKey.toString("hex")}`;
}

export function verifyPassword(password, storedHash) {
    // Split the stored 'storedHash' string back into salt and original hash key
    const [salt, key] = storedHash.split(": ")

    // Hashes incoming password with same salt & key length
    const keyBuffer = Buffer.from(key, 'hex')

    const derivedKey = scryptSync(password, salt, 64)

    //method that compares two Buffers, return either true or false
    return timingSafeEqual(keyBuffer, derivedKey)
}

// const savedPassword = hashPassword("MyPasswordis1234")
// console.log("Saved password is ", savedPassword)

// const isMatch = verifyPassword("MyPasswordis1234", savedPassword)
// console.log(isMatch)