import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { searchNaver } from '../src/lib/crawl/naver'

async function run() {
  const results = await searchNaver('윤선국밥 용산', 1, 1)
  console.log(JSON.stringify(results[0], null, 2))
}
run()
