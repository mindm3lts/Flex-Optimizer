import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import { RouteIcon } from './icons';

const StyledView = styled(View);
const StyledText = styled(Text);

const LiveClock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <StyledView className="text-center">
            <StyledText className="text-sm text-gray-400 font-mono">
                {formattedDate} | {formattedTime}
            </StyledText>
        </StyledView>
    );
};

export const Header = () => {
  return (
    <StyledView className="items-center justify-center">
      <StyledView className="bg-cyan-500 p-3 rounded-full mb-3 shadow-lg">
        <RouteIcon className="w-8 h-8 text-white" />
      </StyledView>
      <StyledText className="text-3xl font-bold text-white tracking-tight">
        Flex Route <StyledText className="text-cyan-400">Optimizer</StyledText>
      </StyledText>
      <StyledText className="text-gray-400 mt-1 mb-3">Upload your route screenshot to get started.</StyledText>
      <LiveClock />
    </StyledView>
  );
};
