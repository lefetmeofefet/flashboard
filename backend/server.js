import express from 'express'
import {Config} from "./config.js"
import "express-async-errors"
import cookieParser from "cookie-parser"
import {AuthRouter, verifyToken} from "./routers/authRouter.js";
import {ApiRouter} from "./routers/apiRouter.js";
import {queryNeo4j} from "./db.js";

const app = express()


app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
});

app.use(express.static('frontend'))
app.use(express.static('shared'))
app.use(cookieParser())
app.use(express.json({limit: "100mb"}))

app.use("/api", verifyToken, ApiRouter)
app.use("/auth", AuthRouter)

// Global error middleware
app.use((err, req, res, next) => {
    if (err) {
        console.error(err)
        res.status(err.statusCode || 500).json(err.message)
    }
})

app.listen(Config.port, () => {
    console.log(`Flashboard is UP! https://localhost:${Config.port}`)
})

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason)
})

async function sendKeepAlive() {
    try {
        await queryNeo4j('RETURN 1 AS keepAlive');
        console.log('Neo4j keep‑alive sent');
    } catch (err) {
        console.error('Neo4j keep‑alive failed:', err);
    }
}

// Run once immediately
sendKeepAlive();
setInterval(sendKeepAlive, 1000 * 60 * 60);
