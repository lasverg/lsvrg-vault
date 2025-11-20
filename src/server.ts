import express from 'express'
import http from 'http'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'
import mongoSanitize from 'express-mongo-sanitize'
import cookieParser from 'cookie-parser'

import { config } from 'dotenv'

import log from '@logger'
import connect from '@db/connect.js'
import router from '@routers/index.js'
import { appErrorHandler } from '@errors/app.error.js'
import { AppErrorResponse } from '@errors/response.error.js'
import { authMiddleware } from '@middlewares/auth.middleware.js'

config()

const PORT = process.env.PORT
const BASE_URL = process.env.BASE_URL

const app = express()
const server = http.createServer(app)
const logger = morgan('tiny')

// setup the logger
app.use(logger)

//
app.use(helmet())
app.use(helmet.xssFilter())
app.use(cors())
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ limit: '5mb', extended: true }))

app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use(mongoSanitize())

app.get('/health', (req, res) => {
  const client = req.get('user-agent')
  log.info({ userAgent: client }, 'Health check')
  res.send('Server is up')
})

// app.get('/health/stats', statsPage)

app.use(authMiddleware)
app.use('/api/v1', router())

app.use('*', (_req, res) => {
  res
    .status(404)
    .json(new AppErrorResponse('404 Error: request not found.', 404))
})

app.use(appErrorHandler)

server.listen(PORT, () => {
  log.info(`Server running on ${BASE_URL}`)
  connect()
})
