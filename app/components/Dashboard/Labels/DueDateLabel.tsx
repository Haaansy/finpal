import React from 'react'
import { Text, View } from 'react-native'

const DueDateLabel = () => {
  return (
    <View className='px-4 py-3 border-red-300 border-2 rounded-lg w-full mt-2 justify-between flex-row items-center'>
      <Text className='text-md' style={{ fontFamily: "Roboto-Bold" }}>Housing Loan</Text>
      <Text className='text-md' style={{ fontFamily: "Roboto-Bold" }}>P 12,000 due today</Text>
    </View>
  )
}

export default DueDateLabel