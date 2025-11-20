import mongoose from 'mongoose'
import log from '@/logger/index.js'
import User from '@/api/user/user.model.js'

async function connect() {
  log.info('Connecting to DB')
  const dbUri = process.env.DB_URI as string

  return mongoose
    .connect(dbUri, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      dbName: 'lsvrg-vault'
    })
    .then(async () => {
      log.info('Database connected')

      // Safe way to apply indexes (recommended)
      await User.ensureIndexes()

      // OR: Force drop & rebuild indexes (use with caution)
      // await User.syncIndexes();
    })
    .catch((error: Error) => {
      log.error(error, 'DB connection error')
      process.exit(1)
    })
}

export default connect
