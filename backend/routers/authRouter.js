// Google auth
import jwt from "jsonwebtoken";
import {Config} from "../config.js";
import {OAuth2Client} from "google-auth-library";
import express from "express";
import bcrypt from "bcrypt";
import {convertUserToGoogle, createUser, getUserByEmail, updateLoginTime} from "../db.js";
import {AUTH_METHODS, ERROR_MESSAGES} from "../models.js";

const router = express.Router()
const AUTH_TOKEN_EXPIRY_MS = 60 * 60 * 1000  // 1 hour in milliseconds
// const AUTH_TOKEN_EXPIRY_MS = 10 * 1000  // 10 seconds in milliseconds
const AUTH_TOKEN_REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000  // 30 days in milliseconds
// const AUTH_TOKEN_REFRESH_EXPIRY_MS = 1 * 60 * 1000  // 1 minutes in milliseconds

const client = new OAuth2Client(Config.googleClientId)
router.post('/google', async (req, res) => {
    const {token} = req.body

    try {
        // Verify the token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: Config.googleClientId,
        })
        const payload = ticket.getPayload()
        const userGoogleId = payload.sub
        const email = payload.email
        const name = payload.name
        const photoUrl = payload.picture

        let user = await signInGoogleUser(userGoogleId, email, name, photoUrl)
        setAuthCookie(res, user.id)
        res.json(user)
    } catch (error) {
        res.status(401).json({
            error: ERROR_MESSAGES.GOOGLE_LOGIN_FAILED,
            errorMessage: "Google login failed, please contact app developer"
        })
    }
})

// This is called from native flutter google logins, where the email and userGoogleId is already given
router.post('/googleSignIn', async (req, res) => {
    const {email, userGoogleId, name, photoUrl} = req.body

    try {
        let user = await signInGoogleUser(userGoogleId, email, name, photoUrl)
        setAuthCookie(res, user.id)
        res.json(user)
    } catch (error) {
        res.status(401).json({
            error: ERROR_MESSAGES.GOOGLE_LOGIN_FAILED,
            errorMessage: "Google login failed, please contact app developer"
        })
    }
})

async function signInGoogleUser(userGoogleId, email, name, photoUrl) {
    let existingUser = await getUserByEmail(email)
    let user
    if (existingUser != null) {
        // If existing email is not logged in through google, just convert it
        if (existingUser.authMethod !== AUTH_METHODS.google) {
            await convertUserToGoogle(email, userGoogleId)
            existingUser.id = userGoogleId
        }
        user = existingUser
    } else {
        user = await createUser(userGoogleId, email, null, AUTH_METHODS.google, null)
    }

    await updateLoginTime(user.id)
    return user
}

router.post('/signUp', async (req, res) => {
    const {email, password} = req.body
    let passwordHash = await bcrypt.hash(password, 10)

    let existingUser = await getUserByEmail(email)
    if (existingUser != null) {
        res.status(409).json({
            error: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
            errorMessage: "A user with this email already exists!"
        })
        return
    }
    let id = crypto.randomUUID()
    let newUser = await createUser(id, email, passwordHash, AUTH_METHODS.email, null)
    setAuthCookie(res, newUser.id)
    await updateLoginTime(newUser.id)
    res.json(newUser)
})

router.post('/login', async (req, res) => {
    const {email, password} = req.body

    let user = await getUserByEmail(email)
    if (user == null) {
        res.status(404).json({error: ERROR_MESSAGES.NO_USER_WITH_EMAIL, errorMessage: "There is no user with this username"})
        return
    }
    if (user.authMethod !== AUTH_METHODS.email) {
        res.status(412).json({error: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED_WITH_GOOGLE, errorMessage: "This email is registered with google"})
        return
    }

    let passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
        res.status(401).json({error: ERROR_MESSAGES.WRONG_PASSWORD, errorMessage: "Wrong password"})
        return
    }

    setAuthCookie(res, user.id)
    await updateLoginTime(user.id)
    res.json(user)
})

router.post('/signOut', async (req, res) => {
    removeAuthCookie(res)
    res.json({status: 'success'})
})

function setAuthCookie(res, userId) {
    const token = jwt.sign(
        {
            userId
        },
        Config.JWTPrivateKey,
        {expiresIn: `${AUTH_TOKEN_EXPIRY_MS}ms`}
    )
    // We keep the cookie forever because we have the expiration inside the JWT
    let forever = 1000 * 60 * 60 * 24 * 365 * 10 // 10 years
    res.cookie('authToken', token, {
        maxAge: forever,
        httpOnly: true,
        secure: Config.prod,
        sameSite: "strict"
    })
}

function removeAuthCookie(res) {
    res.clearCookie('authToken')
}

function verifyToken(req, res, next) {
    const token = req.cookies.authToken

    if (!token) {
        return res.status(401).json({error: ERROR_MESSAGES.MISSING_TOKEN, errorMessage: 'Token is missing, access denied'});
    }

    try {
        let decoded = jwt.verify(token, Config.JWTPrivateKey)
        req.userId = decoded.userId
        next()
    } catch(e) {
        // On expiration of the JWT, we check if it's recently expired and if so then refresh it
        // TODO: refresh token!
        if (e.name === "TokenExpiredError") {
            let expiredAt = e.expiredAt
            let overdueMs = Date.now() - expiredAt.getTime()
            if (overdueMs <= AUTH_TOKEN_REFRESH_EXPIRY_MS) {
                let decoded = jwt.decode(token)
                setAuthCookie(res, decoded.userId)
                req.userId = decoded.userId
                return next()
            }
            return res.status(403).json({error: ERROR_MESSAGES.EXPIRED_TOKEN, errorMessage: 'Expired token'})
        }
        console.error("Error in verifying token", e)
        return res.status(403).json({error: ERROR_MESSAGES.INVALID_TOKEN, errorMessage: 'Invalid token'})
    }
}

export {
    verifyToken,
    setAuthCookie,
    router as AuthRouter
}
