import omit from 'lodash/omit.js'
import { AuthError } from '@/errors/api.error.js'
import User from './user.model.js'
import Profile from '@api/profile/profile.model.js'
import {
  TSigninUserWithEmail,
  TSigninUserWithUsername,
  IUserDocument
} from '@/types/user.js'
import { DbError } from '@/errors/db.error.js'
import { MongoServerError } from 'mongodb'

// Create a new User and their profile
export async function createUser(user: IUserDocument) {
  let newUser: IUserDocument | null = null

  try {
    // Create the user first
    newUser = await User.create(user)

    // Create a default profile for the new user
    const defaultProfile = {
      _id: newUser._id,
      bio: `Hello! I'm ${newUser.firstname} ${newUser.lastname}. Welcome to my profile!`,
      links: []
    }

    // Create the profile document
    await Profile.create(defaultProfile)

    return newUser
  } catch (error) {
    // If profile creation fails and user was created, clean up the user
    if (newUser && newUser._id) {
      try {
        await User.findByIdAndDelete(newUser._id)
      } catch (cleanupError) {
        console.error(
          'Failed to cleanup user after profile creation failure:',
          cleanupError
        )
        throw new DbError(cleanupError as MongoServerError)
      }
    }
    throw new DbError(error as MongoServerError)
  }
}

// find the user by email / username
// TSigninUserWithEmail | TSigninUserWithUsername
export async function findUser({
  username,
  password
}: TSigninUserWithUsername) {
  try {
    const hasUser = await User.findOne({ username })

    if (!hasUser) {
      throw new AuthError('Username does not exits.', 400)
    }

    const isValid = await hasUser.comparePassword(password)

    if (!isValid) {
      throw new AuthError('Incorrect password.', 400)
    }

    const id = hasUser.id
    const user = hasUser.toJSON()
    const filtered = omit(
      user,
      'password',
      '__v',
      'createdAt',
      'updatedAt',
      '_id'
    ) // => username, email, firstname, lastname
    return { id, ...filtered }
    //
  } catch (error) {
    throw error
  }
}

// Get user by username
export async function getUserByUsername(
  username: string
): Promise<IUserDocument> {
  try {
    const user = await User.findOne({ username })

    if (!user) {
      throw new AuthError('User not found', 404)
    }

    return user
  } catch (error) {
    throw error
  }
}

// Get user by ID
export async function getUserById(
  userId: string
): Promise<IUserDocument | null> {
  try {
    const user = await User.findById(userId)
    return user
  } catch (error) {
    throw error
  }
}
