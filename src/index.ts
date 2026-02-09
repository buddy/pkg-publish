import { getInput, setFailed, warning } from '@actions/core'
import { ensureBdyInstalled } from '@/api/bdy'
import { checkBuddyCredentials, publishPackage } from '@/publish'
import type { IInputs } from '@/types/inputs'
import { normalizeError } from '@/utils/error'

function parseBooleanInput(name: string): boolean {
  const value = getInput(name)

  if (!value) {
    return false
  }

  if (value !== 'true' && value !== 'false') {
    warning(
      `Invalid boolean value for '${name}': "${value}". Expected 'true' or 'false'. Treating as false.`,
    )
    return false
  }

  return value === 'true'
}

async function run(): Promise<void> {
  await ensureBdyInstalled()
  checkBuddyCredentials()

  const inputs: IInputs = {
    workspace: getInput('workspace', { required: true }),
    project: getInput('project', { required: true }),
    identifier: getInput('identifier', { required: true }),
    directory: getInput('directory', { required: true }),
    create: parseBooleanInput('create'),
    force: parseBooleanInput('force'),
    api: getInput('api') || undefined,
  }

  await publishPackage(inputs)
}

run()
  .then(() => {
    process.exit(0)
  })
  .catch((error: unknown) => {
    setFailed(normalizeError(error))
    process.exit(1)
  })
