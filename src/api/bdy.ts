import { arch, platform } from 'node:os'
import { info } from '@actions/core'
import { exec } from '@actions/exec'

enum SUPPORTED_PLATFORM {
  LINUX = 'linux',
  DARWIN = 'darwin',
  WIN32 = 'win32',
}

enum SUPPORTED_ARCHITECTURE {
  X64 = 'x64',
  ARM64 = 'arm64',
}

interface PlatformInfo {
  platform: SUPPORTED_PLATFORM
  architecture: SUPPORTED_ARCHITECTURE
  downloadPrefix: string
  fileExtension: string
}

const BDY_ENV = 'prod'
const VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?/

async function fetchLatestVersion(env: string): Promise<string> {
  const url = `https://es.buddy.works/bdy/${env}/latest`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch latest version: ${response.status} ${response.statusText}`)
    }

    const version = await response.text()
    return version.trim()
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch latest version from ${url}: ${error.message}`)
    }
    throw new Error(`Failed to fetch latest version from ${url}`)
  }
}

function getPlatformInfo(): PlatformInfo {
  const PLATFORM_MAP = new Map<string, SUPPORTED_PLATFORM>([
    ['linux', SUPPORTED_PLATFORM.LINUX],
    ['darwin', SUPPORTED_PLATFORM.DARWIN],
    ['win32', SUPPORTED_PLATFORM.WIN32],
  ])

  const ARCH_MAP = new Map<string, SUPPORTED_ARCHITECTURE>([
    ['x64', SUPPORTED_ARCHITECTURE.X64],
    ['arm64', SUPPORTED_ARCHITECTURE.ARM64],
  ])

  const systemPlatform = platform()
  const systemArch = arch()

  const detectedPlatform = PLATFORM_MAP.get(systemPlatform)
  const detectedArch = ARCH_MAP.get(systemArch)

  if (!detectedPlatform) {
    throw new Error(
      `Unsupported platform: ${systemPlatform}. Only linux, darwin, and win32 are supported.`,
    )
  }

  if (!detectedArch) {
    throw new Error(`Unsupported architecture: ${systemArch}. Only x64 and arm64 are supported.`)
  }

  if (
    detectedPlatform === SUPPORTED_PLATFORM.DARWIN &&
    detectedArch === SUPPORTED_ARCHITECTURE.X64
  ) {
    throw new Error('macOS x64 is not supported. Only darwin-arm64 binaries are available.')
  }

  if (
    detectedPlatform === SUPPORTED_PLATFORM.WIN32 &&
    detectedArch === SUPPORTED_ARCHITECTURE.ARM64
  ) {
    throw new Error('Windows ARM64 is not supported. Only win-x64 binaries are available.')
  }

  const fileExtension = detectedPlatform === SUPPORTED_PLATFORM.WIN32 ? '.zip' : '.tar.gz'
  const platformName = detectedPlatform === SUPPORTED_PLATFORM.WIN32 ? 'win' : detectedPlatform
  const downloadPrefix = `${platformName}-${detectedArch}`

  return {
    platform: detectedPlatform,
    architecture: detectedArch,
    downloadPrefix,
    fileExtension,
  }
}

export async function isBdyInstalled(): Promise<boolean> {
  try {
    const bdyPath = process.env.BDY_PATH
    if (bdyPath) {
      const exitCode = await exec(bdyPath, ['version'], { silent: true })
      return exitCode === 0
    }

    const command = platform() === 'win32' ? 'where' : 'which'
    const exitCode = await exec(command, ['bdy'], { silent: true })
    return exitCode === 0
  } catch {
    return false
  }
}

export async function getBdyVersion(): Promise<string> {
  try {
    let output = ''
    await exec(process.env.BDY_PATH || 'bdy', ['version'], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString()
        },
      },
    })

    const lines = output.trim().split('\n')

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]?.trim()
      if (line && VERSION_REGEX.test(line)) {
        return line
      }
    }

    return output.trim()
  } catch {
    return 'unknown'
  }
}

async function installBdyCli(): Promise<void> {
  const platformInfo = getPlatformInfo()
  const version = await fetchLatestVersion(BDY_ENV)

  info(`Installing BDY CLI (${version}) for ${platformInfo.downloadPrefix}...`)

  const fileName = `bdy${platformInfo.fileExtension}`
  const url = `https://es.buddy.works/bdy/${BDY_ENV}/${version}/${platformInfo.downloadPrefix}${platformInfo.fileExtension}`

  if (platformInfo.platform === SUPPORTED_PLATFORM.DARWIN) {
    await exec('sudo', ['mkdir', '-p', '-m', '755', '/usr/local/bin'])
  }

  try {
    await exec('curl', ['-fL', url, '-o', fileName])
  } catch {
    throw new Error(`Failed to download BDY CLI. URL: ${url}`)
  }

  if (platformInfo.platform === SUPPORTED_PLATFORM.WIN32) {
    await exec('tar', ['-xf', fileName])
  } else {
    await exec('sudo', ['tar', '-zxf', fileName, '-C', '/usr/local/bin/'])
  }

  await exec('rm', [fileName])
}

export async function ensureBdyInstalled(): Promise<void> {
  const isInstalled = await isBdyInstalled()

  if (isInstalled) {
    const version = await getBdyVersion()
    info(`BDY CLI is already installed (version: ${version})`)
  } else {
    info('BDY CLI not found, installing...')
    await installBdyCli()
    const version = await getBdyVersion()
    info(`BDY CLI installed successfully (version: ${version})`)
  }
}
