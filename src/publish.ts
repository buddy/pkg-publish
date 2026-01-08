import { exportVariable, info, setOutput, setSecret } from '@actions/core'
import { type IInputs, REGION } from '@/types/inputs'
import type { IOutputs } from '@/types/outputs'
import { executeCommand } from '@/utils/command'

function validateRegion(region: string): string {
  const validRegions: string[] = Object.values(REGION)
  const normalized = region.toUpperCase()

  if (!validRegions.includes(normalized)) {
    throw new Error(`Invalid region: "${region}". Must be one of: ${validRegions.join(', ')}`)
  }

  return normalized
}

export function checkBuddyCredentials(): void {
  const token = process.env.BUDDY_TOKEN
  const endpoint = process.env.BUDDY_API_ENDPOINT

  if (!token) {
    throw new Error(
      'BUDDY_TOKEN is not set. Please use the buddy/login@v1 action before publishing packages.',
    )
  }

  if (!endpoint) {
    throw new Error(
      'BUDDY_API_ENDPOINT is not set. Please use the buddy/login@v1 action before publishing packages.',
    )
  }

  setSecret(token)
  info('Buddy credentials found')
}

export async function publishPackage(inputs: IInputs): Promise<IOutputs> {
  info(`Publishing package: ${inputs.identifier} from ${inputs.directory}`)

  const args = [
    'package',
    'publish',
    inputs.identifier,
    inputs.directory,
    '--workspace',
    inputs.workspace,
    '--project',
    inputs.project,
  ]

  if (inputs.create) {
    args.push('--create')
    info('Will create package if it does not exist')
  }

  if (inputs.force) {
    args.push('--force')
    info('Will overwrite existing version if present')
  }

  if (inputs.region) {
    const normalized = validateRegion(inputs.region)
    info(`Overriding region to: ${normalized}`)
    args.push('--region', normalized)
  }

  if (inputs.api) {
    args.push('--api', inputs.api)
  }

  const output = await executeCommand(process.env.BDY_PATH || 'bdy', args)
  const urlMatch = output.match(/https?:\/\/\S+/)

  const outputs: IOutputs = {}

  if (urlMatch) {
    const packageUrl = urlMatch[0]
    outputs.packageUrl = packageUrl
    setOutput('package_url', packageUrl)
    exportVariable('BUDDY_PACKAGE_URL', packageUrl)
  }

  return outputs
}
