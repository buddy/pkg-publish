export enum REGION {
  EU = 'EU',
  US = 'US',
  AP = 'AP',
}

export interface IInputs {
  workspace: string
  project: string
  identifier: string
  directory: string
  create?: boolean
  force?: boolean
  region?: string
  api?: string
}
