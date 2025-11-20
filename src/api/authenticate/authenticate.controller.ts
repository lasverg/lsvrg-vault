import { NextFunction, Request, Response } from 'express'
import { findUser } from '@api/user/user.service.js'
import jwt from '@/utils/jwt.utils.js'
import { clientInfo } from '@/utils/clientInfo.utils.js'
import { createSession, getSession } from '@api/authenticate/session.service.js'
import { AuthError } from '@errors/api.error.js'
import { IProtectedRequest, ICookieRequest } from '@/types/index.js'

export async function signinHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const client = clientInfo(req)
  try {
    // find and validate user
    const body = req.body
    const user = await findUser(body)

    // create session
    const session = await createSession({
      user: user.id,
      userAgent: client.agent.browser.name,
      valid: true
    })

    // access token
    const accessToken = await jwt.signToken({ user } as object)

    // refresh token
    const refreshToken = await jwt.signRefreshToken(session.id)

    // send token

    res
      .status(200)
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hour
      })
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
      })
      .json({ accessToken })
  } catch (error) {
    next(error)
  }
}

export async function authCheckHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { accessToken, refreshToken } = (req as any).cookies || {}

    // If no tokens present, return unauthorized
    if (!accessToken && !refreshToken) {
      throw new AuthError('No authentication tokens found')
    }

    // First try to validate the access token
    if (accessToken) {
      try {
        const decoded = jwt.verifyToken(accessToken)
        res.status(200).json({
          valid: true,
          user: decoded,
          message: 'Access token is valid'
        })
        return
      } catch (error) {
        // Access token is invalid/expired, try refresh token
        console.log('Access token expired or invalid, trying refresh token')
        throw new AuthError(
          'Access token expired or invalid, trying refresh token'
        )
      }
    }

    // Try to use refresh token to generate new access token
    if (refreshToken) {
      try {
        const decoded = jwt.verifyToken(refreshToken) as any

        // Verify session is still valid
        const session = await getSession(decoded.session)
        if (!session || !session.valid) {
          throw new AuthError('Session is no longer valid')
        }

        // Get user from session to generate new access token
        const user = session.user
        const newAccessToken = await jwt.signToken({ user } as object)

        // Set new access token as cookie and return success
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 // 1 hour
        })

        res.status(200).json({
          valid: true,
          refreshed: true,
          accessToken: newAccessToken,
          message: 'Token refreshed successfully'
        })
        return
      } catch (error) {
        throw new AuthError('Refresh token is invalid or expired')
      }
    }

    throw new AuthError('Authentication failed')
  } catch (error) {
    next(error)
  }
}

export async function signoutHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Clear cookies
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    res.status(200).json({
      message: 'Successfully signed out'
    })
  } catch (error) {
    next(error)
  }
}
