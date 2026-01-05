import { getInput, info, setFailed } from '@actions/core'
import { ensureBdyInstalled } from '@/api/bdy'
import { checkBuddyCredentials, publishPackage } from '@/publish'
import type { IInputs } from '@/types/inputs'
import { normalizeError } from '@/utils/error'

async function run(): Promise<void> {
  await ensureBdyInstalled()
  checkBuddyCredentials()

  const inputs: IInputs = {
    workspace: getInput('workspace', { required: true }),
    project: getInput('project', { required: true }),
    identifier: getInput('identifier', { required: true }),
    directory: getInput('directory', { required: true }),
  }

  await publishPackage(inputs)

  info('Package published successfully')
}

run()
  .then(() => {
    process.exit(0)
  })
  .catch((error: unknown) => {
    setFailed(normalizeError(error))
    process.exit(1)
  })
