import { themes } from '@/constants/themes'
import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from '@tamagui/core'

// you usually export this from a tamagui.config.ts file
const config = createTamagui({
  ...defaultConfig,
  themes
})

export default config

type Conf = typeof config

// make imports typed
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf { }
}