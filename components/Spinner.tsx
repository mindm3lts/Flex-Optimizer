import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

export const Spinner = () => {
  return (
    <StyledView className="flex-col items-center justify-center my-8">
      <ActivityIndicator size="large" color="#22d3ee" />
      <StyledText className="mt-4 text-cyan-300 font-semibold tracking-wider">ANALYZING SCREENSHOTS...</StyledText>
    </StyledView>
  );
};
