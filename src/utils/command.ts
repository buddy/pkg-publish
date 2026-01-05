import { exec } from '@actions/exec'

interface CommandOutput {
  stdout: string
  stderr: string
}

function createStreamListener(output: CommandOutput, stream: 'stdout' | 'stderr') {
  return (data: Buffer) => {
    const text = data.toString()
    output[stream] += text
    process[stream].write(text)
  }
}

export async function executeCommand(command: string, args: string[]): Promise<string> {
  const output: CommandOutput = { stdout: '', stderr: '' }

  const exitCode = await exec(command, args, {
    ignoreReturnCode: true,
    silent: true,
    listeners: {
      stdout: createStreamListener(output, 'stdout'),
      stderr: createStreamListener(output, 'stderr'),
    },
  })

  if (exitCode !== 0) {
    const errorMessage =
      output.stderr || `Command failed with exit code ${exitCode}: ${command} ${args.join(' ')}`
    throw new Error(errorMessage)
  }

  return output.stdout.trim()
}
