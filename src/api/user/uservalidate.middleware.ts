import { Request, Response, NextFunction } from 'express'

import log from '@/logger/index.js'
import {
  TSigninWithUsername,
  validateNewUser,
  validateSigninWithUsername
} from '@/api/user/user.validator.js'

export const userRequestValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.body
  try {
    const isValid = await validateNewUser(user)
    log.info({ isValid }, 'User validation completed')
    if (isValid) {
      return next()
    }
  } catch (error) {
    next(error)
  }
}

// type SigninRequest

export const signinRequestValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.body as TSigninWithUsername // TSigninWithEmail |

  try {
    const isValid = await validateSigninWithUsername(user)

    if (isValid) {
      return next()
    }
  } catch (error) {
    next(error)
  }
}
