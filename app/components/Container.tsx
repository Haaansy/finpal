import "@/app/styles/app.css"
import React from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const Container = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaView className='h-screen bg-white'>
      {children}
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    </SafeAreaView>
  )
}

export default Container